const express = require("express");
const app = express();
require("dotenv").config();
const { connectRedis } = require('./config/redis');

const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const routes = require("./routes/routes");

const { initializeKafkaConsumer, runConsumer, disconnectConsumer } = require('./config/kafka');
const messageHandler = require('./consumers/messageHandler');

const PORT = process.env.PORT || 8002;

// Connect to DB
database.connect();

// Connect to Redis
connectRedis();

// Connect to Cloudinary
cloudinaryConnect();

// Wrap Kafka initialization in an async function or use .then/.catch
async function startKafka() {
    try {
        await initializeKafkaConsumer(); // Connects and subscribes
        await runConsumer(messageHandler); // Starts the message processing loop
        // Add listeners for graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM. Disconnecting Kafka consumer...');
            await disconnectConsumer();
            process.exit(0);
        });
        process.on('SIGINT', async () => {
            console.log('Received SIGINT. Disconnecting Kafka consumer...');
            await disconnectConsumer();
            process.exit(0);
        });

    } catch (error) {
        console.error("Failed to start Kafka consumer:", error);
        process.exit(1);
    }
}

// Call the async Kafka start function
startKafka();

// Express Middleware and Routes
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[COURSE-SERVICE] ${req.method} ${req.url}`);
    console.log(`[COURSE-SERVICE] Path: ${req.path}`);
    console.log(`[COURSE-SERVICE] Original URL: ${req.originalUrl}`);
    next();
});
app.use(cookieParser());
app.use(cors({ origin: "*", credentials: true }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp" }));

app.use('/api/v1/course', routes);

app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Course service is up and running..."
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Course service is running at ${PORT}`);
});