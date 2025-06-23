const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKERS],
});

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

const connectConsumer = async () => {
  await consumer.connect();
  console.log('Kafka Consumer connected');

await consumer.subscribe({ topic: 'user.password.changed', fromBeginning: true });
  await consumer.subscribe({ topic: 'payment.completed', fromBeginning: true });
  await consumer.subscribe({ topic: 'user.registered', fromBeginning: true });
  await consumer.subscribe({ topic: 'password.reset.request', fromBeginning: true });
};

const disconnectConsumer = async () => {
    await consumer.disconnect();
    console.log('Kafka Consumer disconnected');
}

const runConsumer = async (messageHandler) => {
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const payload = JSON.parse(message.value.toString());
            messageHandler(topic, payload);
        }
    });
};

module.exports = { connectConsumer, disconnectConsumer, runConsumer };