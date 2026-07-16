// api/generate-posts.js
// 🔒 ENCRYPTED APPARATUS ROUTER: STATIC CRYPTO VERIFICATION FIX

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method non-permissible' });
    }

    const targetTunnel = process.env.N8N_WEBHOOK_URL;
    const transitSecret = process.env.SECRET_TRANSIT_TOKEN;

    if (!targetTunnel || !transitSecret) {
        return res.status(500).json({ error: "Configuration anomaly: Missing environment keys." });
    }

    try {
        // Passes the raw, secure static token without day-rollover variations
        const response = await fetch(targetTunnel, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-ClipToPost-Secret': transitSecret
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`Upstream engine returned validation failure status: ${response.status}`);
        }
        
        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        console.error("Serverless Proxy Error:", err.message);
        return res.status(500).json({ error: "Gateway verification failed.", details: err.message });
    }
}
