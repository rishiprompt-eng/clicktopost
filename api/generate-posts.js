// api/generate-posts.js
// 🔒 ALL SENSITIVE BINDING INFORMATION EXTRACTED TO ENCRYPTED VERCEL ECOSYSTEM APPARATUS

export default async function handler(req, res) {
    // Inject dynamic production-grade CORS access criteria headers
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

    // Pull encrypted parameters straight from the secure Vercel core environment
    const targetTunnel = process.env.N8N_WEBHOOK_URL;
    const transitSecret = process.env.SECRET_TRANSIT_TOKEN;

    if (!targetTunnel || !transitSecret) {
        return res.status(500).json({ error: "Configuration anomaly: Missing environment keys." });
    }

    try {
        const dateObj = new Date();
        const todayStamp = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`;
        const computedToken = `${transitSecret}_${todayStamp}`;

        const response = await fetch(targetTunnel, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-ClipToPost-Secret': computedToken
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`Upstream engine returned a faulty tracking code structure: ${response.status}`);
        }
        
        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        console.error("Serverless Pipeline Error:", err.message);
        return res.status(500).json({ error: "Internal Secure Pipeline Serverless Fault.", details: err.message });
    }
}
