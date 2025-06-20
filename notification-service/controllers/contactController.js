const mailSender = require("../utils/mailSender");

exports.contactUs = async(req, res) => {
    const { firstName, lastName, email, phoneNumber, message } = req.body;
    console.log("Contact Us Request Body: ", req.body);

    if (!firstName || !email || !phoneNumber || !message) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    try {
        // Email to the user
        await mailSender(
            email,
            "Your Message has been Received - Studyonic",
            "Thank you for contacting us. We have received your message and will get back to you shortly."
        );

        // Email to the admin address
        const adminEmailBody = `
            A new contact message has been received:
            <br><br>
            <b>Name:</b> ${firstName} ${lastName || ''}
            <br>
            <b>Email:</b> ${email}
            <br>
            <b>Phone Number:</b> ${phoneNumber}
            <br>
            <b>Message:</b> ${message}
        `;
        await mailSender(
            "abhijeetgupta989@gmail.com", // admin email
            "New Contact Us Message",
            adminEmailBody
        );

        return res.status(200).json({
            success: true,
            message: "Your message has been sent successfully!"
        });

    } catch (err) {
        console.error("Error in contactUs controller: ", err.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while sending the email."
        });
    }
};