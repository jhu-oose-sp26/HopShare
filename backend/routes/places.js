const express = require('express');
const https = require('https');

const router = express.Router();

function serpApiGet(params) {
    const qs = new URLSearchParams(params).toString();
    const url = `https://serpapi.com/search.json?${qs}`;

    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

// GET /places/autocomplete?q=...
router.get('/autocomplete', async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
        return res.json({ suggestions: [] });
    }

    try {
        const { lat, lng } = req.query;
        const params = {
            engine: 'google_maps_autocomplete',
            q: q.trim(),
            api_key: process.env.SERP_API_KEY,
        };
        if (lat && lng) {
            params.ll = `@${lat},${lng},14z`;
        }

        const results = await serpApiGet(params);

        const suggestions = (results.suggestions || [])
            .filter((s) => s.type === 'place')
            .map((s) => ({
                label: s.value,
                subtext: s.subtext || '',
                latitude: s.latitude,
                longitude: s.longitude,
            }));

        res.json({ suggestions });
    } catch (err) {
        console.error('SerpAPI autocomplete error:', err.message);
        res.status(500).json({ error: 'Autocomplete request failed' });
    }
});

module.exports = router;
