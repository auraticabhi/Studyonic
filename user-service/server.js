const express = require("express");
const { cloudinaryConnect } = require("./config/cloudinary");
const { connectRedis } = require('./config/redis');
const app = express();
require("dotenv").config();

const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const routes = require("./routes/routes");
const fileUpload = require("express-fileupload");

const { initializeProducer, initializeConsumer, runConsumer, disconnectProducer, disconnectConsumer } = require('./config/kafka');
const messageHandler = require('./consumers/messageHandler');

const PORT = process.env.PORT || 8001;

database.connect();
connectRedis();

app.use(express.json());
app.use((req, res, next) => {
    console.log(`[USER-SERVICE] Request received for path: ${req.path}`);
    console.log(`[USER-SERVICE] Request body:`, req.body);
    next();
});
app.use(cookieParser());
app.use(cors({ origin: "*", credentials: true }));

app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp"
    })
)

cloudinaryConnect();

// Kafka Setup
async function startKafka() {
    try {
        // Initialize Producer
        await initializeProducer();

        // Initialize Consumer
        await initializeConsumer(); // Connects and subscribes
        await runConsumer(messageHandler); // Starts the message processing loop

        console.log("Kafka setup complete: Producer connected, Consumer initialized and running.");

        // Add listeners for graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM. Disconnecting Kafka producer and consumer...');
            await disconnectProducer();
            await disconnectConsumer();
            process.exit(0);
        });
        process.on('SIGINT', async () => {
            console.log('Received SIGINT. Disconnecting Kafka producer and consumer...');
            await disconnectProducer();
            await disconnectConsumer();
            process.exit(0);
        });

    } catch (error) {
        console.error("Failed to start Kafka operations for user-service:", error);
        process.exit(1);
    }
}

// Call the async Kafka start function
startKafka();

app.use('/api/v1', routes);

app.post("/", (req, res)=>{
    return res.json({
        success: true,
        message: "Post request receves"
    });
})

app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "User service is up and running..."
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`User service is running at ${PORT}`);
});
