import { toast } from "react-hot-toast";
//import rzpLogo from "../../assets/Logo/rzp_logo.png"

import { studentEndpoints } from "../apis";
import { apiConnector } from "../apiconnector";
import { setPaymentLoading } from "../../slices/courseSlice";
import { resetCart, removeFromCart } from "../../slices/cartSlice";


const { COURSE_PAYMENT_API, COURSE_VERIFY_API, SEND_PAYMENT_SUCCESS_EMAIL_API } = studentEndpoints;

function loadScript(src) {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;

        script.onload = () => {
            resolve(true);
        }
        script.onerror = () => {
            resolve(false);
        }
        document.body.appendChild(script);
    })
}

export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
    const toastId = toast.loading("Loading...");
    try {
        //load the script
        const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

        if (!res) {
            toast.error("Razorpay SDK failed to load. Check your Internet Connection.");
            return;
        }

        //initiate the order
        const orderResponse = await apiConnector("POST", COURSE_PAYMENT_API, { courses }, {
            Authorization: `Bearer ${token}`,
        });

        if (!orderResponse.data.success) {
            throw new Error(orderResponse.data.message);
        }
        console.log("PRINTING orderResponse", orderResponse);

        // Access the Razorpay order object from the correct path
        const razorpayOrder = orderResponse.data.data;
        
        //options
        const options = {
            key: process.env.REACT_APP_RAZORPAY_KEY,
            currency: razorpayOrder.currency,
            amount: `${razorpayOrder.amount}`,
            order_id: razorpayOrder.id,
            name: "Studyonic",
            description: "Thank You for Purchasing the Course",
            image: "https://api.dicebear.com/5.x/initials/svg?seed=S%20N",
            prefill: {
                name: `${userDetails.firstName}`,
                email: userDetails.email
            },
            handler: function(response) {
                // Pass the amount from the server-generated order to the success handlers
                //sendPaymentSuccessEmail(response, razorpayOrder.amount, token);
                verifyPayment({...response, courses, amount: razorpayOrder.amount }, token, navigate, dispatch);
            }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        paymentObject.on("payment.failed", function(response) {
            toast.error("Oops, payment failed");
            console.log(response.error);
        });

    } catch (error) {
        console.log("PAYMENT API ERROR.....", error);
        toast.error("Could not make Payment. Please try again.");
    }
    toast.dismiss(toastId);
}

// async function sendPaymentSuccessEmail(response, amount, token) {
//     try {
//         await apiConnector("POST", SEND_PAYMENT_SUCCESS_EMAIL_API, {
//             orderId: response.razorpay_order_id,
//             paymentId: response.razorpay_payment_id,
//             amount,
//         }, {
//             Authorization: `Bearer ${token}`
//         })
//     } catch (error) {
//         console.log("PAYMENT SUCCESS EMAIL ERROR....", error);
//     }
// }

//verify payment
async function verifyPayment(bodyData, token, navigate, dispatch) {
    const toastId = toast.loading("Verifying Payment....");
    dispatch(setPaymentLoading(true));
    try {
        const response = await apiConnector("POST", COURSE_VERIFY_API, bodyData, {
            Authorization: `Bearer ${token}`,
        })

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        toast.success("Payment Successful, you are addded to the course");
        navigate("/dashboard/enrolled-courses");
        console.log("LERes: ", response);
        if (response.data.courses.length > 1)
            dispatch(resetCart());
        else {
            dispatch(removeFromCart(response.data.courses[0]));
        }
    } catch (error) {
        console.log("PAYMENT VERIFY ERROR....", error);
        toast.error("Could not verify Payment");
    }
    toast.dismiss(toastId);
    dispatch(setPaymentLoading(false));
}