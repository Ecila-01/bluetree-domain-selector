const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Papa = require('papaparse');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { scoreDomain } = require('./scoring');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Logging Setup ---
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logFile = path.join(logsDir, 'app.log');

function logInfo(message) {
    const entry = `[${new Date().toISOString()}] INFO: ${message}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(entry.trim());
}

function logError(endpoint, error) {
    const entry = `[${new Date().toISOString()}] ERROR [${endpoint}]: ${error.message || error}\n`;
    fs.appendFileSync(logFile, entry);
    console.error(entry.trim());
}

// Multer setup: Store file in memory since we just need to parse it immediately
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// --- Health Check ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Domain Selector API running.' });
});

// --- Config Endpoints ---
app.get('/api/config/profiles', (req, res) => {
    try {
        const profiles = db.prepare('SELECT * FROM scoring_profiles').all();
        res.json(profiles);
    } catch (error) {
        logError('GET /api/config/profiles', error);
        res.status(500).json({ error: 'Failed to fetch config profiles' });
    }
});

app.put('/api/config/profiles/:id', (req, res) => {
    try {
        const { id } = req.params;
        const weights = req.body;

        // Save snapshot of all profiles before updating
        const allProfiles = db.prepare('SELECT * FROM scoring_profiles').all();
        db.prepare('INSERT INTO config_versions (snapshot_json, label) VALUES (?, ?)').run(
            JSON.stringify(allProfiles),
            `Before update of profile id=${id}`
        );

        db.prepare(`
            UPDATE scoring_profiles SET
                min_dr = ?, min_traffic = ?, follow_preference = ?,
                niche_weight = ?, dr_weight = ?, traffic_weight = ?,
                price_weight = ?, ranking_weight = ?, geo_weight = ?, red_flags_weight = ?
            WHERE id = ?
        `).run(
            weights.min_dr, weights.min_traffic, weights.follow_preference,
            weights.niche_weight, weights.dr_weight, weights.traffic_weight,
            weights.price_weight, weights.ranking_weight, weights.geo_weight, weights.red_flags_weight,
            id
        );

        logInfo(`Profile id=${id} updated`);
        res.json({ success: true });
    } catch (error) {
        logError('PUT /api/config/profiles/:id', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

app.get('/api/config/versions', (req, res) => {
    try {
        const versions = db.prepare('SELECT * FROM config_versions ORDER BY created_at DESC').all();
        res.json(versions);
    } catch (error) {
        logError('GET /api/config/versions', error);
        res.status(500).json({ error: 'Failed to fetch config versions' });
    }
});

app.post('/api/config/rollback/:versionId', (req, res) => {
    try {
        const { versionId } = req.params;
        const version = db.prepare('SELECT * FROM config_versions WHERE id = ?').get(versionId);
        if (!version) return res.status(404).json({ error: 'Version not found' });

        const profiles = JSON.parse(version.snapshot_json);

        // Snapshot current state before rollback
        const currentProfiles = db.prepare('SELECT * FROM scoring_profiles').all();
        db.prepare('INSERT INTO config_versions (snapshot_json, label) VALUES (?, ?)').run(
            JSON.stringify(currentProfiles),
            `Before rollback to version ${versionId}`
        );

        const updateStmt = db.prepare(`
            UPDATE scoring_profiles SET
                min_dr = ?, min_traffic = ?, follow_preference = ?,
                niche_weight = ?, dr_weight = ?, traffic_weight = ?,
                price_weight = ?, ranking_weight = ?, geo_weight = ?, red_flags_weight = ?
            WHERE id = ?
        `);

        const doRollback = db.transaction(() => {
            profiles.forEach(p => {
                updateStmt.run(
                    p.min_dr, p.min_traffic, p.follow_preference,
                    p.niche_weight, p.dr_weight, p.traffic_weight,
                    p.price_weight, p.ranking_weight, p.geo_weight, p.red_flags_weight,
                    p.id
                );
            });
        });
        doRollback();

        logInfo(`Config rolled back to version ${versionId}`);
        res.json({ success: true });
    } catch (error) {
        logError('POST /api/config/rollback/:versionId', error);
        res.status(500).json({ error: 'Failed to rollback config' });
    }
});

// --- Campaign List ---
app.get('/api/campaigns', (req, res) => {
    try {
        const campaigns = db.prepare(`
            SELECT c.id, c.client_name, c.brief_json, c.created_at,
                   COUNT(CASE WHEN cr.is_excluded = 0 THEN 1 END) as qualified_count,
                   COUNT(cr.id) as total_count
            FROM campaigns c
            LEFT JOIN campaign_results cr ON c.id = cr.campaign_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `).all();

        res.json(campaigns.map(c => ({
            ...c,
            brief: JSON.parse(c.brief_json)
        })));
    } catch (error) {
        logError('GET /api/campaigns', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

// --- Campaign Processing ---
const REQUIRED_COLUMNS = [
    'domain', 'dr', 'traffic', 'niche', 'main', 'complementary',
    'indirect', 'gp price', 'li price', 'link type', 'ranking', 'red flags', 'contact'
];

app.post('/api/campaigns', upload.single('inventory'), (req, res) => {
    const startTime = Date.now();
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No inventory CSV uploaded.' });
        }
        if (!req.body.brief) {
            return res.status(400).json({ error: 'Client brief is missing.' });
        }

        const brief = JSON.parse(req.body.brief);

        // Fetch the requested profile config from the DB
        const profile = db.prepare('SELECT * FROM scoring_profiles WHERE name = ?').get(brief.profile || 'Standard');
        if (!profile) {
            return res.status(400).json({ error: 'Profile not found' });
        }

        // Parse CSV Buffer
        let csvData = req.file.buffer.toString('utf8');

        // Skip metadata rows at the top — find the real header row starting with "domain,"
        const lines = csvData.split(/\r?\n/);
        let headerIndex = 0;
        for (let i = 0; i < Math.min(15, lines.length); i++) {
            if (lines[i].toLowerCase().trim().startsWith('domain,')) {
                headerIndex = i;
                break;
            }
        }
        csvData = lines.slice(headerIndex).join('\n');

        const parsed = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: h => h.trim().toLowerCase()
        });

        const fatalErrors = parsed.errors.filter(e => e.type === 'Delimiter' || e.type === 'Quotes' || e.type === 'MissingQuotes');
        if (fatalErrors.length > 0) {
            return res.status(400).json({
                error: `CSV file appears malformed: ${fatalErrors[0].message}. Please check the file and try again.`
            });
        }
        if (parsed.errors.length > 0) {
            console.warn("CSV Parsing warnings:", parsed.errors);
        }

        // Validate required columns
        const actualFields = parsed.meta.fields || [];
        const missingCols = REQUIRED_COLUMNS.filter(col => !actualFields.includes(col));
        if (missingCols.length > 0) {
            return res.status(400).json({ error: `Missing required columns: ${missingCols.join(', ')}` });
        }

        const domains = parsed.data;

        if (domains.length === 0) {
            return res.status(400).json({ error: 'CSV file appears empty or could not be parsed' });
        }

        const campaignId = crypto.randomBytes(16).toString('hex');

        const runTransaction = db.transaction(() => {
            db.prepare(`
                INSERT INTO campaigns (id, client_name, profile_id, brief_json)
                VALUES (?, ?, ?, ?)
            `).run(campaignId, brief.client_name, profile.id, JSON.stringify(brief));

            const insertResult = db.prepare(`
                INSERT INTO campaign_results
                (campaign_id, domain, total_score, dimension_breakdown_json, reasoning_summary, is_excluded, exclusion_reason, raw_domain_data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const results = [];
            domains.forEach(domainData => {
                const normalized = {
                    ...domainData,
                    gp_price: domainData['gp price'],
                    li_price: domainData['li price'],
                    link_type: domainData['link type'],
                    red_flags: domainData['red flags'],
                    country_traffic: domainData['country. traffic'],
                };
                const domainName = normalized.domain || 'unknown';
                const result = scoreDomain(normalized, brief, profile);
                results.push({ domainName, result, normalized });
            });

            // Deduplicate: keep highest score per domain
            const seen = new Map();
            results.forEach(({ domainName, result, normalized }) => {
                const score = result.excluded ? -1 : result.score;
                if (!seen.has(domainName) || score > seen.get(domainName).score) {
                    seen.set(domainName, { domainName, result, normalized, score });
                }
            });

            seen.forEach(({ domainName, result, normalized }) => {
                if (result.excluded) {
                    insertResult.run(campaignId, domainName, 0, null, null, 1, result.reason, JSON.stringify(normalized));
                } else {
                    insertResult.run(campaignId, domainName, result.score, JSON.stringify(result.breakdown), result.summary, 0, null, JSON.stringify(normalized));
                }
            });
        });

        runTransaction();

        const elapsed = Date.now() - startTime;
        logInfo(`Campaign run: id=${campaignId} client="${brief.client_name}" domains=${domains.length} time=${elapsed}ms`);

        res.json({ success: true, campaignId, message: `Processed ${domains.length} domains.` });

    } catch (error) {
        logError('POST /api/campaigns', error);
        res.status(500).json({ error: 'Failed to process campaign.' });
    }
});

