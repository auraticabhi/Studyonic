const RatingAndReview = require("../models/RatingAndReview");
const Course = require("../models/Course");

exports.createRating = async(req, res) => {
    try {
        const userId = req.header('X-User-Id');
        const { rating, review, courseId } = req.body;

        const courseDetails = await Course.findOne({
            _id: courseId,
            studentsEnrolled: { $elemMatch: { $eq: userId } },
        });

        if (!courseDetails) {
            return res.status(404).json({
                success: false,
                message: "Student is not enrolled in the course",
            });
        }

        const alreadyReviewed = await RatingAndReview.findOne({
            user: userId,
            course: courseId
        });

        if (alreadyReviewed) {
            return res.status(403).json({
                success: false,
                message: "Already reviewed",
            });
        }

        const ratingReview = await RatingAndReview.create({
            rating,
            review,
            course: courseId,
            user: userId,
        });

        const updatedCourseDetails = await Course.findByIdAndUpdate({ _id: courseId }, {
            $push: {
                ratingAndReviews: ratingReview._id,
            }
        }, { new: true });
        console.log(updatedCourseDetails);
        return res.status(200).json({
            success: true,
            message: "Rating and Review Created successfullty",
            ratingReview
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message,
        })
    }
}

exports.getAverageRating = async(req, res) => {
    try {
        const courseId = req.body.courseId;

        const result = await RatingAndReview.aggregate([{
                $match: {
                    course: new mongoose.Types.ObjectId(courseId),
                },
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                }
            }
        ])

        if (result.length > 0) {
            return res.status(200).json({
                success: true,
                averageRating: result[0].averageRating,
            })
        }

        return res.status(200).json({
            success: true,
            message: "No ratings for this course",
            averageRating: 0
        })
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message,
        })
    }
}

exports.getAllRating = async(req, res) => {
    try {
        const allReviews = await RatingAndReview.find({})
            .sort({ rating: "desc" })
            .populate({
                path: "course",
                select: "courseName",
            })
            .lean()
            .exec();

        return res.status(200).json({
            success: true,
            message: "All reviews fetched successfully",
            data: allReviews,
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message,
        })
    }
}