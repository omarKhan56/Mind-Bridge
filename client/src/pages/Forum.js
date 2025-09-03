import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Search, Filter, Heart, MessageCircle, Clock, User, Tag, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';

const Forum = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general' });
  const [showNewPost, setShowNewPost] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [postReplies, setPostReplies] = useState([]);

  const categories = [
    { id: 'all', name: 'All Posts', color: 'bg-gray-100 text-gray-800', icon: '💬' },
    { id: 'general', name: 'General Support', color: 'bg-blue-100 text-blue-800', icon: '🤝' },
    { id: 'anxiety', name: 'Anxiety', color: 'bg-orange-100 text-orange-800', icon: '😰' },
    { id: 'depression', name: 'Depression', color: 'bg-purple-100 text-purple-800', icon: '💙' },
    { id: 'stress', name: 'Academic Stress', color: 'bg-green-100 text-green-800', icon: '📚' },
    { id: 'relationships', name: 'Relationships', color: 'bg-red-100 text-red-800', icon: '❤️' }
  ];

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, searchTerm]);

  const loadPosts = async () => {
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;
      
      const token = localStorage.getItem('token');
      const config = {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      };
      
      const response = await axios.get('/api/forum', config);
      setPosts(response.data || mockPosts);
    } catch (error) {
      console.error('Failed to load posts:', error);
      setPosts(mockPosts);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/forum', newPost, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewPost({ title: '', content: '', category: 'general' });
      setShowNewPost(false);
      loadPosts();
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post. Please try again.');
    }
  };

  const handleViewPost = async (post) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/forum/${post._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSelectedPost(response.data);
      setPostReplies(response.data.replies || []);
      setShowReplies(true);
    } catch (error) {
      console.error('Failed to load post details:', error);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/forum/${selectedPost._id}/reply`, 
        { content: replyContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setReplyContent('');
      // Reload post details to get updated replies
      handleViewPost(selectedPost);
      // Update posts list to reflect new reply count
      loadPosts();
      toast.success('Reply added successfully!');
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast.error(error.response?.data?.message || 'Failed to add reply');
    }
  };

  const canReply = (post) => {
    if (!user) return false;
    const isPostAuthor = post.author?._id === user.id || post.author === user.id;
    const isCounselor = user.role === 'counselor';
    return isPostAuthor || isCounselor;
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  // Mock data for demonstration
  const mockPosts = [
    {
      _id: '1',
      title: 'Dealing with exam anxiety - any tips?',
      content: 'I have my finals coming up and I\'m feeling really overwhelmed. Has anyone found effective ways to manage exam anxiety?',
      category: 'anxiety',
      author: { name: 'Anonymous Student', isAnonymous: true },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      replies: 12,
      likes: 8,
      isLiked: false
    },
    {
      _id: '2',
      title: 'Study group for psychology students',
      content: 'Looking to form a study group for Psych 101. Anyone interested in meeting weekly to review materials and support each other?',
      category: 'general',
      author: { name: 'Sarah M.', isAnonymous: false },
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      replies: 6,
      likes: 15,
      isLiked: true
    },
    {
      _id: '3',
      title: 'Feeling isolated and need support',
      content: 'I\'ve been struggling with feeling disconnected from others lately. It\'s hard to reach out but I know I need to. Any advice on building connections?',
      category: 'relationships',
      author: { name: 'Anonymous', isAnonymous: true },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      replies: 18,
      likes: 23,
      isLiked: false
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <MessageSquare className="h-8 w-8 text-white" />
          </motion.div>
          <p className="text-lg text-gray-600">Loading forum...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Community Forum</h1>
              <p className="text-gray-600">Connect, share, and support each other ({posts.length} posts)</p>
            </div>
          </div>
          <Button onClick={() => setShowNewPost(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </motion.div>

        {/* Search and Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="mb-8 backdrop-blur-sm bg-white/80 border-white/20">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search posts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className={selectedCategory === category.id ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                    >
                      <span className="mr-1">{category.icon}</span>
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Posts Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4 mb-8"
        >
          <AnimatePresence>
            {posts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className="text-center p-12 backdrop-blur-sm bg-white/80 border-white/20">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                  <p className="text-gray-500 mb-4">Be the first to start a conversation!</p>
                  <Button onClick={() => setShowNewPost(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    Create First Post
                  </Button>
                </Card>
              </motion.div>
            ) : (
              posts.map((post, index) => {
                const categoryInfo = getCategoryInfo(post.category);
                return (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <Card className="backdrop-blur-sm bg-white/80 border-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={categoryInfo.color}>
                                <span className="mr-1">{categoryInfo.icon}</span>
                                {categoryInfo.name}
                              </Badge>
                              <div className="flex items-center text-xs text-gray-500 gap-2">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(post.createdAt)}
                              </div>
                            </div>
                            <CardTitle className="text-lg leading-tight hover:text-indigo-600 transition-colors">
                              {post.title}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.content}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {post.author?.isAnonymous ? 'Anonymous' : post.author?.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {post.replies || 0} replies
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className={`h-3 w-3 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                              {post.likes || 0} likes
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-indigo-600 hover:text-indigo-700"
                            onClick={() => handleViewPost(post)}
                          >
                            View Discussion
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>

        {/* New Post Modal */}
        <AnimatePresence>
          {showNewPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Create New Post</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewPost(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <form onSubmit={handleSubmitPost} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newPost.title}
                        onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                        placeholder="What's on your mind?"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        value={newPost.category}
                        onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {categories.slice(1).map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="content">Content</Label>
                      <textarea
                        id="content"
                        value={newPost.content}
                        onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows="6"
                        placeholder="Share your thoughts, ask questions, or offer support..."
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowNewPost(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                        Post
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post Replies Modal */}
        <AnimatePresence>
          {showReplies && selectedPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Discussion</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReplies(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Original Post */}
                  <Card className="mb-6 bg-indigo-50 border-indigo-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryInfo(selectedPost.category).color}>
                            <span className="mr-1">{getCategoryInfo(selectedPost.category).icon}</span>
                            {getCategoryInfo(selectedPost.category).name}
                          </Badge>
                          <div className="flex items-center text-xs text-gray-500 gap-2">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(selectedPost.createdAt)}
                          </div>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{selectedPost.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{selectedPost.content}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {selectedPost.author?.name || 'Anonymous'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {selectedPost.likes || 0} likes
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Replies Section */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-semibold text-gray-800">
                      Replies ({postReplies.length})
                    </h3>
                    
                    {postReplies.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No replies yet. Be the first to respond!</p>
                      </div>
                    ) : (
                      postReplies.map((reply, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className={reply.isCounselor ? "bg-blue-50 border-blue-200" : "bg-gray-50"}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <User className="h-3 w-3" />
                                  {reply.authorName}
                                </div>
                                {reply.isCounselor && (
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                    Counselor
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeAgo(reply.createdAt)}
                                </div>
                              </div>
                              <p className="text-gray-700">{reply.content}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Reply Form */}
                  {canReply(selectedPost) ? (
                    <Card className="bg-gray-50">
                      <CardContent className="p-4">
                        <form onSubmit={handleSubmitReply} className="space-y-3">
                          <Label htmlFor="reply">Add a reply</Label>
                          <textarea
                            id="reply"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows="3"
                            placeholder="Share your thoughts or offer support..."
                            required
                          />
                          <div className="flex justify-end">
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                              Reply
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-yellow-800 text-sm">
                          Only counselors and the post author can reply to this discussion.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Forum;
