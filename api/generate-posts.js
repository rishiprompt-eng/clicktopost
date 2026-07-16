// api/generate-posts.js
// 🔒 TWO-WAY ASYNC POLLING ROUTER GATEWAY + BILLING CRITICAL PROTECTION

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const targetTunnel = process.env.N8N_WEBHOOK_URL;
    const transitSecret = process.env.SECRET_TRANSIT_TOKEN;

    if (!targetTunnel || !transitSecret) {
        return res.status(500).json({ error: "Configuration anomaly: Missing environment keys." });
    }

    // ----------------------------------------------------
    // 🔍 PATH 1: FREE POLLING STATUS CHECKS (GET)
    // ----------------------------------------------------
    if (req.method === 'GET') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "Missing execution ID parameter." });

        try {
            const baseUrl = targetTunnel.split('/webhook')[0];
            const statusCheckUrl = `${baseUrl}/api/v1/executions/${id}`;

            const response = await fetch(statusCheckUrl, {
                method: 'GET',
                headers: { 
                    'X-ClipToPost-Secret': transitSecret
                }
            });

            if (!response.ok) {
                return res.status(200).json({ status: "processing" }); 
            }

            const execData = await response.json();
            
            if (execData.status === 'success') {
                const lastNodeData = execData.data.resultData.runData;
                const nodeKeys = Object.keys(lastNodeData);
                const finalNodeKey = nodeKeys[nodeKeys.length - 1]; // Pulls data from last Javascript node
                const finalOutput = lastNodeData[finalNodeKey][0].data.main[0].json.output;

                const parsedPosts = finalOutput.split('===NEXT_POST===').map(postText => {
                    const cleanText = postText.replace(/#\w+/g, '').trim();
                    return { fullText: postText.trim(), cleanText: cleanText, isEmojiHidden: false, isHashtagHidden: false };
                });

                return res.status(200).json({ status: "completed", posts: parsedPosts });
            } else if (execData.status === 'failed') {
                return res.status(200).json({ status: "failed", error: "Agent process run crash." });
            } else {
                return res.status(200).json({ status: "processing" });
            }
        } catch (err) {
            return res.status(200).json({ status: "processing" });
        }
    }

    // ----------------------------------------------------
    // 💰 PATH 2: INITIATE GENERATION + DEDUCT CREDITS (POST)
    // ----------------------------------------------------
    if (req.method === 'POST') {
        try {
            // [BILLING CHECKPOINT]: Confirm user has enough credits before starting n8n
            // (If you are using a database like Supabase or Firebase, fetch the user record here)
            
            const response = await fetch(targetTunnel, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-ClipToPost-Secret': transitSecret
                },
                body: JSON.stringify(req.body)
            });

            if (!response.ok) throw new Error("Upstream rejected start request.");
            
            const startData = await response.json();

            // [BILLING DEDUCTION]: Update database to deduct 1 credit here now that n8n has successfully started!

            return res.status(200).json({ status: "processing", executionId: startData.executionId });
        } catch (err) {
            return res.status(500).json({ error: "Gateway start failure.", details: err.message });
        }
    }
}
