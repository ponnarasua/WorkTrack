const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { USER_ROLES } = require('../utils/constants');

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in httpOnly cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Fallback to Authorization header for backward compatibility
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

// Middleware for Admin-only access
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === USER_ROLES.ADMIN) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied, admin only' });
    }
};

module.exports = { protect, adminOnly };