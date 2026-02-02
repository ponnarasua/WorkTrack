import React, {useState, useContext, useRef, useEffect} from 'react';
import { HiOutlineMenuAlt3, HiOutlineX } from 'react-icons/hi';
import { LuPanelLeftClose, LuPanelLeft, LuSettings, LuLogOut } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import SideMenu from './SideMenu';
import { UserContext } from '../../context/userContext';
import ThemeToggle from '../ThemeToggle';
import NotificationBell from '../NotificationBell';
import { getInitials } from '../../utils/colors';

const Navbar = ({activeMenu, toggleSidebar, sidebarOpen}) => {
    const [openSideMenu, setOpenSideMenu] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const { user, clearUser } = useContext(UserContext);
    const profileDropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        clearUser();
        navigate('/login');
    };

    const handleSettings = () => {
        const settingsPath = user?.role === 'admin' ? '/admin/settings' : '/user/settings';
        navigate(settingsPath);
        setProfileDropdownOpen(false);
    };

    return (
        <>
            <div className='flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-3 px-7 fixed top-0 left-0 right-0 z-30 shadow-sm'>
                <div className='flex items-center gap-5'>
                    {/* Mobile menu toggle */}
                    <button 
                        className='block lg:hidden text-gray-700 dark:text-gray-200 hover:text-primary transition-colors'
                        onClick={() => setOpenSideMenu(!openSideMenu)}
                    >
                        {openSideMenu ? (
                            <HiOutlineX className='text-2xl' /> 
                        ) : (
                            <HiOutlineMenuAlt3 className='text-2xl' />
                        )} 
                    </button>
                    
                    {/* Desktop sidebar toggle */}
                    <button 
                        className='hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150'
                        onClick={toggleSidebar}
                        title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                    >
                        {sidebarOpen ? (
                            <LuPanelLeftClose className='text-lg' />
                        ) : (
                            <LuPanelLeft className='text-lg' />
                        )}
                    </button>
                    
                    <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Work Track</h2>
                </div>
                
                {/* Right side - Notifications, Theme Toggle & Profile Avatar */}
                <div className='flex items-center gap-4'>
                    {/* Notification Bell */}
                    <NotificationBell />

                    {/* Theme Toggle */}
                    <div className="flex items-center justify-center">
                        <ThemeToggle />
                    </div>

                    {/* Profile Avatar with Dropdown */}
                    <div className="relative" ref={profileDropdownRef}>
                        <button
                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            className="focus:outline-none"
                        >
                            {user?.profileImageUrl ? (
                                <img 
                                    src={user.profileImageUrl} 
                                    alt="Profile" 
                                    className='w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700 cursor-pointer hover:ring-primary transition-all duration-150'
                                />
                            ) : (
                                <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm cursor-pointer hover:bg-primary/90 transition-colors'>
                                    {getInitials(user?.name)}
                                </div>
                            )}
                        </button>

                        {/* Profile Dropdown */}
                        {profileDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                                {/* User Info */}
                                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                                    {user?.role === 'admin' && (
                                        <span className="inline-block mt-1 text-[10px] font-semibold text-white bg-primary px-2 py-0.5 rounded-full">
                                            Admin
                                        </span>
                                    )}
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <button
                                        onClick={handleSettings}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <LuSettings className="text-lg text-gray-500 dark:text-gray-400" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <LuLogOut className="text-lg" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Side Menu */}
            {openSideMenu && (
                <div className='fixed top-[61px] left-0 bg-white dark:bg-gray-900 shadow-xl border-r border-gray-100 dark:border-gray-800 z-40 lg:hidden'>
                    <SideMenu activeMenu={activeMenu} />
                </div>
            )}
        </>
    );
};

export default Navbar;
