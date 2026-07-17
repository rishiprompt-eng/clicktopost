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
    const n8nApiKey = process.env.N8N_API_KEY; 

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
            // 🎯 FIXED: Clean trailing slashes perfectly so no double-slashes loop happens
            const baseUrl = targetTunnel.split('/webhook')[0].replace(/\/$/, "");
            const statusCheckUrl = `${baseUrl}/api/v1/executions/${id}?includeData=true`;

            const headers = { 
                'X-ClipToPost-Secret': transitSecret
            };
            
            if (n8nApiKey) {
                headers['X-N8N-API-KEY'] = n8nApiKey;
            }

            const response = await fetch(statusCheckUrl, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                console.error(`n8n API fetch failed with status: ${response.status}`);
                return res.status(200).json({ status: "processing", debugError: `API Status ${response.status}` }); 
            }

            const execData = await response.json();
            
            if (execData.status === 'success') {
                const runData = execData.data?.resultData?.runData || {};
                
                // 🎯 LOOK HERE: Match the exact name displayed under your final node
                const targetNodeName = "Code in JavaScript"; 
                const nodeOutputData = runData[targetNodeName];

                if (!nodeOutputData) {
                    console.warn(`Target node '${targetNodeName}' not found in execution data yet.`);
                    return res.status(200).json({ status: "processing" });
                }

                let finalOutput = "";

                try {
                    if (Array.isArray(nodeOutputData) && nodeOutputData[0]?.json?.output) {
                        finalOutput = nodeOutputData[0].json.output;
                    } else if (nodeOutputData?.data?.main?.[0]?.[0]?.json?.output) {
                        finalOutput = nodeOutputData.data.main[0][0].json.output;
                    } else if (nodeOutputData?.[0]?.data?.main?.[0]?.json?.output) {
                        finalOutput = nodeOutputData[0].data.main[0].json.output;
                    } else if (nodeOutputData?.output) {
                        finalOutput = nodeOutputData.output;
                    } else {
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
            console.error("GET runtime catch block error:", err);
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
