const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'user-service-group' });

// Producer Functions
const initializeProducer = async () => {
    try {
        await producer.connect();
        console.log('Kafka Producer connected');
    } catch (error) {
        console.error('Error connecting Kafka Producer:', error);
        throw error; // Re-throw to handle in server.js
    }
};

const disconnectProducer = async () => {
    try {
        await producer.disconnect();
        console.log('Kafka Producer disconnected');
    } catch (error) {
        console.error('Error disconnecting Kafka Producer:', error);
    }
};

const sendMessage = async (topic, message) => {
    try {
        await producer.send({
            topic: topic,
            messages: [{ value: JSON.stringify(message) }],
        });
        console.log(`Message sent to topic ${topic}:`, message);
    } catch (error) {
        console.error(`Error sending message to topic ${topic}:`, error);
        // to implement retry logic here for transient errors
    }
};

// Consumer Functions
const initializeConsumer = async () => {
    try {
        await consumer.connect();
        console.log('Kafka Consumer connected');
        // Add topics to subscribe to
        await consumer.subscribe({ topic: 'payment.completed', fromBeginning: true });
        console.log('Kafka Consumer subscribed to topic: payment.completed');

        await consumer.subscribe({ topic: 'course.deleted', fromBeginning: true });
        console.log('Kafka Consumer subscribed to topic: course.deleted');
        return consumer; // Return the consumer instance
    } catch (error) {
        console.error('Error initializing Kafka consumer:', error);
        throw error; // Re-throw to handle in server.js
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

const runConsumer = async (messageHandler) => {
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const payload = JSON.parse(message.value.toString());
            messageHandler(topic, payload);
        }
    });
    console.log('Kafka Consumer is running and processing messages.');
};

module.exports = {
    initializeProducer,
    disconnectProducer,
    sendMessage,
    initializeConsumer,
    disconnectConsumer,
    runConsumer
};