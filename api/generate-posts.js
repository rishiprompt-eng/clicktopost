// api/generate-posts.js
// 🔒 PRODUCTION-GRADE DEEP NESTED OBJECT PARSER PIPELINE WITH DATA RETRIEVAL

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
    // 🔍 PATH 1: STATUS CHECKS WITH COMPREHENSIVE DATA RETRIEVAL (GET)
    // ----------------------------------------------------
    if (req.method === 'GET') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "Missing execution ID." });

        try {
            const baseUrl = targetTunnel.split('/webhook')[0];
            // 🎯 CRITICAL FIX: Append '?includeData=true' so n8n returns node-level output blocks!
            const statusCheckUrl = `${baseUrl}/api/v1/executions/${id}?includeData=true`;

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
                const runData = execData.data?.resultData?.runData || {};
                const nodeKeys = Object.keys(runData);
                
                if (nodeKeys.length === 0) {
                    return res.status(200).json({ status: "processing" });
                }

                // Get the final node execution block in the workflow chain
                const finalNodeKey = nodeKeys[nodeKeys.length - 1]; 
                const nodeOutputData = runData[finalNodeKey];

                let finalOutput = "";

                try {
                    // Safe-navigation checks to extract n8n node-level outputs
                    if (Array.isArray(nodeOutputData) && nodeOutputData[0]?.json?.output) {
                        finalOutput = nodeOutputData[0].json.output;
                    } else if (nodeOutputData?.data?.main?.[0]?.[0]?.json?.output) {
                        finalOutput = nodeOutputData.data.main[0][0].json.output;
                    } else if (nodeOutputData?.[0]?.data?.main?.[0]?.json?.output) {
                        finalOutput = nodeOutputData[0].data.main[0].json.output;
                    } else if (nodeOutputData?.output) {
                        finalOutput = nodeOutputData.output;
                    } else {
                        // Regular expression extraction fallback
                        const stringifiedDump = JSON.stringify(nodeOutputData);
                        const match = stringifiedDump.match(/"output"\s*:\s*"([\s\S]*?)"(?=,|\})/);
                        if (match && match[1]) {
                            finalOutput = JSON.parse(`"${match[1]}"`);
                        }
                    }
                } catch (parseError) {
                    console.error("Deep output navigation error:", parseError);
                }

                if (!finalOutput || typeof finalOutput !== 'string') {
                    return res.status(200).json({ status: "processing", message: "String serialization in progress." });
                }

                // Split text across post split boundaries cleanly
                const parsedPosts = finalOutput.split('===NEXT_POST===').map(postText => {
                    const cleanText = postText.replace(/#\w+/g, '').trim();
                    return { 
                        fullText: postText.trim(), 
                        cleanText: cleanText, 
                        isEmojiHidden: false, 
                        isHashtagHidden: false 
                    };
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
    // 🚀 PATH 2: PIPELINE LAUNCH MANAGER (POST)
    // ----------------------------------------------------
    if (req.method === 'POST') {
        try {
            const response = await fetch(targetTunnel, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-ClipToPost-Secret': transitSecret
                },
                body: JSON.stringify(req.body)
            });

            const responseText = await response.text();
            let responseData;

            try {
                responseData = JSON.parse(responseText);
            } catch (jsonErr) {
                console.warn("n8n responded with non-JSON text payload:", responseText);
                return res.status(500).json({ 
                    error: "n8n Webhook node is not set up to return JSON. Check 'Respond to Webhook' configuration.",
                    rawResponse: responseText 
                });
            }

            if (!response.ok) {
                throw new Error(`Upstream returned error status: ${response.status}`);
            }
            
            const executionId = responseData.executionId || responseData.id;
            if (!executionId) {
                return res.status(500).json({ 
                    error: "n8n did not return an execution ID. Ensure your Webhook response settings match.",
                    receivedData: responseData 
                });
            }

            return res.status(200).json({ status: "processing", executionId: executionId });
        } catch (err) {
            console.error("Gateway POST error execution block:", err.message);
            return res.status(500).json({ error: "Gateway start failure.", details: err.message });
        }
    }
}
