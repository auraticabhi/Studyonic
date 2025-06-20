const User = require('../models/User');
const OTP = require('../models/OTP');
const otpGenerator = require("otp-generator");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require('../models/Profile');
require("dotenv").config();
const { sendMessage } = require('../config/kafka');

exports.sendOTP = async(req, res) => {
    try {
        const { email } = req.body;

        const checkUserPresent = await User.findOne({ email });
        if (checkUserPresent) {
            return res.status(401).json({
                success: false,
                message: "User already registered"
            });
        }

        let otp;
        let result;
        // Use a do...while loop to guarantee the check runs at least once
        // and that we always find a unique OTP.
        do {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            result = await OTP.findOne({ otp: otp });
        } while (result); // Keep looping as long as the generated OTP is found in the DB

        const otpPayload = { email, otp };
        const otpBody = await OTP.create(otpPayload);

        // In production, dont send the OTP back in the response.
        // The user must get it from their email.
        // For testing, only.
        res.status(200).json({
            success: true,
            message: 'OTP Sent Successfully',
            //otp, // TO REMOVE THIS IN PRODUCTION
        });

    } catch (err) {
        console.log("Error in sendOTP controller: ", err);
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

//SignUp
exports.signUp = async(req, res) => {

    try {
        console.log("cv");
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            //contactNumber,
            otp
        } = req.body;

        if (!firstName || !lastName || !email || !password || !confirmPassword || !accountType || !otp) {
            return res.status(403).json({
                success: false,
                message: "All fields are required"
            })
        }

        if (password !== confirmPassword) {
            return res.status(403).json({
                success: false,
                message: "Passwords do not match"
            })
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(403).json({
                success: false,
                message: "User already registered"
            })
        }

        const recentOtp = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
        console.log(recentOtp);

        if (recentOtp.length == 0) {
            return res.status(400).json({
                success: false,
                message: "OTP Not Found"
            })
        } else if (otp !== recentOtp[0].otp) {
            console.log("Abhi");
            console.log("OTP", otp);
            console.log(recentOtp);
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 9);

        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null,
        });

        const user = await User.create({
            firstName,
            lastName,
            email,
            //contactNumber,
            password: hashedPassword,
            accountType,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
        })
        return res.status(200).json({
            success: true,
            message: "User registered successfully",
            user
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "User canot be registerd please try again"
        })
    }
}

exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(403).json({
                success: false,
                message: "Please enter all the deatils"
            });
        }

        const user = await User.findOne({ email }).populate("additionalDetails");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User is not registered"
            });
        }

        const payload = {
            email: user.email,
            id: user._id,
            accountType: user.accountType,
        }
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "72h"
            });
            user.token = token;
            user.password = undefined;

            const options = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                httpOnly: true,
            }

            res.cookie("token", token, options).status(200).json({
                success: true,
                token,
                user,
                message: "Logged in successfully"
            })
        } else {
            return res.status(401).json({
                success: false,
                message: "Password is Incorrect",
            });
        }

    } catch (err) {
        console.log(err);
        return res.status(401).json({
            success: false,
            message: "Login Failure, please try again",
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = req.header('X-User-Id');
        if (!userId) {
            return res.status(401).json({ success: false, message: "User ID not found in headers" });
        }

        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: "The old password is incorrect" });
        }

        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update the password in the database
        await User.findByIdAndUpdate(userId, { password: encryptedPassword });

        // Announce the event
        try {
            const payload = {
                email: user.email,
                firstName: user.firstName
            };
            await sendMessage('user.password.changed', payload);
            console.log("Published 'user.password.changed' event to Kafka.");
        } catch (kafkaError) {
            // Log the error but don't fail the entire request,
            // as the password change itself was successful.
            console.error("Kafka producer error while sending password change event: ", kafkaError);
        }
        // END OF PATTERN

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (err) {
        console.error("Error occurred while updating password: ", err);
        return res.status(500).json({
            success: false,
            message: "Error occurred while updating password",
        });
    }
};