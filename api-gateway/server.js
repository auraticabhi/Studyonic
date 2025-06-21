const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const { connectRedis } = require('./config/redis');
require('dotenv').config();
const rateLimiter = require('./middleware/rateLimiter');

const { auth } = require('./middleware/auth');

const app = express();
connectRedis();

app.use(cors({ origin: "*", credentials: true }));
app.use(rateLimiter);
app.use(express.json()); 
app.use(cookieParser());

// Service Targets
const USER_SERVICE = process.env.USER_SERVICE_URL;
const COURSE_SERVICE = process.env.COURSE_SERVICE_URL;
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL;
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL;

const forwardRequest = async (req, res, targetUrl) => {
    try {
        // Construct the full URL for the downstream service
        const downstreamUrl = `${targetUrl}${req.originalUrl}`;
        console.log(`[PROXY] Forwarding ${req.method} to ${downstreamUrl}`);
        console.log(`[PROXY] Original Content-Type:`, req.headers['content-type']);

        // Prepare headers for the downstream request
        const headers = { ...req.headers };
        // The host header should be for the target service, not the gateway
        delete headers.host; 
        delete headers['content-length']; // Axios will set this dynamically

        if (req.user) {
            headers['X-User-Id'] = req.user.id;
            headers['X-User-Email'] = req.user.email;
            headers['X-User-Role'] = req.user.accountType;
        }

        let requestData;

        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
            requestData = req; // Stream the original request for file uploads
            console.log(`[PROXY] Forwarding as stream (multipart/form-data)`);
        } else {
            requestData = req.body;
            console.log(`[PROXY] Forwarding as parsed body (JSON/other)`);
        }

        const response = await axios({
            method: req.method,
            url: downstreamUrl,
            headers: headers,
            data: requestData, // Use the conditionally set data
            params: req.query, // Pass query parameters
            maxContentLength: Infinity, // Important for large file uploads
            maxBodyLength: Infinity,    // Important for large file uploads
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            },
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            console.error(`[PROXY ERROR] ${error.response.status} from ${error.config.url}:`, error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            console.error(`[PROXY ERROR] Network or Service Unavailable:`, error.message);
            res.status(503).json({ success: false, message: 'Service unavailable or network error.' });
        }
    }
};

// Logger
app.use((req, res, next) => {
    console.log(`[GATEWAY] ${req.method} ${req.originalUrl}`);
    next();
});

app.post('/api/v1/course/getFullCourseDetails', auth, async (req, res) => {
    console.log('[API Gateway] Composing response for getFullCourseDetails');
    try {
        const { courseId } = req.body;
        // Check if req.user is populated by the auth middleware
        if (!req.user || !req.user.id) {
            console.error("[API Gateway Composition] User not authenticated or ID missing for getFullCourseDetails.");
            return res.status(401).json({ success: false, message: "Authentication required for full course details." });
        }
        const userId = req.user.id;
        const userRole = req.user.accountType; // Get the role from the authenticated user
        
        const internalHeaders = {
            'X-User-Id': userId,
            'X-User-Email': req.user.email,
            'X-User-Role': userRole,
            'Content-Type': 'application/json' // Services expect JSON
        };
         
        // 1. Get course data
        const courseResponse = await axios.post(`${COURSE_SERVICE}/api/v1/course/internal/getEnrolledCourseDetails`, { courseId, userId }, { headers: internalHeaders });
        if (!courseResponse.data?.success) {
            throw new Error(`Failed to fetch course data: ${courseResponse.data?.message || 'Unknown error'}`);
        }
        const courseData = courseResponse.data.data;

        // Ensure courseData is a plain object to prevent Mongoose modification issues
        const courseDataObject = courseData.toObject ? courseData.toObject() : { ...courseData };

        // 2. Get course progress
        let courseProgress = { completedVideos: [] }; // Default empty progress
        try {
            const progressResponse = await axios.post(`${COURSE_SERVICE}/api/v1/course/getCourseProgress`, { courseId, userId }, { headers: internalHeaders });
            if (progressResponse.data?.success) {
                courseProgress = progressResponse.data.data;
            } else {
                console.warn(`[API Gateway Composition] Failed to fetch course progress for user ${userId}: ${progressResponse.data?.message}`);
            }
        } catch (progressError) {
            console.warn(`[API Gateway Composition] Error fetching course progress for user ${userId}: ${progressError.message}`);
        }
        
        // 3. Collect all user IDs to populate
        const userIdsToFetch = new Set();
        if (courseDataObject.instructor) userIdsToFetch.add(courseDataObject.instructor.toString());
        if (courseDataObject.ratingAndReviews) {
            courseDataObject.ratingAndReviews.forEach(review => {
                if(review.user) userIdsToFetch.add(review.user.toString());
            });
        }

        let usersMap = new Map();
        if (userIdsToFetch.size > 0) {
            // 4. Batch fetch user details from User Service
            try {
                const usersResponse = await axios.post(`${USER_SERVICE}/api/v1/profile/getPublicUsersDetailsBatch`, {
                    userIds: Array.from(userIdsToFetch)
                });
                if (!usersResponse.data?.success) {
                    throw new Error(`Failed to fetch user details batch: ${usersResponse.data?.message || 'Unknown error'}`);
                }
                usersResponse.data.data.forEach(user => usersMap.set(user._id.toString(), user));
            } catch (usersError) {
                console.error(`[API Gateway Composition] Error fetching users details batch: ${usersError}`);
                // Proceed without user details if fetch fails, but log the error
            }
        }
        
        // 5. Stitch the data together
        if (courseDataObject.instructor) {
            courseDataObject.instructor = usersMap.get(courseDataObject.instructor.toString()) || { _id: courseDataObject.instructor, name: "Unknown Instructor" };
        }
        if (courseDataObject.ratingAndReviews) {
            courseDataObject.ratingAndReviews.forEach(review => {
                if (review.user) {
                    review.user = usersMap.get(review.user.toString()) || { _id: review.user, name: "Unknown User" };
                }
            });
        }
        
        // 6. Assemble the final payload
        const finalResponseData = {
            courseDetails: courseDataObject,
            completedVideos: courseProgress.completedVideos || [],
            // totalDuration: courseData.totalDuration,
        };

        return res.json({ success: true, data: finalResponseData });

    } catch (error) {
        console.error("[API Gateway Composition Error]", error.message);
        // Log the full error object if available for better debugging
        if (error.response) {
            console.error("[API Gateway Composition Error] Downstream Service Response:", error.response.status, error.response.data);
        }
        return res.status(500).json({ success: false, message: `Could not assemble full course details: ${error.message}` });
    }
});


