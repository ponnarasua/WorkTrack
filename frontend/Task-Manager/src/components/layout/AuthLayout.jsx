import React, { useEffect, useState } from 'react';
import UI_IMG from '../../assets/images/auth-img.png';

const AuthLayout = ({ children }) => {
  const [showImage, setShowImage] = useState(true);

  useEffect(() => {
    const checkWidth = () => {
      const screenWidth = window.screen.width;
      const windowWidth = window.innerWidth;

      // Hide image if window width is 50% or less of the screen width
      setShowImage(windowWidth > screenWidth / 2);
    };

    checkWidth(); // Initial check
    window.addEventListener('resize', checkWidth);

    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  return (
    <div className='flex h-screen bg-white dark:bg-gray-950'>
      <div className={`px-6 pt-8 pb-12 ${showImage ? 'w-full md:w-[60%]' : 'w-full'}`}>
        <h2 className='text-lg font-medium text-gray-900 dark:text-white'>Work Track</h2>
        {children}
      </div>

      {showImage && (
        <div className='flex w-[40%] h-screen items-center justify-center bg-blue-50 dark:bg-gray-900 bg-[url("/bg-img.png")] bg-cover bg-no-repeat bg-center p-8'>
          <img src={UI_IMG} className='w-64 lg:w-[90%]' />
        </div>
      )}
    </div>
  );
};

export default AuthLayout;


// import React from 'react';
// import UI_IMG from '../../assets/images/auth-img.png';

// const AuthLayout = ({ children }) => {
//   return (
//     <div className='flex'>
//       <div className='w-screen h-screen md:w-[60wv] px-12 pt-8 pb-12'>
//         <h2 className='text-lg font-medium text-black'>Work Track</h2>
//         {children}
//       </div>
//       <div className="hidden md:flex w-[60vw] h-screen items-center justify-center bg-blue-50 bg-[url('/bg-img.png')] bg-cover bg-no-repeat bg-center overflow-hidden p-8">
//         <img src={UI_IMG} className='w-64 lg:w-[90%]'/>
//       </div>
//     </div>
//   )
// }

// export default AuthLayout;