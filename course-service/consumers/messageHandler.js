const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const { sendMessage } = require('../config/kafka');

const handlePaymentCompleted = async (payload) => {
    const { userId, courses } = payload;
    console.log(`Processing enrollment for user ${userId} in courses: ${courses.join(', ')}`);

    for (const courseId of courses) {
        try {
            // 1. Add user to the course's studentsEnrolled array
            await Course.findByIdAndUpdate(courseId, {
                $push: { studentsEnrolled: userId }
            });

            // 2. Create a CourseProgress entry for the user
            await CourseProgress.create({
                courseID: courseId,
                userId: userId,
                completedVideos: [],
            });

            console.log(`Successfully enrolled user ${userId} in course ${courseId}`);
        } catch (error) {
            console.error(`Failed to enroll user ${userId} in course ${courseId}:`, error);
            // TODO: a "dead-letter queue" or retry logic
        }
    }
};

const handleUserDeleted = async (payload) => {
    const { userId, accountType, enrolledCourses } = payload;
    console.log(`[Consumer] Processing user deletion cleanup for user ${userId} with role ${accountType}`);

    // Logic for when a STUDENT is deleted 
    if (accountType === "Student" && enrolledCourses && enrolledCourses.length > 0) {
        try {
            // Un-enroll the student from all their courses
            await Course.updateMany(
                { _id: { $in: enrolledCourses } },
                { $pull: { studentsEnrolled: userId } }
            );
            console.log(`[Consumer] Successfully unenrolled deleted student ${userId} from their courses.`);
        } catch(error) {
            console.error(`[Consumer] Error unenrolling deleted student ${userId}:`, error);
        }
    }

    // Logic for when an INSTRUCTOR is deleted
    if (accountType === "Instructor") {
        try {
            // Find all courses created by this instructor
            const instructorCourses = await Course.find({ instructor: userId }).select('_id studentsEnrolled');
            
            if (instructorCourses.length > 0) {
                const courseIds = instructorCourses.map(course => course._id);
                
                // BUSINESS RULE IMPLEMENTATION
                // Set all of the instructor's courses to "Draft" status.
                await Course.updateMany(
                    { _id: { $in: courseIds } },
                    { status: 'Draft' }
                );
                console.log(`[Consumer] Successfully unpublished all courses for deleted instructor ${userId}.`);

                // We should also un-enroll all students from these now-unpublished courses.
                // We can do this by publishing a new event for each course.
                for (const course of instructorCourses) {
                    if (course.studentsEnrolled && course.studentsEnrolled.length > 0) {
                        await sendMessage('course.deleted', { courseId: course._id, studentsEnrolled: course.studentsEnrolled });
                    }
                }
            }
        } catch (error) {
            console.error(`[Consumer] Error handling deletion of instructor ${userId}:`, error);
        }
    }
};

const messageHandler = (topic, payload) => {
    console.log(`Received message on topic: ${topic}`);
    switch (topic) {
        case 'payment.completed':
            handlePaymentCompleted(payload);
            break;
        case 'user.deleted':
            handleUserDeleted(payload);
            break;
        default:
            console.log(`No handler for topic: ${topic}`);
    }
};

module.exports = messageHandler;