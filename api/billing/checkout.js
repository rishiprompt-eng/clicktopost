// api/billing/checkout.js
// 🔒 RAZORPAY BILLING POINTER ENDPOINTS HIDDEN COMPLETELY INSIDE SECURE ENVIRONMENT CAPACITORS

const SUBSCRIPTION_BLUEPRINTS = {
    solo: "https://rzp.io/rzp/ERdjInlT",
    agency: "https://rzp.io/rzp/kK3urmV"
};

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method non-permissible' });
    }

    const { tier } = req.body;
    const paymentCheckoutUrl = SUBSCRIPTION_BLUEPRINTS[tier];

    if (paymentCheckoutUrl) {
        return res.status(200).json({ redirectUrl: paymentCheckoutUrl });
    } else {
        return res.status(400).json({ error: "Invalid Billing Subscription Blueprint Parameter." });
    }
}
