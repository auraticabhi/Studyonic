const express = require("express");
const router = express.Router();

const { login, signUp, sendOTP, changePassword } = require("../controllers/Auth");
const { resetPasswordToken, resetPassword } = require("../controllers/ResetPassword");
const { getPublicUserDetails, deleteAccount, updateProfile, getAllUserDetails, updateDisplayPicture, getEnrolledCourses, getInternalUserDetails, getPublicUsersDetailsBatch } = require("../controllers/Profile");

// Public Auth Routes (Handled by gateway)
router.post("/auth/login", login);
router.post("/auth/signup", signUp);
router.post("/auth/sendotp", sendOTP);
router.post("/auth/reset-password-token", resetPasswordToken);
router.post("/auth/reset-password", resetPassword);

// Authenticated Auth Route (Gateway applies `auth` middleware)
router.post("/auth/changepassword", changePassword);

// Gateway applies `auth` middleware to all /profile routes
router.delete("/profile/deleteProfile", deleteAccount);
router.put("/profile/updateProfile", updateProfile);
router.get("/profile/getUserDetails", getAllUserDetails);
router.put("/profile/updateDisplayPicture", updateDisplayPicture);
router.get("/profile/getEnrolledCourses", getEnrolledCourses);
router.post("/profile/getPublicUserDetails", getPublicUserDetails);

// This route is NOT exposed on the API Gateway.
// It is called directly by other services (like notification-service) within our private network.
router.post("/profile/getPublicUsersDetailsBatch", getPublicUsersDetailsBatch);
router.post("/internal/getUserDetails", getInternalUserDetails);
//router.post("/internal/getUsersDetailsBatch", getUsersDetailsBatch);

module.exports = router;