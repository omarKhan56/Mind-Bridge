import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Play, FileText, Headphones, Star, Clock, Users, BookOpen, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    language: 'en'
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    type: '',
    url: '',
    duration: '',
    difficulty: 'Beginner',
    tags: ''
  });

  useEffect(() => {
    loadResources();
    getUserRole();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, filters, searchTerm]);

  const getUserRole = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role || '');
  };

  const loadResources = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = userRole === 'counselor' ? '/api/counselor/resources' : '/api/resources';
      const response = await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setResources(response.data || mockResources);
    } catch (error) {
      console.error('Failed to load resources:', error);
      setResources(mockResources);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const resourceData = {
        ...formData,
        duration: formData.duration ? parseInt(formData.duration) * 60 : null,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      if (editingResource) {
        await axios.put(`/api/counselor/resources/${editingResource._id}`, resourceData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Resource updated successfully!');
      } else {
        await axios.post('/api/counselor/resources', resourceData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Resource created successfully!');
      }

      loadResources();
      resetForm();
    } catch (error) {
      console.error('Failed to save resource:', error);
      toast.error(error.response?.data?.message || 'Failed to save resource');
    }
  };

  const handleDeleteResource = (resource) => {
    setResourceToDelete(resource);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteResource = async () => {
    if (!resourceToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/counselor/resources/${resourceToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadResources();
      toast.success('Resource deleted successfully!');
    } catch (error) {
      console.error('Failed to delete resource:', error);
      toast.error('Failed to delete resource');
    } finally {
      setDeleteDialogOpen(false);
      setResourceToDelete(null);
    }
  };

  const handleEditResource = (resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      type: resource.type,
      url: resource.url || '',
      duration: resource.duration ? Math.floor(resource.duration / 60).toString() : '',
      difficulty: resource.difficulty || 'Beginner',
      tags: resource.tags ? resource.tags.join(', ') : ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      type: '',
      url: '',
      duration: '',
      difficulty: 'Beginner',
      tags: ''
    });
    setEditingResource(null);
    setShowAddModal(false);
  };

  const filterResources = () => {
    let filtered = resources;
    
    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category);
    }
    
    if (filters.type) {
      filtered = filtered.filter(r => r.type === filters.type);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredResources(filtered);
  };

  const handleResourceClick = async (resource) => {
    try {
      await axios.get(`/api/resources/${resource._id}`);
      if (resource.url) {
        window.open(resource.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to track resource view:', error);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      video: <Play className="h-5 w-5" />,
      audio: <Headphones className="h-5 w-5" />,
      article: <FileText className="h-5 w-5" />,
      guide: <BookOpen className="h-5 w-5" />,
      exercise: <Users className="h-5 w-5" />
    };
    return icons[type] || <BookOpen className="h-5 w-5" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      anxiety: 'bg-orange-100 text-orange-800',
      depression: 'bg-blue-100 text-blue-800',
      stress: 'bg-red-100 text-red-800',
      sleep: 'bg-purple-100 text-purple-800',
      relationships: 'bg-green-100 text-green-800',
      academic: 'bg-yellow-100 text-yellow-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Mock data for demonstration
  const mockResources = [
    {
      _id: '1',
      title: 'Mindfulness Meditation for Beginners',
      description: 'Learn the basics of mindfulness meditation to reduce stress and anxiety.',
      category: 'anxiety',
      type: 'video',
      duration: 900,
      viewCount: 1250,
      rating: 4.8,
      ratingCount: 89,
      difficulty: 'Beginner',
      tags: ['meditation', 'mindfulness', 'stress-relief'],
      url: 'https://example.com/meditation'
    },
    {
      _id: '2',
      title: 'Sleep Hygiene Guide',
      description: 'Evidence-based strategies for better sleep quality and mental health.',
      category: 'sleep',
      type: 'article',
      duration: 600,
      viewCount: 890,
      rating: 4.6,
      ratingCount: 67,
      difficulty: 'Beginner',
      tags: ['sleep', 'wellness', 'habits']
    },
    {
      _id: '3',
      title: 'Breathing Exercises for Anxiety',
      description: 'Quick breathing techniques to manage anxiety and panic attacks.',
      category: 'anxiety',
      type: 'exercise',
      duration: 300,
      viewCount: 2100,
      rating: 4.9,
      ratingCount: 156,
      difficulty: 'Beginner',
      tags: ['breathing', 'anxiety', 'quick-relief']
    },
    {
      _id: '4',
      title: 'Managing Academic Stress',
      description: 'Strategies for balancing studies and mental wellbeing.',
      category: 'academic',
      type: 'guide',
      duration: 1200,
      viewCount: 756,
      rating: 4.7,
      ratingCount: 43,
      difficulty: 'Intermediate',
      tags: ['study', 'stress', 'balance']
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <BookOpen className="h-8 w-8 text-white" />
          </motion.div>
          <p className="text-lg text-gray-600">Loading resources...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Mental Health Resources</h1>
              <p className="text-gray-600">Curated content to support your wellness journey ({filteredResources.length} resources)</p>
            </div>
          </div>
          {userRole === 'counselor' && (
            <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </Button>
          )}
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="mb-8 backdrop-blur-sm bg-white/80 border-white/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search resources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    <option value="anxiety">Anxiety</option>
                    <option value="depression">Depression</option>
                    <option value="stress">Stress Management</option>
                    <option value="sleep">Sleep</option>
                    <option value="relationships">Relationships</option>
                    <option value="academic">Academic Stress</option>
                    <option value="general">General Wellness</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="video">Videos</option>
                    <option value="audio">Audio</option>
                    <option value="article">Articles</option>
                    <option value="guide">Guides</option>
                    <option value="exercise">Exercises</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Resources Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
        >
          {filteredResources.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-full"
            >
              <Card className="text-center p-12 backdrop-blur-sm bg-white/80 border-white/20">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </Card>
            </motion.div>
          ) : (
            filteredResources.map((resource, index) => (
              <motion.div
                key={resource._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card 
                  className="h-full cursor-pointer backdrop-blur-sm bg-white/80 border-white/20 hover:shadow-lg transition-all duration-300"
                  onClick={() => handleResourceClick(resource)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                          {getTypeIcon(resource.type)}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg leading-tight">{resource.title}</CardTitle>
                        </div>
                      </div>
                      <Badge className={getCategoryColor(resource.category)}>
                        {resource.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{resource.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-3">
                        {resource.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.floor(resource.duration / 60)}min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {resource.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {resource.rating?.toFixed(1)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {resource.difficulty}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {resource.tags && resource.tags.length > 0 && 
                          resource.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        }
                      </div>
                      {userRole === 'counselor' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditResource(resource);
                            }}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteResource(resource);
                            }}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Featured Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Featured This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: <Users className="h-6 w-6" />, title: 'Mindfulness for Students', desc: 'Learn simple meditation techniques to reduce stress and improve focus', color: 'from-blue-500 to-cyan-500' },
                  { icon: <Clock className="h-6 w-6" />, title: 'Better Sleep Habits', desc: 'Evidence-based strategies for improving sleep quality and duration', color: 'from-purple-500 to-pink-500' },
                  { icon: <BookOpen className="h-6 w-6" />, title: 'Study-Life Balance', desc: 'Tips for managing academic pressure while maintaining mental health', color: 'from-green-500 to-teal-500' }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center text-white mb-3`}>
                      {item.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Add/Edit Resource Modal */}
        {showAddModal && userRole === 'counselor' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingResource ? 'Edit Resource' : 'Add New Resource'}
                </h2>
                <form onSubmit={handleAddResource} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Category</option>
                        <option value="anxiety">Anxiety</option>
                        <option value="depression">Depression</option>
                        <option value="stress">Stress Management</option>
                        <option value="sleep">Sleep</option>
                        <option value="relationships">Relationships</option>
                        <option value="academic">Academic Stress</option>
                        <option value="general">General Wellness</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <select
                        id="type"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Type</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="article">Article</option>
                        <option value="guide">Guide</option>
                        <option value="exercise">Exercise</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <select
                        id="difficulty"
                        value={formData.difficulty}
                        onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="url">URL (optional)</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({...formData, url: e.target.value})}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="meditation, mindfulness, stress-relief"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingResource ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Resource</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{resourceToDelete?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteResource}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Resources;
