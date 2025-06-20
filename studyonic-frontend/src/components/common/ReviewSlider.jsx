import React, { useEffect, useState } from 'react'
import ReactStars from "react-rating-stars-component"

//import Swiper React components
import {Swiper, SwiperSlide} from "swiper/react"

//import Swiper styles
import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/pagination"
import "../../App.css"

//import required modules
import { Autoplay,FreeMode, Pagination}  from 'swiper/modules'

// Get apiFunction and the endpoint
import { apiConnector } from '../../services/apiconnector'
import { ratingsEndpoints, profileEndpoints } from '../../services/apis'

//icons
import { FaStar } from 'react-icons/fa'


const ReviewSlider = () => {

    const [reviews, setReviews] = useState([]);
    const truncateWords = 15;


    useEffect(() => {
        const fetchAllReviews = async () => {
            try {
                // Step 1: Fetch the raw reviews
                const reviewResponse = await apiConnector("GET", ratingsEndpoints.REVIEWS_DETAILS_API);

                if (!reviewResponse.data.success) {
                    throw new Error("Could not fetch reviews");
                }
                const rawReviews = reviewResponse.data.data;

                // Step 2: If there are reviews, collect all unique user IDs
                if (rawReviews.length > 0) {
                    const userIds = [...new Set(rawReviews.map(review => review.user))];
                    
                    // Step 3: Batch fetch the user details for all reviewers
                    const usersResponse = await apiConnector("POST", profileEndpoints.GET_PUBLIC_USERS_DETAILS_BATCH_API, {
                        userIds: userIds // Assuming you have a batch endpoint
                    });

                    if (!usersResponse.data.success) {
                        throw new Error("Could not fetch reviewer details");
                    }
                    const usersMap = new Map(usersResponse.data.data.map(user => [user._id, user]));

                    // Step 4: Stitch the user data into the reviews
                    const populatedReviews = rawReviews.map(review => ({
                        ...review,
                        user: usersMap.get(review.user) || { firstName: "Unknown", lastName: "User", image: "" }
                    }));

                    setReviews(populatedReviews);
                }

            } catch (error) {
                console.error("Error fetching and composing reviews:", error);
            }
        };
        fetchAllReviews();
    }, []);


  return (
    <div className='text-white'>
    {
        (reviews.length<=0)?<div>No Reviews Found</div>:(
            <div className="my-[50px] h-[184px] max-w-maxContentTab lg:max-w-maxContent">
            <Swiper
            slidesPerView={4}
            spaceBetween={24}
            loop={true}
            freeMode={true}
            autoplay={{
                delay: 2500,
                disableOnInteraction: false,
            }}
            modules={[FreeMode, Pagination, Autoplay]}
            className='w-full'
            >

                {
                    reviews.map((review, index) => (
                        <div key={index}>
                            {
                            review.course!==null&&review.user!==null&&(
                            <SwiperSlide>
                            <div className="flex flex-col gap-3 bg-richblack-800 p-3 text-[14px] text-richblack-25 min-w-max">
                            <div className="flex items-center gap-4">
                            <img
                            src={review.user.image
                             ? review.user.image
                              : `https://api.dicebear.com/5.x/initials/svg?seed=${review.user.firstName} ${review.user.lastName}`}
                              alt='Profile Pic'
                              className='h-9 w-9 object-cover rounded-full'
                            />
                            <div className="flex flex-col">
                            <h1 className="font-semibold text-richblack-5">{review.user.firstName} {review.user.lastName}</h1>
                            <h2 className="text-[12px] font-medium text-richblack-500">{review.course.courseName}</h2>
                            </div>
                            </div>
                            <p className="font-medium text-richblack-25">
                            {review.review.split(" ").length > truncateWords
                               ? `${review.review
                               .split(" ")
                               .slice(0, truncateWords)
                               .join(" ")} ...`
                               : `${review.review}`}
                            </p>
                            <div className="flex items-center gap-2 ">
                            <h3 className="font-semibold text-yellow-100">
                            {review.rating.toFixed(1)}
                            </h3>
                            <ReactStars 
                                count={5}
                                value={review.rating}
                                size={20}
                                edit={false}
                                activeColor="#ffd700"
                                emptyIcon={<FaStar />}
                                fullIcon={<FaStar />}
                            />
                            </div>
                            </div>
                        </SwiperSlide>
                            )
                        }
                        </div>
                    ))
                }
            </Swiper>
        </div>
        )
    }
    </div>
  )
}

export default ReviewSlider
