const express = require('express');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/paymentRoutes');
const { createTransactionTable } = require('./config/database');
const { connectQueue } = require('./config/rabbitmq');
const { sendSTKPush } = require('./controllers/paymentController');

dotenv.config();
const app = express();
app.use(express.json());

app.use('/api/v1/payments', paymentRoutes);

// Call the function to create the table
createTransactionTable();

const startConsumer = async () => {
    const channel = await connectQueue();
    channel.consume(process.env.QUEUE_NAME, async (msg) => {
        if (msg !== null) {
            const { phoneNumber, amount } = JSON.parse(msg.content.toString());
            try {
                const response = await sendSTKPush(phoneNumber, amount);
                await pool.query(
                    'INSERT INTO transactions (phone_number, amount, checkout_request_id, status) VALUES (?, ?, ?, ?)',
                    [phoneNumber, amount, response.CheckoutRequestID, 'PENDING']
                );
                channel.ack(msg);
            } catch (error) {
                console.error('Error processing message:', error);
                channel.nack(msg);
            }
        }
    });
};

startConsumer();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});