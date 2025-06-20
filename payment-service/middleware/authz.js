exports.isStudent = (req, res, next) => {
    if (req.header('X-User-Role') !== 'Student') {
        return res.status(403).json({ success: false, message: 'Forbidden: Student role required for payments.' });
    }
    next();
};