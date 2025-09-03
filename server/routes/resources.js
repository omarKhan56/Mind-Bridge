const express = require('express');
const jwt = require('jsonwebtoken');
const Resource = require('../models/Resource');
const User = require('../models/User');
const router = express.Router();

// Get all resources
router.get('/', async (req, res) => {
  try {
    const { category, type, language } = req.query;
    const filter = { isPublic: true };
    
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (language) filter.language = language;
    
    const resources = await Resource.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single resource and track view
router.get('/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('createdBy', 'name');
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    // Increment view count
    resource.viewCount += 1;
    await resource.save();
    
    // Track user access if authenticated
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        await User.findByIdAndUpdate(decoded.userId, {
          $addToSet: { resourcesAccessed: resource._id }
        });
      } catch (err) {
        // Continue without tracking if token is invalid
      }
    }
    
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rate resource
router.post('/:id/rate', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const { rating } = req.body;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const resource = await Resource.findById(req.params.id);
    
    // Calculate new average rating
    const newRatingCount = resource.ratingCount + 1;
    const newRating = ((resource.rating * resource.ratingCount) + rating) / newRatingCount;
    
    resource.rating = newRating;
    resource.ratingCount = newRatingCount;
    await resource.save();
    
    res.json({ rating: resource.rating, ratingCount: resource.ratingCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create resource (admin/counselor only)
router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    if (decoded.role !== 'admin' && decoded.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const resource = new Resource({
      ...req.body,
      createdBy: decoded.userId
    });
    
    await resource.save();
    await resource.populate('createdBy', 'name');
    
    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
