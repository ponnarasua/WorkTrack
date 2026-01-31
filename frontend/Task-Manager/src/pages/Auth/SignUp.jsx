import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout'
import { validateEmail } from '../../utils/helper';
import ProfilePhotoSelector from '../../components/Inputs/ProfilePhotoSelector';
import Input from '../../components/Inputs/Input';
import { Link } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { UserContext } from '../../context/userContext';
import uploadImage from '../../utils/uploadImage';

const SignUp = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminInviteToken, setAdminInviteToken] = useState("");
  const [otp, setOtp] = useState("");
  
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  //Handle SignUp Form Submit
  const handleSignUp = async (e) => {
    e.preventDefault();

    let profileImageUrl = '';

    if (!fullName) {
      setError('Please enter your full name');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError("");

    //SignUp API CALL - Step 1: Send OTP
    try {
      setIsLoading(true);

      // Upload profile image if present
      if (profilePic) {
        const imgUploadRes = await uploadImage(profilePic);
        profileImageUrl = imgUploadRes.imageUrl || "";
      }

      const response = await axiosInstance.post(API_PATHS.AUTH.SEND_REGISTRATION_OTP, {
        name: fullName,
        email,
        password,
        profileImageUrl,
        adminInviteToken: adminInviteToken || undefined
      });

      setSuccessMessage(response.data.message || "OTP sent to your email!");
      setShowOtpInput(true);
    } catch (error) {
      if (error.response && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("Something went wrong. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and complete registration
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.VERIFY_REGISTRATION_OTP, {
        email,
        otp,
      });

      const { user } = response.data;

      // Token is now in httpOnly cookie
      updateUser(user);
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch (error) {
      if (error.response && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("Invalid OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setError(null);
    setSuccessMessage("");
    setIsLoading(true);

    let profileImageUrl = "";
    try {
      if (profilePic) {
        const imgUploadRes = await uploadImage(profilePic);
        profileImageUrl = imgUploadRes.imageUrl || "";
      }

      const response = await axiosInstance.post(API_PATHS.AUTH.SEND_REGISTRATION_OTP, {
        name: fullName,
        email,
        password,
        profileImageUrl,
        adminInviteToken: adminInviteToken || undefined
      });

      setSuccessMessage(response.data.message || "OTP resent successfully!");
      setOtp(""); // Clear OTP input
    } catch (error) {
      if (error.response && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("Failed to resend OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className='lg:w-[100%] h-auto md:h-full mt-10 md:mt-0 flex flex-col justify-center'>
        <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Create an Account</h3>
        <p className='text-xs text-slate-700 dark:text-gray-400 mt-[5px] mb-6'>Join us today by entering your details below.</p>

        {!showOtpInput ? (
          <form onSubmit={handleSignUp}>
            <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                label='Full Name'
                placeholder='Full Name'
                type='text'
                disabled={isLoading}
              />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label='Email Address'
                placeholder='john@example.com'
                type='email'
                disabled={isLoading}
              />
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                label='Password'
                placeholder='Min 8 Characters'
                type='password'
                disabled={isLoading}
              />
              <Input
                value={adminInviteToken}
                onChange={(e) => setAdminInviteToken(e.target.value)}
                label='Admin Invite Token (Optional)'
                placeholder='Leave empty for Member role'
                type='text'
                disabled={isLoading}
              />
            </div>
            
            {error && <p className='text-red-500 text-xs pb-2.5 mt-2'>{error}</p>}
            {successMessage && <p className='text-green-500 text-xs pb-2.5 mt-2'>{successMessage}</p>}

            <button type='submit' className='btn-primary' disabled={isLoading}>
              {isLoading ? 'SENDING OTP...' : 'SEND OTP'}
            </button>

            <div className='mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg'>
              <p className='text-xs text-slate-700 dark:text-gray-400'>
                <span className='font-semibold'>Need an Admin Token?</span><br />
                If you need an admin invite token for your organization, please{' '}
                <a 
                  href='mailto:aurixia4@gmail.com?subject=Admin Token Request&body=Hello, I would like to request an admin invite token for my organization.' 
                  className='text-primary font-medium underline hover:text-blue-700'
                >
                  contact us via email
                </a>{' '}
                or ask your organization administrator.
              </p>
            </div>

            <p className='text-[13px] text-slate-700 mt-3'>
              Already have an account?{" "}
              <Link className='font-medium text-primary underline' to='/login'>
                Log In
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className='mb-4'>
              <p className='text-sm text-slate-600 mb-4'>
                We've sent a 6-digit OTP to <strong>{email}</strong>
              </p>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                label='Enter OTP'
                placeholder='000000'
                type='text'
                maxLength={6}
                disabled={isLoading}
              />
            </div>

            {error && <p className='text-red-500 text-xs pb-2.5'>{error}</p>}
            {successMessage && <p className='text-green-500 text-xs pb-2.5'>{successMessage}</p>}

            <button type='submit' className='btn-primary mb-3' disabled={isLoading}>
              {isLoading ? 'VERIFYING...' : 'VERIFY OTP'}
            </button>

            <div className='flex items-center justify-between'>
              <button
                type='button'
                onClick={handleResendOTP}
                className='text-sm text-primary underline'
                disabled={isLoading}
              >
                Resend OTP
              </button>
              <button
                type='button'
                onClick={() => {
                  setShowOtpInput(false);
                  setOtp("");
                  setError(null);
                  setSuccessMessage("");
                }}
                className='text-sm text-slate-600 underline'
                disabled={isLoading}
              >
                Change Email
              </button>
            </div>

            <p className='text-[13px] text-slate-700 mt-3'>
              Already have an account?{" "}
              <Link className='font-medium text-primary underline' to='/login'>
                Log In
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}

export default SignUp