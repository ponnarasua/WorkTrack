const express = require('express')
const { registerUser, loginUser, getUserProfile, updateUserProfile, logoutUser } = require('../controllers/authController');
const { 
    sendRegistrationOTPHandler,
    verifyRegistrationOTPHandler,
    forgotPasswordHandler,
    resetPasswordHandler,
    deleteAccountRequestHandler,
    confirmDeleteAccountHandler
} = require('../controllers/otpController');
const { protect } = require('../middlewares/authMiddleware');
const { 
    validateRegistration, 
    validateLogin,
    validateOTPVerification,
    validateForgotPassword,
    validateResetPassword,
    validateDeleteAccountOTP
} = require('../utils/validation');
const { loginLimiter, registerLimiter, strictLimiter } = require('../middlewares/rateLimiter');
const upload = require('../middlewares/uploadMiddleware');
const cloudinary = require('../config/cloudinary');
const router = express.Router();

// Auth Routes (Legacy - kept for backward compatibility)
router.post('/register', registerLimiter, validateRegistration, registerUser);
router.post('/login', loginLimiter, validateLogin, loginUser);
router.post('/logout', protect, logoutUser);

// OTP-based Registration Routes
router.post('/send-registration-otp', registerLimiter, validateRegistration, sendRegistrationOTPHandler);
router.post('/verify-registration-otp', validateOTPVerification, verifyRegistrationOTPHandler);

// Password Reset Routes
router.post('/forgot-password', strictLimiter, validateForgotPassword, forgotPasswordHandler);
router.post('/reset-password', validateResetPassword, resetPasswordHandler);

// Account Deletion Routes
router.post('/delete-account-request', protect, deleteAccountRequestHandler);
router.post('/confirm-delete-account', protect, validateDeleteAccountOTP, confirmDeleteAccountHandler);

// Profile Routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    // Convert buffer to base64 string
    const base64Str = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Str, {
      folder: 'your_folder_name', // optional: categorize uploads
      resource_type: 'image',
    });

    // Respond with secure URL
    res.status(200).json({ imageUrl: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Cloudinary upload failed' });
  }
});

module.exports = router;