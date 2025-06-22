const express = require("express");
const app = express();
require("dotenv").config();

const cors = require("cors");
const routes = require("./routes/routes");
const { connectProducer } = require('./config/kafka');

const PORT = process.env.PORT || 4000;

// Connect Kafka Producer on start
connectProducer();

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

app.use('/api/v1/payment', routes);

app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Payment service is up and running..."
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Payment service is running at ${PORT}`);
});