import { API_PATHS } from './apiPaths';
import axiosInstance from './axiosInstance';
import logger from './logger';

const uploadImage = async (imageFile) => {
    const formData = new FormData();
    // Append image file to form data
    formData.append('image', imageFile);

    try{
        const response = await axiosInstance.post(API_PATHS.IMAGE.UPLOAD_IMAGE, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }catch(error){
        logger.error("Error uploading image:", error);
        throw error;
    }
};

export default uploadImage;
