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

const publishToQueue = async (channel, message) => {
    try {
        await channel.sendToQueue(process.env.QUEUE_NAME, Buffer.from(message), { persistent: true });
        console.log('Message published to queue:', message);
    } catch (error) {
        console.error('Error publishing message to queue:', error);
    }
};

module.exports = { connectQueue, publishToQueue };