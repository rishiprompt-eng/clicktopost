// ----------------------------------------------------
    // 🔍 PATH 1: STATUS CHECKS WITH COMPREHENSIVE DATA RETRIEVAL (GET)
    // ----------------------------------------------------
    if (req.method === 'GET') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "Missing execution ID." });

        try {
            // 🎯 SAFE & MODERN: Uses the new standard global URL object (No deprecation warnings!)
            const parsedWebhookUrl = new URL(targetTunnel);
            const statusCheckUrl = `${parsedWebhookUrl.protocol}//${parsedWebhookUrl.host}/api/v1/executions/${id}?includeData=true`;

            // 🎯 STANDARDIZED HEADERS: Pure JSON payload format headers
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            
            if (n8nApiKey) {
                headers['X-N8N-API-KEY'] = n8nApiKey;
            } else {
                headers['X-ClipToPost-Secret'] = transitSecret;
            }

            const response = await fetch(statusCheckUrl, {
                method: 'GET',
                headers: headers
            });
