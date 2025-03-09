const express = require('express');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const { createTransactionTable } = require('./config/database');
const { connectQueue } = require('./config/rabbitmq');
const { sendSTKPush } = require('./controllers/paymentController');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');

dotenv.config();
const app = express();
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1/payments', paymentRoutes);
app.use('/api/webhook', webhookRoutes);

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
                await sendEmailAlert('Critical Failure', `Error processing message: ${error.message}`);
                channel.nack(msg);
            }
        }
    });
};

startConsumer();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        process.exit(1);
    } else {
        throw err;
    }
});

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

app.post('/api/v1/payments/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path;
    const phoneNumbers = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            phoneNumbers.push(row.phoneNumber);
        })
        .on('end', async () => {
            try {
                const channel = await connectQueue();
                for (const phoneNumber of phoneNumbers) {
                    const message = JSON.stringify({ phoneNumber, amount: 1 }); // Assuming amount is 1 for simplicity
                    await publishToQueue(channel, message);
                }
                res.status(200).json({ message: 'File uploaded and STK Push requests queued successfully' });
            } catch (error) {
                console.error('Error processing file:', error);
                res.status(500).json({ error: 'Error processing file' });
            }
        });
});

app.get('/api/v1/payments/report', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Error fetching report' });
    }
});

app.get('/api/v1/payments/statistics', async (req, res) => {
    try {
        const [totalTransactions] = await pool.query('SELECT COUNT(*) AS total FROM transactions');
        const [successfulTransactions] = await pool.query('SELECT COUNT(*) AS successful FROM transactions WHERE status = "SUCCESS"');
        const [failedTransactions] = await pool.query('SELECT COUNT(*) AS failed FROM transactions WHERE status = "FAILED"');

        res.status(200).json({
            total: totalTransactions[0].total,
            successful: successfulTransactions[0].successful,
            failed: failedTransactions[0].failed
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
});

// Email alert function
const sendEmailAlert = async (subject, message) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: subject,
        text: message
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email alert sent successfully.');
    } catch (error) {
        console.error('Error sending email alert:', error);
    }
};