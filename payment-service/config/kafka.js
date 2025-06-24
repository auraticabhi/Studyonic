const { Kafka, logLevel } = require('kafkajs');
require('dotenv').config();

// const kafka = new Kafka({
//   clientId: 'payment-service',
//   brokers: [process.env.KAFKA_BROKERS],
// });

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

const producer = kafka.producer();

const connectProducer = async () => {
  await producer.connect();
  console.log('Kafka Producer connected');
};

const disconnectProducer = async () => {
    await producer.disconnect();
    console.log('Kafka Producer disconnected');
}

const sendMessage = async (topic, message) => {
    return producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }]
    });
}

module.exports = { connectProducer, disconnectProducer, sendMessage };