// GENERIC ROUTING RULES
// 1. PUBLIC ROUTES (No `auth` middleware)
// These routes will directly use forwardRequest.
app.use(['/api/v1/auth/login', '/api/v1/auth/signup', '/api/v1/auth/sendotp', '/api/v1/auth/reset-password-token', '/api/v1/auth/reset-password'], (req, res) => forwardRequest(req, res, USER_SERVICE));
app.use(['/api/v1/course/getAllCourses', '/api/v1/course/getCourseDetails', '/api/v1/course/showAllCategories', '/api/v1/course/getCategoryPageDetails', '/api/v1/course/getReviews'], (req, res) => forwardRequest(req, res, COURSE_SERVICE));
app.use('/api/v1/contact/contactUs', (req, res) => {
    // Manually rewrite path for contactUs as per your route config
    req.originalUrl = '/api/v1/contact'; 
    forwardRequest(req, res, NOTIFICATION_SERVICE)
});
app.use('/api/v1/profile/getPublicUserDetails', (req, res) => forwardRequest(req, res, USER_SERVICE));
//app.use('/api/v1/internal/getUsersDetailsBatch', (req, res) => forwardRequest(req, res, USER_SERVICE));
app.use('/api/v1/profile/getPublicUsersDetailsBatch', (req, res) => forwardRequest(req, res, USER_SERVICE));


// 2. AUTHENTICATED ROUTES
// All requests using these routes will pass through the `auth` middleware first,
// which populates `req.user`, before being passed to `forwardRequest`.
app.use(auth, (req, res, next) => {
    const path = req.originalUrl;

    // IMPORTANT: The special case for getFullCourseDetails is already handled *above* this middleware chain.
    // If a request for /api/v1/course/getFullCourseDetails comes here, it means it didn't match the specific handler.
    // This typically shouldn't happen if the specific handler is defined before `app.use(auth, ...)`.

    if (path.startsWith('/api/v1/course')) {
        return forwardRequest(req, res, COURSE_SERVICE);
    }
    if (path.startsWith('/api/v1/payment')) {
        return forwardRequest(req, res, PAYMENT_SERVICE);
    }
    if (path.startsWith('/api/v1/auth') || path.startsWith('/api/v1/profile')) {
        return forwardRequest(req, res, USER_SERVICE);
    }

    // If no generic rule matches, pass to the 404 handler.
    next();
});

// Fallback for any route not matched by the above rules
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found on API Gateway: ${req.method} ${req.originalUrl}` });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

//Server Initialization
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`API Gateway (manual axios-proxy) is up and running on port ${PORT}`);
});
