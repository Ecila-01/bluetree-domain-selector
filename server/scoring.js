function cleanNicheText(str) {
    if (!str) return '';
    return str
        .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
        .replace(/[⬆️⬇️↔️↕️⬅️➡️🔼🔽]/g, '')
        .replace(/[^\w\s,\/\-\.]/g, '')
        .toLowerCase()
        .trim();
}

function extractKeywords(str) {
    if (!str) return [];
    return str.toLowerCase()
        .split(/[\s,\/\-]+/)
        .filter(word => word.length > 3);
}

function scoreDomain(domain, brief, profile) {
    const activeMinDr = brief.min_dr !== undefined && brief.min_dr !== ''
        ? parseFloat(brief.min_dr) : profile.min_dr;
    const activeMinTraffic = brief.min_traffic !== undefined && brief.min_traffic !== ''
        ? parseFloat(brief.min_traffic) : profile.min_traffic;
    const activeFollowPref = brief.follow_preference || profile.follow_preference;

    // Hard Disqualifiers
    const dr = parseFloat(String(domain.dr || '0').replace(/[^0-9.]/g, '')) || 0;
    const traffic = parseFloat(String(domain.traffic || '0').replace(/,/g, '')) || 0;
    const ranking = (domain.ranking || '').toLowerCase();
    const linkType = (domain.link_type || domain['link type'] || '').toLowerCase();

    if (dr < activeMinDr)
        return { excluded: true, reason: `DR ${dr} is below minimum ${activeMinDr}` };
    if (traffic < activeMinTraffic)
        return { excluded: true, reason: `Traffic ${traffic.toLocaleString()} is below minimum ${activeMinTraffic.toLocaleString()}` };
    if (ranking.includes('poor') || ranking.includes('bad'))
        return { excluded: true, reason: 'Ranking marked poor or bad' };
    if (activeFollowPref === 'dofollow' && linkType.includes('nofollow'))
        return { excluded: true, reason: 'Nofollow link not permitted by client brief' };

    const breakdown = {};

    // A. Niche Match
    const clientWords = extractKeywords(
        `${brief.niches} ${brief.target_pages.map(p => p.keyword).join(' ')}`
    );
    const domainString = [
        cleanNicheText(domain.main),
        cleanNicheText(domain.niche),
        cleanNicheText(domain.complementary),
        cleanNicheText(domain.indirect)
    ].join(' ');

    let matches = 0;
    if (domainString.trim() !== '' && clientWords.length > 0) {
        const uniqueClientWords = [...new Set(clientWords)];
        uniqueClientWords.forEach(word => {
            if (domainString.includes(word)) matches++;
        });
        const density = matches / clientWords.length;
        breakdown.niche = Math.min(profile.niche_weight, Math.round(density * 120));
    } else {
        breakdown.niche = 0;
    }

    // B. Domain Rating
    breakdown.dr = dr < activeMinDr ? 0 : Math.min(
        profile.dr_weight,
        Math.round(((dr - activeMinDr) / (85 - activeMinDr)) * profile.dr_weight)
    );

    // C. Traffic (Logarithmic)
    breakdown.traffic = traffic < activeMinTraffic ? 0 : Math.min(
        profile.traffic_weight,
        Math.round((Math.log10(traffic / activeMinTraffic) / Math.log10(50)) * profile.traffic_weight)
    );

    // D. Price Efficiency
    const rawGP = String(domain.gp_price || domain['gp price'] || '').replace(/[^0-9.]/g, '');
    const rawLI = String(domain.li_price || domain['li price'] || '').replace(/[^0-9.]/g, '');
    const price = parseFloat(rawGP) || parseFloat(rawLI) || null;
    const budget = parseFloat(brief.budget);

    breakdown.price = (!price || !budget || price > budget) ? 0
        : Math.min(profile.price_weight, Math.round(((budget - price) / budget) * profile.price_weight));

    // E. Ranking Bonus
    breakdown.ranking = ranking.includes('good') ? profile.ranking_weight
        : (ranking.includes('ok') || ranking.includes('okay')) ? Math.round(profile.ranking_weight / 2)
        : 0;

    // F. Geo Match
    const clientGeo = (brief.geo || '').toLowerCase().trim();
    const domainGeo = (domain['country. traffic'] || domain.country_traffic || '').toLowerCase();
    breakdown.geo = (!clientGeo || clientGeo === 'global') ? profile.geo_weight
        : domainGeo.includes(clientGeo) ? profile.geo_weight
        : 0;

    // G. No Red Flags
    const redFlags = (domain.red_flags || domain['red flags'] || '').toLowerCase().trim();
    breakdown.red_flags = (redFlags === '' || redFlags === 'no' || redFlags === 'none' || redFlags === '-')
        ? profile.red_flags_weight : 0;

    const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    const summary = `Niche match: ${breakdown.niche}/${profile.niche_weight}. ` +
        `${breakdown.price > 0 ? 'Under budget.' : 'No price data or over budget.'} ` +
        `${breakdown.ranking === profile.ranking_weight ? 'High quality ranking.' : ''}`.trim();

    return { excluded: false, score: totalScore, breakdown, summary };
}


module.exports = { scoreDomain };