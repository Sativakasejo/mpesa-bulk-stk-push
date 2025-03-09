const amqp = require('amqplib');
require('dotenv').config();

const connectQueue = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(process.env.QUEUE_NAME, { durable: true });
        return channel;
    } catch (error) {
        console.error('RabbitMQ Connection Error:', error);
    }
};

module.exports = connectQueue;