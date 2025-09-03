const express = require('express');
const ForumPost = require('../models/Forum');
const User = require('../models/User');
const router = express.Router();

// Middleware to verify token
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Get all forum posts
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const posts = await ForumPost.find(query)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Transform posts to include like and reply counts
    const transformedPosts = posts.map(post => ({
      ...post.toObject(),
      likes: post.likeCount,
      replies: post.replyCount,
      timestamp: post.createdAt
    }));
    
    res.json(transformedPosts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new forum post
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const post = new ForumPost({
      title: title.trim(),
      content: content.trim(),
      author: req.user.userId,
      authorName: user.name,
      category: category || 'general'
    });
    
    await post.save();
    
    // Return post with counts
    const responsePost = {
      ...post.toObject(),
      likes: 0,
      replies: 0,
      timestamp: post.createdAt
    };
    
    res.status(201).json({
      message: 'Post created successfully',
      post: responsePost
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like/unlike a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const existingLike = post.likes.find(like => 
      like.user.toString() === req.user.userId
    );
    
    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter(like => 
        like.user.toString() !== req.user.userId
      );
    } else {
      // Like
      post.likes.push({ user: req.user.userId });
    }
    
    await post.save();
    
    res.json({
      message: existingLike ? 'Post unliked' : 'Post liked',
      likeCount: post.likeCount,
      isLiked: !existingLike
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add reply to post (only counselors and post author can reply)
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Reply content is required' });
    }
    
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is counselor or post author
    const isPostAuthor = post.author.toString() === req.user.userId;
    const isCounselor = user.role === 'counselor';
    
    if (!isPostAuthor && !isCounselor) {
      return res.status(403).json({ message: 'Only counselors and post authors can reply' });
    }
    
    post.replies.push({
      author: req.user.userId,
      authorName: user.name,
      content: content.trim(),
      isCounselor: user.role === 'counselor'
    });
    
    await post.save();
    
    res.json({
      message: 'Reply added successfully',
      replyCount: post.replyCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single post with replies
router.get('/:id', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'name role')
      .populate('replies.author', 'name role');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const transformedPost = {
      ...post.toObject(),
      likes: post.likeCount,
      replyCount: post.replies.length,
      timestamp: post.createdAt
    };
    
    res.json(transformedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
