const express = require("express");
const router = express.Router();
const { capturePayment, verifyPayment } = require("../controllers/Payments");
const { isStudent } = require("../middleware/authz");

router.post("/capturePayment", isStudent, capturePayment);
router.post("/verifyPayment", isStudent, verifyPayment);

module.exports = router;