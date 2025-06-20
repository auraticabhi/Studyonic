const { instance } = require("../config/razorpay");
const axios = require('axios');
const crypto = require("crypto");
const { sendMessage } = require('../config/kafka');
require('dotenv').config();

exports.capturePayment = async (req, res) => {
    try {
        const { courses } = req.body;
        const userId = req.header('x-user-id');

        if (!userId) {
            return res.status(401).json({ success: false, message: "User ID not found. Unauthorized." });
        }
        if (!courses || courses.length === 0) {
            return res.status(400).json({ success: false, message: "Course IDs are required." });
        }

        let totalAmount = 0;

        for (const courseId of courses) {
            try {
                const courseApiResponse = await axios.post(
                    `${process.env.COURSE_SERVICE_URL}/api/v1/course/getCourseDetails`, 
                    { courseId }
                );

                if (!courseApiResponse.data.success) {
                    // If a single course fetch fails, stop the entire transaction.
                    return res.status(404).json({ success: false, message: `Could not find details for course ${courseId}` });
                }

                const course = courseApiResponse.data.data.courseDetails;

                if (course.studentsEnrolled.includes(userId)) {
                    return res.status(400).json({ success: false, message: `Student is already enrolled in course: ${course.courseName}` });
                }
                totalAmount += course.price;

            } catch (error) {
                console.error(`Error fetching details for course ${courseId}:`, error.message);
                return res.status(500).json({ success: false, message: `Failed to retrieve course details. Please try again.` });
            }
        }
        
        const options = {
            amount: totalAmount * 100,
            currency: "INR",
            receipt: Math.random(Date.now()).toString(),
        };

        const paymentResponse = await instance.orders.create(options);
        return res.json({ success: true, data: paymentResponse });

    } catch (error) {
        console.error("Critical error in capturePayment:", error);
        return res.status(500).json({ success: false, message: "An unexpected internal error occurred." });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courses, amount } = req.body;
        const userId = req.header('x-user-id');

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses || !userId || !amount) {
            return res.status(400).json({ success: false, message: "Payment Failed: Missing fields" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment Verification Failed" });
        }
    
        const payload = {
            userId,
            courses,
            paymentDetails: {
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                amount: amount,
            }
        };
        await sendMessage('payment.completed', payload);
        console.log("Published 'payment.completed' event to Kafka");

        return res.status(200).json({ success: true, message: "Payment Verified. Enrollment is in progress.", courses: courses });

    } catch (error) {
        console.error("Error in verifyPayment:", error);
        return res.status(500).json({ success: false, message: "Could not process enrollment. Please contact support." });
    }
};