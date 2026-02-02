import axios from 'axios';
import toast from 'react-hot-toast';
import { BASE_URL } from './apiPaths';

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Include credentials (cookies) in request
});

//Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        // Cookies are automatically sent with withCredentials: true
        // No need to manually add Authorization header
        return config;
    
},
    (error) => {
        return Promise.reject(error);
    }
);

//Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors globally
        if(error.response){
            if(error.response.status === 401){
                // Only redirect to login if not already on auth pages and not the profile check
                const currentPath = window.location.pathname;
                const isAuthPage = currentPath === '/login' || currentPath === '/signup' || currentPath === '/forgot-password';
                const isProfileCheck = error.config?.url?.includes('/auth/profile');
                
                // Don't redirect if on auth page or if it's just a profile check failing
                if (!isAuthPage && !isProfileCheck) {
                    window.location.href = '/login';
                }
            }else if(error.response.status === 500){
                // Handle server error
                toast.error('Internal server error. Please try again later.');
            }else if(error.response.status === 503){
                // Handle service unavailable
                toast.error('Service temporarily unavailable. Please try again later.');
            }
        }else if(error.code === 'ECONNABORTED'){
            // Handle request timeout
            toast.error('Request timed out. Please check your internet connection and try again.');
        }else if(error.code === 'ERR_NETWORK' || !navigator.onLine){
            // Handle network error (no internet connection)
            toast.error('No internet connection. Please check your network and try again.');
        }else if(error.request){
            // Request was made but no response received
            toast.error('Unable to reach server. Please try again later.');
        }
        return Promise.reject(error);
    }
);
    
export default axiosInstance;