const axios = require('axios');
const mailSender = require('../utils/mailSender');
const { courseEnrollmentEmail } = require('../templates/courseEnrollmentEmail');
const { paymentSuccessEmail } = require('../templates/paymentSuccessEmail');
const { passwordUpdated } = require('../templates/passwordUpdate');
const emailTemplate = require('../templates/emailVerificationTemplate');
require('dotenv').config();


// Helper function to get user details
async function getUserDetails(userId) {
    try {
        // Internal API call to user-service
        const response = await axios.post(`${process.env.USER_SERVICE_URL}/api/v1/internal/getUserDetails`, { userId });
        return response.data.data;
    } catch (error) {
        console.error(`Failed to fetch details for user ${userId}:`, error.message);
        return null;
    }
}

// Helper function to get course details
async function getCourseDetails(courseId) {
    try {
        // Internal API call to course-service
        const response = await axios.post(`${process.env.COURSE_SERVICE_URL}/api/v1/course/getCourseDetails`, { courseId });
        return response.data.data.courseDetails;
    } catch (error) {
        console.error(`Failed to fetch details for course ${courseId}:`, error.message);
        return null;
    }
}

// Event Handlers
const handlePaymentCompleted = async (payload) => {
    const { userId, courses, paymentDetails } = payload;
    const user = await getUserDetails(userId);

    if (!user) return;

    // 1. Send a generic payment success email
    const totalAmount = paymentDetails.amount / 100; // Assuming amount is in paisa
    await mailSender(
        user.email,
        'Payment Received - Studyonic',
        paymentSuccessEmail(
            `${user.firstName} ${user.lastName}`,
            totalAmount,
            paymentDetails.orderId,
            paymentDetails.paymentId
        )
    );

    // 2. Send an enrollment email for each course
    for (const courseId of courses) {
        const course = await getCourseDetails(courseId);
        if (course) {
            await mailSender(
                user.email,
                `Successfully Enrolled in ${course.courseName}`,
                courseEnrollmentEmail(course.courseName, `${user.firstName} ${user.lastName}`)
            );
        }
    }
};

const handleUserRegistered = async (payload) => {
    const { email, otp } = payload;
    try {
        await mailSender(email, 'Verify Your Email for Studyonic', emailTemplate(otp));
        console.log(`Successfully sent OTP to ${email}`);
    } catch (error) {
        console.error(`Failed to send OTP to ${email}:`, error);
    }
};


const handlePasswordResetRequest = async (payload) => {
    const { email, firstName, url } = payload;
    const emailBody = `
        Hello ${firstName},<br><br>
        A password reset request was made for your Studyonic account. Please click the link below to reset your password. This link is valid for 5 minutes.<br><br>
        <a href="${url}">Reset Your Password</a><br><br>
        If you did not request this, please ignore this email.
    `;
    await mailSender(email, "Password Reset Link - Studyonic", emailBody);
    console.log(`Sent password reset link to ${email}`);
};

const handlePasswordChanged = async (payload) => {
    const { email, firstName } = payload;
    
    if (!email) {
        console.error("Cannot send password change email: email is missing from payload.");
        return;
    }

    try {
        const emailBody = passwordUpdated(email, `Hi ${firstName}, your password has been updated successfully.`);
        await mailSender(
            email,
            "Your Password Has Been Updated - Studyonic",
            emailBody
        );
        console.log(`Successfully sent password change confirmation to ${email}`);
    } catch (error) {
        console.error(`Failed to send password change email to ${email}:`, error);
    }
};

// Main Message Handler
const messageHandler = (topic, payload) => {
    console.log(`Received message on topic: ${topic}`);
    switch (topic) {
        case 'payment.completed':
            handlePaymentCompleted(payload);
            break;
        case 'user.registered':
            handleUserRegistered(payload);
            break;
        case 'password.reset.request':
            handlePasswordResetRequest(payload);
            break;
        case 'user.password.changed':
            handlePasswordChanged(payload);
            break;
        default:
            console.log(`No handler for topic: ${topic}`);
    }
};

module.exports = messageHandler;