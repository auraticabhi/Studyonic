const redis = require('redis');
require('dotenv').config();

// Create a single client instance
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis
const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('Connected to Redis successfully!');
    }
};

module.exports = { redisClient, connectRedis };