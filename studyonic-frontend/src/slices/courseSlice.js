import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    step: 1,
    course: null,
    editCourse: false,
    paymentLoading: false,
}

const courseSlice = createSlice({
    name: "course",
    initialState,
    reducers: {
        setStep: (state, action) => {
            state.step = action.payload
        },
        setCourse: (state, action) => {
            const newCourseData = action.payload;

            // On initial load or if the payload is null, just set the course
            if (!state.course || newCourseData === null) {
                state.course = newCourseData;
                return;
            }

            // This is an update. We need to merge intelligently.
            // Start with the existing state, then overwrite with new fields.
            const updatedCourse = { ...state.course, ...newCourseData };

            // The backend 'editCourse' response returns courseContent as an array of IDs (strings).
            // The 'getFullCourseDetails' response returns it as an array of objects.
            // If the incoming courseContent is just IDs, we must preserve the
            // existing, fully populated courseContent from our state.
            if (
                newCourseData.courseContent &&
                newCourseData.courseContent.length > 0 &&
                typeof newCourseData.courseContent[0] === 'string'
            ) {
                // The new data is partial, so keep the old, detailed courseContent.
                updatedCourse.courseContent = state.course.courseContent;
            }
            
            state.course = updatedCourse;
        },
        setEditCourse: (state, action) => {
            state.editCourse = action.payload
        },
        setPaymentLoading: (state, action) => {
            state.paymentLoading = action.payload
        },
        resetCourseState: (state) => {
            state.step = 1
            state.course = null
            state.editCourse = false
        },
    },
})

export const {
    setStep,
    setCourse,
    setEditCourse,
    setPaymentLoading,
    resetCourseState,
} = courseSlice.actions

export default courseSlice.reducer