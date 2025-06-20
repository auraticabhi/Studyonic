exports.isInstructor = (req, res, next) => {
    if (req.header('X-User-Role') !== 'Instructor') {
        return res.status(403).json({ success: false, message: 'Forbidden: Instructor role required.' });
    }
    next();
};
exports.isStudent = (req, res, next) => {
    if (req.header('X-User-Role') !== 'Student') {
        return res.status(403).json({ success: false, message: 'Forbidden: Student role required.' });
    }
    next();
};
exports.isAdmin = (req, res, next) => {
    if (req.header('X-User-Role') !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin role required.' });
    }
    next();
};