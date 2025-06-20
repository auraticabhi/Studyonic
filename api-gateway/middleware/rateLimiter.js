const { redisClient } = require('../config/redis');

// 500 requests per 1 minute window
const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_WINDOW_REQUEST_COUNT = 500;

const rateLimiter = async (req, res, next) => {
    if (!redisClient.isOpen) {
        // If Redis is down, fail open (allow the request)
        return next();
    }

    try {
        const ip = req.ip; // Get the user's IP address
        const key = `rate-limit:${ip}`;

        // Get the current number of requests for this IP
        const currentRequests = await redisClient.get(key);

        if (currentRequests && parseInt(currentRequests, 10) > MAX_WINDOW_REQUEST_COUNT) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later.',
            });
        }
        
        // If it's the first request in the window, set the key with an expiration
        if (currentRequests === null) {
            await redisClient.set(key, 1, {
                EX: WINDOW_SIZE_IN_SECONDS,
            });
        } else {
            // Otherwise, just increment the count
            await redisClient.incr(key);
        }

        next();

    } catch (error) {
        console.error('Error in rate limiter middleware:', error);
        // If the limiter fails, let the request through (fail open)
        next();
    }
};

module.exports = rateLimiter;