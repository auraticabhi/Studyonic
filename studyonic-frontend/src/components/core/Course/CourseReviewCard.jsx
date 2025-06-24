import React from 'react';
import RatingStars from '../../common/RatingStars';

const CourseReviewCard = ({ review }) => {
  if (!review) return null;

  const { rating, review: reviewText, user } = review;

  return (
    <div className="bg-richblack-800 p-6 rounded-lg shadow-md mb-4">
      <div className="flex items-center gap-3 mb-2">
        <img
          src={
            user?.image
              ? user.image
              : `https://api.dicebear.com/5.x/initials/svg?seed=${user?.firstName} ${user?.lastName}`
          }
          alt={`${user?.firstName} ${user?.lastName}`}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div>
          <p className="text-richblack-5 font-semibold">{`${user?.firstName} ${user?.lastName}`}</p>
          <RatingStars Review_Count={rating} Star_Size={16} />
        </div>
      </div>
      <p className="text-richblack-100">{reviewText}</p>
    </div>
  );
};

export default CourseReviewCard;