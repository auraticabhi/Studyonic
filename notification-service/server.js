const express = require("express");
const cors = require("cors");
require('dotenv').config();

const { connectConsumer, runConsumer } = require('./config/kafka');
const messageHandler = require('./consumers/messageHandler');
const contactRoutes = require('./routes/routes');

const app = express();

// Express API Setup
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

// API routes
app.use('/api/v1', contactRoutes);

app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Notification service is running..."
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 8004;
app.listen(PORT, () => {
    console.log(`Notification service API is listening on port ${PORT}`);
});


// Kafka Worker Setup
const startWorker = async () => {
    console.log('Starting Kafka worker...');
    await connectConsumer();
    await runConsumer(messageHandler);
};

startWorker().catch(error => {
    console.error("Failed to start Kafka worker:", error);
});
