const { pool } = require('../config/database');

const handleWebhook = async (req, res) => {
    const { Body } = req.body;
    const { stkCallback } = Body;

    if (stkCallback) {
        const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;
        const status = ResultCode === 0 ? 'SUCCESS' : 'FAILED';

        try {
            await pool.query(
                'UPDATE transactions SET status = ?, result_desc = ? WHERE checkout_request_id = ?',
                [status, ResultDesc, CheckoutRequestID]
            );
            res.status(200).json({ message: 'Webhook received successfully' });
        } catch (error) {
            console.error('Error handling webhook:', error);
            res.status(500).json({ error: 'Error handling webhook' });
        }
    } else {
        res.status(400).json({ error: 'Invalid webhook payload' });
    }
};

module.exports = { handleWebhook };
