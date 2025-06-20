const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.auth = (req, res, next) => {
    try {
        // Extract token from various possible locations
        const token = req.cookies.token 
                      || (req.body && req.body.token)
                      || (req.header("Authorization") && req.header("Authorization").replace("Bearer ", ""));

        // Debugging Log
        // console.log("[API Gateway Auth] Attempting to authenticate...");
        // console.log("[API Gateway Auth] Token found:", token ? "YES" : "NO");
        // console.log("[API Gateway Auth] From Header:", req.header("Authorization"));
        // console.log("[API Gateway Auth] From Body:", req.body && req.body.token);
        // console.log("[API Gateway Auth] From Cookies:", req.cookies.token);
        // End Debugging Log

        if (!token) {
            console.warn("[API Gateway Auth] No token found in header, body, or cookies.");
            return res.status(401).json({ success: false, message: "Authorization token is missing." });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = decoded; // Attach decoded user payload
        //console.log("[API Gateway Auth] Token successfully decoded. User:", req.user);
        next();

    } catch (err) {
        console.error("[API Gateway Auth] Token verification failed:", err.message); // error log
        // This catches JWT errors (expired, invalid, etc.)
        return res.status(401).json({ success: false, message: "Token is invalid or expired." });
    }
};