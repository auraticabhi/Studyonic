const Course = require("../models/Course");
const Category = require("../models/Category");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const { convertSecondsToDuration } = require("../utils/secToDuration")
const Section = require("../models/Section")
const SubSection = require("../models/SubSection")
const CourseProgress = require("../models/CourseProgress");
const { sendMessage } = require('../config/kafka');
const { redisClient } = require('../config/redis');

exports.createCourse = async(req, res) => {
    try {
        const { courseName, courseDescription, whatYouWillLearn, price, category, tag, status, instructions } = req.body;

        console.log("req: ", req.files);
        const thumbnail = req.files.thumbnailImage;

        if (!courseName || !courseDescription || !whatYouWillLearn || !price || !tag || !category || !thumbnail) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const userId = req.header('X-User-Id');

        if (!status || status === undefined) {
            status = "Draft";
        }

        const instructorId = req.header('X-User-Id');

        const categoryDetails = await Category.findById(category);
        if (!categoryDetails) {
            return res.status(404).json({
                success: false,
                message: "Category Detils not found",
            });
        }

        const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);
        const newCourse = await Course.create({
            courseName,
            courseDescription,
            instructor: instructorId,
            whatYouWillLearn,
            price,
            tag: tag,
            category: categoryDetails._id,
            thumbnail: thumbnailImage.secure_url,
            status: status,
            instructions: instructions,
        });
        

        await Category.findByIdAndUpdate({ _id: categoryDetails._id }, {
            $push: {
                courses: newCourse._id
            },
        }, { new: true });

        return res.status(200).json({
            success: true,
            data: newCourse,
            message: "Course created successfully"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Failed to create Course",
            error: err.message,
        });
    }
};

exports.getAllCourses = async (req, res) => {
    try {
        const allCourses = await Course.find({ status: "Published" })
            .select("courseName price thumbnail instructor studentsEnrolled ratingAndReviews")
            .lean();
            
        return res.status(200).json({ success: true, data: allCourses });
    } catch (err) {
        console.error("Error in getAllCourses:", err);
        return res.status(500).json({ success: false, message: "Cannot fetch course data", error: err.message });
    }
};

exports.getCourseDetails = async (req, res) => {
    const { courseId } = req.body;
    const cacheKey = `course:${courseId}`; // Dynamic key based on the course ID

    try {
        // 1. Check cache first
        const cachedCourse = await redisClient.get(cacheKey);
        if (cachedCourse) {
            console.log(`CACHE HIT: Serving course details for ${courseId} from Redis.`);
            return res.status(200).json({
                success: true,
                message: "Course details fetched from cache.",
                data: JSON.parse(cachedCourse),
            });
        }

        // 2. Cache miss, get from DB
        console.log(`CACHE MISS: Fetching course details for ${courseId} from MongoDB.`);
        const courseDetails = await Course.findOne({ _id: courseId, status: "Published" })
            .populate("category")
            .populate({ path: "courseContent", populate: { path: "subSection", select: "-videoUrl" } })
            .populate("ratingAndReviews")
            .lean();

        if (!courseDetails) {
            return res.status(404).json({ success: false, message: `Could not find course with id: ${courseId}` });
        }
        
        const responseData = { courseDetails };

        // 3. Set the new cache entry. A shorter TTL might be appropriate here.
        await redisClient.set(cacheKey, JSON.stringify(responseData), { EX: 1800 }); // 30-minute expiry

        return res.status(200).json({ success: true, data: responseData });
    } catch (err) {
        console.error("Error in getCourseDetails:", err);
        return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
};

exports.editCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        
        const courseExists = await Course.findById(courseId);
        if (!courseExists) {
            return res.status(404).json({ success: false, error: "Course not found" });
        }

        const updateData = { ...req.body };
        
        if (req.files && req.files.thumbnailImage) {
            const thumbnail = req.files.thumbnailImage;
            const thumbnailImage = await uploadImageToCloudinary(
                thumbnail,
                process.env.FOLDER_NAME
            );
            updateData.thumbnail = thumbnailImage.secure_url;
        }

        if (updateData.tag) {
            try {
                updateData.tag = JSON.parse(updateData.tag);
            } catch (e) { /* ignore error */ }
        }
        if (updateData.instructions) {
             try {
                updateData.instructions = JSON.parse(updateData.instructions);
            } catch (e) { /* ignore error */ }
        }
        
        delete updateData.courseId;

        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            { $set: updateData },
            { new: true }
        ).lean();

        await redisClient.del(`course:${courseId}`);

        res.json({
            success: true,
            message: "Course updated successfully",
            data: updatedCourse,
        });

    } catch (error) {
        console.error("Error in editCourse controller:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message, 
        });
    }
};

