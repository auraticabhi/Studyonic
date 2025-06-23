const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: [process.env.KAFKA_BROKERS],
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