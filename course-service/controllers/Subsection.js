const SubSection = require("../models/SubSection");
const Section = require("../models/Section");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

exports.createSubSection = async(req, res) => {
    try {
        const { sectionId, title, description } = req.body;

        const video = req.files.video;
        if (!sectionId || !title || !description || !video) {
            return res.status(404).json({
                success: false,
                message: "Al fields are required",
                error: err.message,
            })
        }

        const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);

        const subSectionDetails = await SubSection.create({
            title: title,
            timeDuration: `${uploadDetails.duration}`,
            description: description,
            videoUrl: uploadDetails.secure_url,
        });

        const updatedSection = await Section.findByIdAndUpdate({ _id: sectionId }, {
            $push: {
                subSection: subSectionDetails._id,
            }
        }, { new: true }).populate("subSection").exec();

        return res.status(200).json({
            success: true,
            message: "Section updated successfully",
            data: updatedSection,
        })

    } catch (err) {

        console.log(err)
        return res.status(500).json({
            success: false,
            message: "Internal Server error",
            error: err.message,
        })
    }
}

exports.updateSubSection = async(req, res) => {
    try {
        const { subSectionId, title, description, sectionId } = req.body; 

        // Validate essential IDs
        if (!subSectionId || !sectionId) {
            return res.status(400).json({ // 400 for bad requests (missing IDs)
                success: false,
                message: "SubSection ID and Section ID are required for update.",
            });
        }

        const subSection = await SubSection.findById(subSectionId);

        if (!subSection) {
            return res.status(404).json({
                success: false,
                message: "SubSection not found",
            });
        }

        // Update title if provided
        if (title !== undefined) {
            subSection.title = title;
        }

        // Update description if provided
        if (description !== undefined) {
            subSection.description = description;
        }

        // Handle video file update if provided
        if (req.files && req.files.video !== undefined) {
            const video = req.files.video;
            let uploadDetails;
            try {
                // Add specific error handling for Cloudinary upload
                uploadDetails = await uploadImageToCloudinary(
                    video,
                    process.env.FOLDER_NAME
                );
                subSection.videoUrl = uploadDetails.secure_url;
                subSection.timeDuration = `${uploadDetails.duration}`;
                console.log("Cloudinary video upload/update successful:", uploadDetails.secure_url);
            } catch (cloudinaryError) {
                console.error("Error updating video on Cloudinary:", cloudinaryError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload new video to Cloudinary",
                    error: cloudinaryError.message,
                });
            }
        }

        // Save the changes to the subsection
        await subSection.save();
        // Populate the section with its subsections to send back the updated structure
        const updatedSection = await Section.findById(sectionId).populate("subSection").exec();

        // Check if section was found and populated
        if (!updatedSection) {
            return res.status(404).json({
                success: false,
                message: "Parent Section not found after subsection update.",
            });
        }

        return res.status(200).json({
            success: true,
            data: updatedSection, // correctly contains the updated section with populated subsections
            message: "SubSection Updated successfully"
        });

    } catch (err) {
        console.error("Error in updateSubSection:", err);
        return res.status(500).json({
            success: false,
            message: "Internal Server error while updating SubSection",
            error: err.message,
        });
    }
};

exports.deleteSubSection = async(req, res) => {
    try {
        const { subSectionId, sectionId } = req.body

        await Section.findByIdAndUpdate({ _id: sectionId }, {
            $pull: {
                subSection: subSectionId,
            },
        })

        const subSec = await SubSection.findByIdAndDelete(subSectionId);

        if (!subSec) {
            return res
                .status(404)
                .json({ success: false, message: "SubSection not found" })
        }

        const updatedSection = await Section.findById(sectionId).populate("subSection")

        return res.status(200).json({
            success: true,
            data: updatedSection,
            message: "SubSection deleted successfully",
        });


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "SubSection cant be deleted",
            error: err.message,
        })
    }
};