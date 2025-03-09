const axios = require('axios');
const pool = require('../config/database');
require('dotenv').config();

const getAccessToken = async () => {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: { Authorization: `Basic ${auth}` },
    });
    return response.data.access_token;
};

const sendSTKPush = async (phoneNumber, amount) => {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const password = Buffer.from(`${process.env.BUSINESS_SHORTCODE}${process.env.PASSKEY}${timestamp}`).toString('base64');

    const payload = {
        BusinessShortCode: process.env.BUSINESS_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.BUSINESS_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: 'Payment',
        TransactionDesc: 'Bulk STK Push Payment',
    };

    const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
};

const processPayment = async (req, res) => {
    const { phoneNumber, amount } = req.body;

    try {
        const response = await sendSTKPush(phoneNumber, amount);

        // Save transaction to database
        await pool.query(
            'INSERT INTO transactions (phone_number, amount, checkout_request_id, status) VALUES (?, ?, ?, ?)',
            [phoneNumber, amount, response.CheckoutRequestID, 'PENDING']
        );

        res.status(200).json({ message: 'STK Push initiated', data: response });
    } catch (error) {
        console.error('STK Push Error:', error);
        res.status(500).json({ error: 'STK Push initiation failed' });
    }
};

module.exports = { processPayment };