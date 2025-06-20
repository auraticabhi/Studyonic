const mongoose = require("mongoose");
const { sendMessage } = require('../config/kafka');

const OTPSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 5,
    },
});

OTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

async function sendVerificationMail(email, otp) {
    try {
        await sendMessage('user.registered', { email, otp });
        console.log("Verification event published to Kafka successfully.");
    } catch (err) {
        console.log("Error occurred while publishing verification event", err);
        throw err;
    }
}

OTPSchema.pre("save", async function(next) {
    console.log("New document saved to database");
    if (this.isNew) {
        await sendVerificationMail(this.email, this.otp);
    }
    next();
});

module.exports = mongoose.model("OTP", OTPSchema);