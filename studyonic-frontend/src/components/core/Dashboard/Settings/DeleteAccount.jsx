import { FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState } from "react"; // Import useState

import { deleteProfile } from "../../../../services/operations/SettingsAPI";
import ConfirmationModal from "../../../common/ConfirmationModal"; // Adjust path if necessary

export default function DeleteAccount() {
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State to manage the confirmation modal
  const [confirmationModal, setConfirmationModal] = useState(null);

  async function handleDeleteAccount() {
    // Show the confirmation modal instead of directly calling deleteProfile
    setConfirmationModal({
      text1: "Are you sure?",
      text2: "Your account and all associated data will be permanently deleted.",
      btn1Text: "Delete Account",
      btn2Text: "Cancel",
      btn1Handler: () => {
        // Only proceed with deletion if confirmed
        dispatch(deleteProfile(token, navigate));
        setConfirmationModal(null); // Close modal after action
      },
      btn2Handler: () => setConfirmationModal(null), // Close modal on cancel
    });
  }

  return (
    <>
      <div className="my-10 flex flex-row gap-x-5 rounded-md border-[1px] border-pink-700 bg-pink-900 p-8 px-12">
        <div className="flex aspect-square h-14 w-14 items-center justify-center rounded-full bg-pink-700">
          <FiTrash2 className="text-3xl text-pink-200" />
        </div>
        <div className="flex flex-col space-y-2">
          <h2 className="text-lg font-semibold text-richblack-5">
            Delete Account
          </h2>
          <div className="w-3/5 text-pink-25">
            <p>Would you like to delete account?</p>
            <p>
              This account may contain Paid Courses. Deleting your account is
              permanent and will remove all the content associated with it.
            </p>
          </div>
          <button
            type="button"
            className="w-fit cursor-pointer italic text-pink-300"
            onClick={handleDeleteAccount} // This will now open the modal
          >
            I want to delete my account.
          </button>
        </div>
      </div>

      {/* Render the ConfirmationModal if confirmationModal state is not null */}
      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  );
}