// Get a list of Course for a given Instructor
exports.getInstructorCourses = async(req, res) => {
        try {
            // Get the instructor ID from the authenticated user or request body
            const instructorId = req.header('X-User-Id')

            // Find all courses belonging to the instructor
            const instructorCourses = await Course.find({
                instructor: instructorId,
            }).sort({ createdAt: -1 })

            // Return the instructor's courses
            res.status(200).json({
                success: true,
                data: instructorCourses,
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                success: false,
                message: "Failed to retrieve instructor courses",
                error: error.message,
            })
        }
    }

// Delete the Course
exports.deleteCourse = async(req, res) => {
    try {
        const { courseId } = req.body

        // Find the course
        const course = await Course.findById(courseId)
        if (!course) {
            return res.status(404).json({ message: "Course not found" })
        }

        // Unenroll students from the course
        const studentsEnrolled = course.studentsEnrolled;
        if (studentsEnrolled && studentsEnrolled.length > 0) {
            await sendMessage('course.deleted', { courseId, studentsEnrolled });
            console.log(`Published 'course.deleted' event for course ${courseId}`);
        }

        // Delete sections and sub-sections
        const courseSections = course.courseContent
        for (const sectionId of courseSections) {
            // Delete sub-sections of the section
            const section = await Section.findById(sectionId)
            if (section) {
                const subSections = section.subSection
                for (const subSectionId of subSections) {
                    await SubSection.findByIdAndDelete(subSectionId)
                }
            }

            // Delete the section
            await Section.findByIdAndDelete(sectionId)
        }

        // Delete the course
        await Course.findByIdAndDelete(courseId)

        await redisClient.del(`course:${courseId}`);

        return res.status(200).json({
            success: true,
            message: "Course deleted successfully",
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        })
    }
}

exports.instructorDashboard = async(req, res) => {
    try {
        const courseDetails = await Course.find({ instructor: req.header('X-User-Id') });

        const courseData = courseDetails.map((course) => {
            const totalStudentsEnrolled = course.studentsEnrolled.length
            const totalAmountGenerated = totalStudentsEnrolled * course.price

            //create an new object with the additional fields
            const courseDataWithStats = {
                _id: course._id,
                courseName: course.courseName,
                courseDescription: course.courseDescription,
                totalStudentsEnrolled,
                totalAmountGenerated,
            }
            return courseDataWithStats
        })

        res.status(200).json({ courses: courseData });

    } catch (error) {
        console.error("Yeh hai error: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

exports.getCourseDetailsBatch = async (req, res) => {
    try {
        const { courseIds } = req.body;
        const courses = await Course.find({ _id: { $in: courseIds } }).select("price studentsEnrolled").lean();
        return res.status(200).json({ success: true, data: courses });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getEnrolledCourseDetails = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.header('X-User-Id');

        const course = await Course.findOne({
            _id: courseId,
            studentsEnrolled: { $elemMatch: { $eq: userId } }
        });

        if (!course) {
            // check if the user is the instructor, as they should also get full details
            const instructorCourse = await Course.findOne({ _id: courseId, instructor: userId });
            if (!instructorCourse) {
                 return res.status(403).json({ success: false, message: "You are not authorized to view this course's full details." });
            }
        }
        
        const courseDetails = await Course.findOne({ _id: courseId })
            .populate("category")
            .populate("ratingAndReviews")
            .populate({
                path: "courseContent",
                populate: { path: "subSection" }
            })
            .lean();

        if (!courseDetails) {
            return res.status(404).json({ success: false, message: "Course not found." });
        }

        return res.status(200).json({ success: true, data: courseDetails });
    } catch (error) {
        console.error("Error in getEnrolledCourseDetails:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};


exports.getEnrolledCoursesBatch = async (req, res) => {
    try {
        const { courseIds, userId } = req.body;

        const courses = await Course.find({ _id: { $in: courseIds } })
            .populate({
                path: "courseContent",
                populate: { path: "subSection", select: "timeDuration" },
            })
            .lean();

        for (const course of courses) {
            let totalDurationInSeconds = 0;
            let subsectionLength = 0;
            for (const content of course.courseContent) {
                subsectionLength += content.subSection.length;
                for (const subSec of content.subSection) {
                    totalDurationInSeconds += parseInt(subSec.timeDuration) || 0;
                }
            }
            course.totalDuration = convertSecondsToDuration(totalDurationInSeconds);

            const courseProgress = await CourseProgress.findOne({ courseID: course._id, userId: userId });
            const completedVideosCount = courseProgress ? courseProgress.completedVideos.length : 0;
            course.progressPercentage = subsectionLength > 0 ? (completedVideosCount / subsectionLength) * 100 : 100;
        }

        return res.status(200).json({ success: true, data: courses });

    } catch (error) {
        console.error("Error in getEnrolledCoursesBatch:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};