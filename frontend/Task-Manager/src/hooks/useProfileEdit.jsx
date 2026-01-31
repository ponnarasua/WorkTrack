import { useState, useContext } from 'react';
import { UserContext } from '../context/userContext';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import uploadImage from '../utils/uploadImage';
import logger from '../utils/logger';
import toast from 'react-hot-toast';

/**
 * Custom hook for handling profile editing functionality
 * Reduces code duplication between AdminSettings and UserSettings
 */
export const useProfileEdit = () => {
  const { user, updateUser } = useContext(UserContext);
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editProfilePic, setEditProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  /**
   * Handle profile update with optional image upload
   */
  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsLoading(true);

    try {
      let profileImageUrl = user?.profileImageUrl || '';
      
      // Upload new profile picture if selected
      if (editProfilePic) {
        try {
          const imgUploadRes = await uploadImage(editProfilePic);
          profileImageUrl = imgUploadRes.imageUrl || '';
        } catch (uploadError) {
          logger.error('Image upload failed:', uploadError);
          toast.error('Image upload failed. Updating name only.');
          // Continue with name update even if image upload fails
        }
      }

      // Update user profile
      const userId = user.id || user._id;
      await axiosInstance.put(API_PATHS.USERS.UPDATE_USER(userId), {
        name: editName,
        profileImageUrl,
      });

      // Update context with new user data
      updateUser({ ...user, name: editName, profileImageUrl });
      
      toast.success('Profile updated successfully!');
      setIsEditMode(false);
      setEditProfilePic(null);
      setProfilePicPreview(null);
    } catch (error) {
      logger.error('Profile update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel edit mode and reset all values
   */
  const handleCancelEdit = () => {
    setEditName(user?.name || '');
    setEditProfilePic(null);
    setProfilePicPreview(null);
    setIsEditMode(false);
  };

  /**
   * Handle profile picture file selection
   * @param {File} file - The selected image file
   */
  const handleProfilePicChange = (file) => {
    setEditProfilePic(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePicPreview(null);
    }
  };

  /**
   * Enter edit mode
   */
  const startEditing = () => {
    setEditName(user?.name || '');
    setIsEditMode(true);
  };

  return {
    // State
    user,
    isEditMode,
    isLoading,
    editName,
    setEditName,
    profilePicPreview,
    
    // Actions
    startEditing,
    handleUpdateProfile,
    handleCancelEdit,
    handleProfilePicChange,
  };
};

export default useProfileEdit;
