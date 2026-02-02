const rateLimit = require('express-rate-limit');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 10, // Limit each IP to 10 login requests per 2 minutes
    message: {
        message: 'Too many login attempts from this IP, please try again after 2 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count successful requests
});

// Rate limiter for registration attempts
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 registration requests per 15 minutes
    message: {
        message: 'Too many registration attempts from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for profile endpoint during development
    skip: (req) => {
        // Skip profile endpoint to avoid blocking during development
        if (req.path === '/auth/profile' && process.env.NODE_ENV === 'development') {
            return true;
        }
        return false;
    }
});

// Strict rate limiter for sensitive operations
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
        message: 'Too many requests, please slow down'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    loginLimiter,
    registerLimiter,
    apiLimiter,
    strictLimiter,
};
