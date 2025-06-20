const { Mongoose } = require("mongoose");
const Category = require("../models/Category");
const { redisClient } = require('../config/redis');

function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

// Helper function for invalidation
const invalidateAllCategoriesCache = async () => {
    try {
        console.log("CACHE INVALIDATION: Deleting 'categories:all' key.");
        await redisClient.del('categories:all');
    } catch (error) {
        console.error("Error invalidating categories cache:", error);
    }
};

exports.createCategory = async(req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res
                .status(400)
                .json({ success: false, message: "All fields are required" });
        }
        const CategorysDetails = await Category.create({
            name: name,
            description: description,
        });

        await invalidateAllCategoriesCache();

        console.log(CategorysDetails);
        return res.status(200).json({
            success: true,
            message: "Category Created Successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: true,
            message: error.message,
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { categoryId, name, description } = req.body;
        if (!categoryId || !name) {
            return res.status(400).json({ success: false, message: "Category ID and name are required" });
        }
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name, description },
            { new: true }
        );
        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // CACHE INVALIDATION
        await invalidateAllCategoriesCache();

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });
    } catch (error) {
        return res.status(500).json({
            success: true,
            message: error.message,
        });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.body;
        if (!categoryId) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
        }
        
        const deletedCategory = await Category.findByIdAndDelete(categoryId);
        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // CACHE INVALIDATION
        await invalidateAllCategoriesCache();

        return res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        return res.status(500).json({
            success: true,
            message: error.message,
        });
    }
};

exports.showAllCategories = async (req, res) => {
    const cacheKey = 'categories:all';

    try {
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("CACHE HIT: Serving 'showAllCategories' from Redis.");
            return res.status(200).json({
                success: true,
                message: "Categories fetched from cache.",
                data: JSON.parse(cachedData),
            });
        }

        console.log("CACHE MISS: Fetching 'showAllCategories' from MongoDB.");

        const allCategories = await Category.find({})
            .select("name description courses")
            .lean();
        
        await redisClient.set(cacheKey, JSON.stringify(allCategories), { EX: 3600 });

        res.status(200).json({
            success: true,
            message: "Categories fetched from database.",
            data: allCategories,
        });

    } catch (error) {
        console.error("Error in showAllCategories:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

exports.categoryPageDetails = async (req, res) => {
    try {
        const { categoryId } = req.body;

        // 1. Get the selected category with its published courses
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: {
                    path: "ratingAndReviews"
                }
            })
            .lean()
            .exec();

        if (!selectedCategory) {
            console.log("Category not found for ID:", categoryId);
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // 2. Handle the case where there are no courses in the selected category
        if (selectedCategory.courses.length === 0) {
            console.log("No courses found for the selected category.");
        }

        // 3. Get courses from a *different* category (Robustly handle edge cases)
        const categoriesExceptSelected = await Category.find({ _id: { $ne: categoryId } });
        
        let differentCategory = null; // Initialize as null
        if (categoriesExceptSelected.length > 0) {
            const randomIndex = getRandomInt(categoriesExceptSelected.length);
            const randomCategoryId = categoriesExceptSelected[randomIndex]._id;
            
            differentCategory = await Category.findById(randomCategoryId)
                .populate({
                    path: "courses",
                    match: { status: "Published" },
                })
                .lean()
                .exec();
        }

        // 4. Get top-selling courses across ALL categories (without populating instructor)
        const allCategories = await Category.find()
            .populate({
                path: "courses",
                match: { status: "Published" },
            })
            .lean()
            .exec();

        const allCourses = allCategories.flatMap((category) => category.courses);
        
        const mostSellingCourses = allCourses
            .sort((a, b) => (b.studentsEnrolled?.length || 0) - (a.studentsEnrolled?.length || 0))
            .slice(0, 10);
            
        res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCategory,
                mostSellingCourses,
            },
        });

    } catch (error) {
        console.error("Error in categoryPageDetails:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
}