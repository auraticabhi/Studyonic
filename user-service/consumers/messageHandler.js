const User = require('../models/User');

const handlePaymentCompleted = async (payload) => {
    const { userId, courses } = payload;
    console.log(`Updating user ${userId} with new courses: ${courses.join(', ')}`);

    try {
        await User.findByIdAndUpdate(userId, {
            $push: { courses: { $each: courses } }
        });
        console.log(`Successfully updated course list for user ${userId}`);
    } catch (error) {
        console.error(`Failed to update courses for user ${userId}:`, error);
    }
};

const handleCourseDeleted = async (payload) => {
    const { courseId, studentsEnrolled } = payload;
    console.log(`Removing course ${courseId} from all enrolled users.`);
    try {
        // Use $pull to remove the courseId from the 'courses' array for all specified users.
        await User.updateMany(
            { _id: { $in: studentsEnrolled } },
            { $pull: { courses: courseId } }
        );
        console.log(`Successfully unenrolled users from deleted course ${courseId}.`);
    } catch(error) {
        console.error(`Error unenrolling users from deleted course ${courseId}:`, error);
    }
};

const messageHandler = (topic, payload) => {
    console.log(`Received message on topic: ${topic}`);
    switch (topic) {
        case 'payment.completed':
            handlePaymentCompleted(payload);
            break;
        case 'course.deleted':
        handleCourseDeleted(payload);
        break;
        default:
            console.log(`No handler for topic: ${topic}`);
    }
};

module.exports = messageHandler;