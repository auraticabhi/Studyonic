const CourseProgress = require("../models/CourseProgress");
const SubSection = require("../models/SubSection");


exports.updateCourseProgress = async(req, res) => {
    const { courseId, subSectionId } = req.body;
    const userId = req.header('X-User-Id');

    try {
        console.log("next level chutiyap");
        //check if the subsection is valid
        const subSection = await SubSection.findById(subSectionId);

        if (!subSection) {
            return res.status(404).json({ error: "Invalid SUbSection" });
        }

        console.log("SubSection Validation Done");

        //check for old entry 
        let courseProgress = await CourseProgress.findOne({
            courseID: courseId,
            userId: userId,
        });
        if (!courseProgress) {
            return res.status(404).json({
                success: false,
                message: "Course Progress does not exist"
            });
        } else {
            console.log("Course Progress Validation Done");
            //check for re-completing videosubsection
            if (courseProgress.completedVideos.includes(subSectionId)) {
                return res.status(400).json({
                    error: "Subsection already completed",
                });
            }

            //poush into completed video
            courseProgress.completedVideos.push(subSectionId);
            console.log("Copurse Progress Push Done");
        }
        await courseProgress.save();
        console.log("Course Progress Save call Done");
        return res.status(200).json({
            success: true,
            message: "Course Progress Updated Successfully",
        })
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: "Internal Server Error" });
    }
}

exports.getCourseProgress = async (req, res) => {
    try {
        const { courseId, userId } = req.body;
        const progress = await CourseProgress.findOne({
            courseID: courseId,
            userId: userId,
        }).lean();

        if (!progress) {
            // It's not an error if a user hasn't started a course, just return empty progress
            return res.status(200).json({ success: true, data: { completedVideos: [] } });
        }
        
        return res.status(200).json({ success: true, data: progress });
    } catch (error) {
        console.error("Error fetching course progress:", error);
        return res.status(500).json({ success: false, message: "Could not fetch course progress." });
    }
};