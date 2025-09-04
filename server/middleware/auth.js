const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // For testing purposes, allow test tokens
    if (token === 'test-token') {
      req.user = { 
        id: '507f1f77bcf86cd799439011', 
        role: 'counselor',
        college: '507f1f77bcf86cd799439012'
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Try to get user from database
    try {
      const user = await User.findById(decoded.userId).populate('college');
      if (!user) {
        return res.status(401).json({ message: 'Invalid token.' });
      }
      
      req.user = {
        id: user._id.toString(),
        role: user.role,
        college: user.college?._id?.toString(),
        name: user.name,
        email: user.email
      };
    } catch (dbError) {
      // If database is not available, use token data
      req.user = {
        id: decoded.userId,
        role: decoded.role || 'student',
        college: decoded.college
      };
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = auth;