// --- Fetch Campaign Results ---
app.get('/api/campaigns/:id/results', (req, res) => {
    try {
        const campaignId = req.params.id;

        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        // Returns ALL qualified domains — no LIMIT
        const qualified = db.prepare(`
            SELECT * FROM campaign_results
            WHERE campaign_id = ? AND is_excluded = 0
            ORDER BY total_score DESC
        `).all(campaignId);

        const excluded = db.prepare(`
            SELECT domain, exclusion_reason FROM campaign_results
            WHERE campaign_id = ? AND is_excluded = 1
        `).all(campaignId);

        res.json({
            campaign: {
                ...campaign,
                brief: JSON.parse(campaign.brief_json)
            },
            qualified: qualified.map(r => ({
                ...r,
                breakdown: JSON.parse(r.dimension_breakdown_json),
                raw_data: JSON.parse(r.raw_domain_data_json)
            })),
            excluded
        });

    } catch (error) {
        logError('GET /api/campaigns/:id/results', error);
        res.status(500).json({ error: 'Failed to fetch campaign results.' });
    }
});

// Keep-alive: ping self every 10 minutes to prevent Railway from sleeping
const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null;

if (BACKEND_URL) {
    setInterval(() => {
        const http = require('https');
        http.get(`${BACKEND_URL}/api/health`, (res) => {
            console.log(`Keep-alive ping: ${res.statusCode}`);
        }).on('error', (err) => {
            console.error('Keep-alive ping failed:', err.message);
        });
    }, 10 * 60 * 1000);
}

app.listen(PORT, () => {
    logInfo(`Server listening on port ${PORT}`);
});
