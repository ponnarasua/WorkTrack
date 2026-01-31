import React, {createContext, useState, useEffect} from 'react';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import logger from '../utils/logger';

export const UserContext = createContext();

const UserProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading,setLoading] = useState(true);

    useEffect(() => {
        if(user) return;

        // Token is in httpOnly cookie, just try to fetch user
        const fetchUser = async () => {
            try{
                const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
                setUser(response.data);
            }catch(error){
                logger.error("User not authenticated", error);
                // Cookie will be invalid/expired, no action needed
            }finally{
                setLoading(false);
            }
        };
        fetchUser();
    }, [user]);

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