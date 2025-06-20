const Profile = require("../models/Profile");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const { sendMessage } = require('../config/kafka');
const axios = require('axios');

exports.updateProfile = async (req, res) => {
    try {
        const { 
            firstName = "", 
            lastName = "", 
            dateOfBirth = "", 
            about = "", 
            contactNumber = "", 
            gender = "N/A" 
        } = req.body;
        
        const id = req.header('X-User-Id'); 
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID not found"
            });
        }

        // Find user and get profile ID
        const userDetails = await User.findById(id);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const profileId = userDetails.additionalDetails;
        
        // Update user details (firstName, lastName)
        const updatedUser = await User.findByIdAndUpdate(
            id, 
            { firstName, lastName },
            { new: true, runValidators: true }
        );

        // Update profile details
        const updatedProfile = await Profile.findByIdAndUpdate(
            profileId,
            {
                dateOfBirth,
                about,
                gender,
                contactNumber
            },
            { new: true, runValidators: true }
        );

        if (!updatedProfile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found"
            });
        }

        // Get the complete updated user details with populated profile
        const finalUpdatedUserDetails = await User.findById(id)
            .populate("additionalDetails")
            .exec();

        return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    // OLD WAY: data: updatedUserDetails,
    // CONSISTENT WAY:
    updatedUserDetails: finalUpdatedUserDetails, 
});

    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating profile",
            error: error.message
        });
    }
};

exports.getInternalUserDetails = async (req, res) => {
    try {
        const { userId } = req.body;
        // Using .select() to only send necessary info
        const userDetails = await User.findById(userId).select("firstName lastName email").lean();
        if (!userDetails) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, data: userDetails });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


exports.deleteAccount = async (req, res) => {
    try {
        const id = req.header('X-User-Id');
        const userDetails = await User.findById(id);

        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // 1. Publish the event BEFORE deleting the user data.
        // This ensures listeners can still access user info if needed.
        const payload = {
            userId: id,
            accountType: userDetails.accountType,
            enrolledCourses: userDetails.courses,
        };
        await sendMessage('user.deleted', payload);
        console.log(`Published 'user.deleted' event for user ${id}`);

        // 2. Delete the associated profile
        await Profile.findByIdAndDelete(userDetails.additionalDetails);

        // 3. Delete the user
        await User.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "User account deleted successfully."
        });

    } catch (err) {
        console.error("Error in deleteAccount controller: ", err.message);
        return res.status(500).json({
            success: false,
            message: "User account could not be deleted."
        });
    }
};


exports.getAllUserDetails = async(req, res) => {
    try {
        const id = req.header('X-User-Id');

        const userDetails = await User.findById(id).populate("additionalDetails").exec();

        return res.status(200).json({
            success: true,
            message: "UserData fetched successfully",
            data: userDetails,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

exports.getPublicUsersDetailsBatch = async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ success: false, message: "User IDs must be an array." });
        }

        const users = await User.find({ _id: { $in: userIds } })
            .select("firstName lastName image") // Only return public, necessary data
            .lean();
            
        return res.status(200).json({ success: true, data: users });

    } catch (error) {
        console.error("Error in getUsersDetailsBatch:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDisplayPicture = async(req, res) => {
    try {
        const displayPicture = req.files.displayPicture;
        const userId = req.header('X-User-Id'); 
        const image = await uploadImageToCloudinary(
            displayPicture,
            process.env.FOLDER_NAME,
            1000,
            1000
        )
        console.log(image);
        const updatedProfile = await User.findByIdAndUpdate({ _id: userId }, { image: image.secure_url }, { new: true }).populate("additionalDetails").exec();
        res.send({
            success: true,
            message: `Image Updated successfully`,
            data: updatedProfile,
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

// NEW PUBLIC-FACING FUNCTION
exports.getPublicUserDetails = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required." });
        }

        // Find the user and select only the fields that are safe to be public
        const userDetails = await User.findById(userId)
            .select("firstName lastName image")
            .lean();

        if (!userDetails) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        return res.status(200).json({
            success: true,
            data: userDetails,
        });

    } catch (error) {
        console.error("Error in getPublicUserDetails: ", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching user details.",
        });
    }
};

exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.header('X-User-Id');
        
        // Step 1: Get the user's course list from our own database
        const userDetails = await User.findById(userId).select("courses").lean();
        if (!userDetails) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const courseIds = userDetails.courses;
        if (!courseIds || courseIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Step 2: Make an internal batch call to the course-service to get details
        const courseDetailsResponse = await axios.post(
            `${process.env.COURSE_SERVICE_URL}/api/v1/course/internal/getEnrolledCoursesBatch`,
            { courseIds, userId } // Pass userId for progress calculation
        );

        return res.status(200).json(courseDetailsResponse.data);

    } catch (error) {
        console.error("Error in getEnrolledCourses:", error.message);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};