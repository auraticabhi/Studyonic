const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require('bcrypt');
const crypto = require("crypto");

exports.resetPasswordToken = async (req, res) => {
    try {
        const email = req.body.email;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ // Use 404 for not found
                success: false,
                message: "Email not registered with us."
            });
        }

        const token = crypto.randomUUID();
        const updatedDetails = await User.findOneAndUpdate(
            { email: email },
            {
                token: token,
                resetPasswordExpires: Date.now() + 5 * 60 * 1000, // 5 minutes
            },
            { new: true }
        );

        const url = `${process.env.FRONTEND_URL}/update-password/${token}`;
        
        // This part publishes a Kafka event
        // This assumes we have a Kafka producer set up in user-service
        const { sendMessage } = require('../config/kafka');
        
        await sendMessage('password.reset.request', {
            email,
            firstName: updatedDetails.firstName,
            url,
        });

        console.log("Password reset event published to Kafka.");

        return res.json({
            success: true,
            message: "Password reset link has been sent to your email.",
        });

    } catch (err) {
        console.error("Error in resetPasswordToken: ", err);
        return res.status(500).json({
            success: false,
            message: "An error occurred while attempting to reset the password.",
        });
    }
};

exports.resetPassword = async(req, res) => {
    try {
        const { password, confirmPassword, token } = req.body;

        if (password !== confirmPassword) {
            return res.status(500).json({
                success: false,
                message: "Passwords do not match",
            });
        }

        const userDetails = await User.findOne({ token: token });
        if (!userDetails) {
            return res.json({
                success: false,
                message: "Token is Invalid",
            });
        }

        if (userDetails.resetPasswordExpires < Date.now()) {
            return res.json({
                success: false,
                message: "Token expired please retry",
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findOneAndUpdate({
            token: token
        }, { password: hashedPassword }, { new: true }, );

        return res.status(200).json({
            success: true,
            message: "Password reset successfull"
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Password reset failed",
        });
    }
}