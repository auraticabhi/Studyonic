const express = require("express");
const router = express.Router();

const { isInstructor, isStudent, isAdmin } = require('../middleware/authz');

// Importing Controllers
const { createCourse, getEnrolledCourseDetails, getAllCourses, getCourseDetails, editCourse, getInstructorCourses, deleteCourse, getCourseDetailsBatch, instructorDashboard, getEnrolledCoursesBatch } = require("../controllers/Course");
const { showAllCategories, createCategory, categoryPageDetails, updateCategory, deleteCategory } = require("../controllers/Category");
const { createSection, updateSection, deleteSection } = require("../controllers/Section");
const { createSubSection, updateSubSection, deleteSubSection } = require("../controllers/Subsection");
const { createRating, getAverageRating, getAllRating } = require("../controllers/RatingAndReview");
const { updateCourseProgress, getCourseProgress } = require("../controllers/courseProgress");

// Routes for creating, editing, and managing a course (Instructor Only)
router.post("/createCourse", isInstructor, createCourse);
router.post("/editCourse", isInstructor, editCourse);
router.delete("/deleteCourse", isInstructor, deleteCourse);
router.get("/getInstructorCourses", isInstructor, getInstructorCourses);

// Routes for course sections (Instructor Only)
router.post("/addSection", isInstructor, createSection);
router.post("/updateSection", isInstructor, updateSection);
router.post("/deleteSection", isInstructor, deleteSection);

// Routes for course sub-sections (Instructor Only)
router.post("/addSubSection", isInstructor, createSubSection);
router.post("/updateSubSection", isInstructor, updateSubSection);
router.post("/deleteSubSection", isInstructor, deleteSubSection);

// Routes for student course interaction (Student Only)
router.post("/updateCourseProgress", isStudent, updateCourseProgress);
//router.post("/getFullCourseDetailsForUser", isStudent, getFullCourseDetailsForUser); // Gets details for courses a student is enrolled in
router.post("/getCourseProgress", getCourseProgress);
router.post("/internal/getEnrolledCoursesBatch", getEnrolledCoursesBatch);

// Route for creating a category (Admin Only)
router.post("/createCategory", isAdmin, createCategory);
router.put("/updateCategory", isAdmin, updateCategory); // PUT for updates
router.delete("/deleteCategory", isAdmin, deleteCategory); // DELETE for deletions
// Public category routes (No auth needed as gateway allows them)
router.get("/showAllCategories", showAllCategories);
router.post("/getCategoryPageDetails", categoryPageDetails);

// Route for creating a rating (Student Only)
router.post("/createRating", isStudent, createRating);

// Public rating routes
router.get("/getAverageRating", getAverageRating); // Can be public to show on course page
router.get("/getReviews", getAllRating);           // Can be public for a reviews page

// Public
router.get("/getAllCourses", getAllCourses);
router.post("/getCourseDetails", getCourseDetails);

// Internal-only route for payment service (No auth middleware needed here)
router.post("/internal/getCourseDetailsBatch", getCourseDetailsBatch);
router.post("/internal/getEnrolledCourseDetails", getEnrolledCourseDetails);

// Dashboard for instructor (Instructor Only)
router.get("/instructor-dashboard", isInstructor, instructorDashboard);


module.exports = router;