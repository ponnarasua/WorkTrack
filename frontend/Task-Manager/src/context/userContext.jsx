import React, {createContext, useState, useEffect} from 'react';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import logger from '../utils/logger';

export const UserContext = createContext();

const UserProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading,setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true; // Prevent state updates on unmounted component
        
        // Token is in httpOnly cookie, just try to fetch user
        const fetchUser = async () => {
            try{
                const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
                if (isMounted) {
                    setUser(response.data);
                }
            }catch(error){
                // Only log if it's not a 401 (which is expected when not logged in)
                if (error.response?.status !== 401) {
                    logger.error("Error fetching user profile", error);
                }
                // 401 is expected when not logged in, no action needed
            }finally{
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        fetchUser();
        
        return () => {
            isMounted = false; // Cleanup on unmount
        };
    }, []); // Empty dependency array - only run once on mount

    const updateUser = (userData) => {
        setUser(userData);
        // Token is now in httpOnly cookie, no localStorage needed
        setLoading(false);
    };

    const clearUser = async () => {
        try {
            // Call logout endpoint to clear httpOnly cookie
            await axiosInstance.post(API_PATHS.AUTH.LOGOUT);
        } catch (error) {
            logger.error("Error during logout", error);
        }
        setUser(null);
    };

    return (
        <UserContext.Provider value={{user, loading, updateUser, clearUser}}>
        {children}
        </UserContext.Provider>
    );
}

export default UserProvider;