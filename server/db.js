const Database = require('better-sqlite3');
const path = require('path');



const db = new Database(path.join(__dirname, 'bluetree.db'));
db.pragma('journal_mode = WAL');

function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS scoring_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            min_dr INTEGER DEFAULT 45,
            min_traffic INTEGER DEFAULT 2000,
            follow_preference TEXT DEFAULT 'dofollow',
            shortlist_size INTEGER DEFAULT 50,
            niche_weight INTEGER DEFAULT 40,
            dr_weight INTEGER DEFAULT 15,
            traffic_weight INTEGER DEFAULT 15,
            price_weight INTEGER DEFAULT 10,
            ranking_weight INTEGER DEFAULT 10,
            geo_weight INTEGER DEFAULT 5,
            red_flags_weight INTEGER DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            client_name TEXT NOT NULL,
            profile_id INTEGER,
            brief_json TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(profile_id) REFERENCES scoring_profiles(id)
        );
        
        CREATE TABLE IF NOT EXISTS campaign_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id TEXT,
            domain TEXT,
            total_score REAL,
            dimension_breakdown_json TEXT,
            reasoning_summary TEXT,
            is_excluded BOOLEAN DEFAULT 0,
            exclusion_reason TEXT,
            raw_domain_data_json TEXT,
            FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
        );

        CREATE TABLE IF NOT EXISTS config_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_json TEXT NOT NULL,
            label TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Seed default profiles if they don't exist
    const count = db.prepare('SELECT COUNT(*) as count FROM scoring_profiles').get().count;
    if (count === 0) {
        const insert = db.prepare(`
            INSERT INTO scoring_profiles (name, min_dr, min_traffic, follow_preference, shortlist_size, niche_weight, dr_weight, traffic_weight, price_weight, ranking_weight, geo_weight, red_flags_weight)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        // Standard & SaaS (Standard weights)
        insert.run('Standard', 45, 2000, 'dofollow', 50, 40, 15, 15, 10, 10, 5, 5);
        insert.run('SaaS', 45, 2000, 'dofollow', 50, 40, 15, 15, 10, 10, 5, 5);
        // Ecommerce (Adjusted weights: niche 50, dr 10, traffic 10)
        insert.run('Ecommerce', 45, 2000, 'dofollow', 50, 50, 10, 10, 10, 10, 5, 5);
        insert.run('Fintech', 45, 2000, 'dofollow', 50, 35, 15, 15, 10, 10, 5, 10);
        insert.run('Local',   45, 2000, 'dofollow', 50, 40, 15, 5,  10, 10, 15, 5);
        console.log("Database seeded with default profiles.");
    }
}

initDB();
module.exports = db;