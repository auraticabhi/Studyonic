const { Kafka, logLevel } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
    logLevel: logLevel.INFO,
    brokers: [process.env.KAFKA_BOOTSTRAP_SERVER],
    ssl: true,
    sasl: {
        mechanism: 'plain',
        username: process.env.KAFKA_API_KEY,
        password: process.env.KAFKA_API_SECRET
    },
});

const consumer = kafka.consumer({ groupId: 'course-service-group' });

// This function will connect AND subscribe to topics
const initializeKafkaConsumer = async () => {
    try {
        await consumer.connect();
        console.log('Kafka Consumer connected');

        // Subscribe to topics *after* connecting
        await consumer.subscribe({ topic: 'user.deleted', fromBeginning: true });
        await consumer.subscribe({ topic: 'payment.completed', fromBeginning: true });
        //await consumer.subscribe({ topic: 'user.deleted', fromBeginning: true });
        console.log('Kafka Consumer subscribed to topics: user.deleted, payment.completed');

        // Return the consumer instance so it can be used by runConsumer
        return consumer;

    } catch (error) {
        console.error('Error initializing Kafka consumer:', error);
        throw error; // Re-throw to propagate the error
    }
};

const disconnectConsumer = async () => {
    try {
        await consumer.disconnect();
        console.log('Kafka Consumer disconnected');
    } catch (error) {
        console.error('Error disconnecting Kafka consumer:', error);
    }
}

// This function starts the message processing loop
const runConsumer = async (messageHandler) => {
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const payload = JSON.parse(message.value.toString());
            messageHandler(topic, payload);
        }
    });
    console.log('Kafka Consumer is running and processing messages.');
};

module.exports = { initializeKafkaConsumer, disconnectConsumer, runConsumer };