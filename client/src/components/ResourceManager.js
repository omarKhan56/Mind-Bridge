import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Share, BookOpen, Video, FileText, Wrench, X } from 'lucide-react';
import { toast } from 'sonner';

const ResourceManager = () => {
  const [resources, setResources] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: 'all', label: 'All Resources' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'depression', label: 'Depression' },
    { value: 'stress', label: 'Stress Management' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'academic', label: 'Academic Support' },
    { value: 'general', label: 'General Wellness' }
  ];

  const resourceTypes = [
    { value: 'article', label: 'Article', icon: FileText },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'worksheet', label: 'Worksheet', icon: BookOpen },
    { value: 'exercise', label: 'Exercise', icon: Wrench },
    { value: 'guide', label: 'Guide', icon: BookOpen },
    { value: 'tool', label: 'Tool', icon: Wrench }
  ];

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/counselor/resources', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(response.data);
    } catch (error) {
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async (resourceData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/counselor/resources', resourceData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources([response.data, ...resources]);
      setShowCreateModal(false);
      toast.success('Resource created successfully');
    } catch (error) {
      toast.error('Failed to create resource');
    }
  };

  const handleUpdateResource = async (id, resourceData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/counselor/resources/${id}`, resourceData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(resources.map(r => r._id === id ? response.data : r));
      setEditingResource(null);
      toast.success('Resource updated successfully');
    } catch (error) {
      toast.error('Failed to update resource');
    }
  };

  const handleDeleteResource = async (id) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/counselor/resources/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(resources.filter(r => r._id !== id));
      toast.success('Resource deleted successfully');
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const filteredResources = selectedCategory === 'all' 
    ? resources 
    : resources.filter(r => r.category === selectedCategory);

  const ResourceForm = ({ resource, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      title: resource?.title || '',
      description: resource?.description || '',
      type: resource?.type || 'article',
      category: resource?.category || 'general',
      content: resource?.content || '',
      tags: resource?.tags?.join(', ') || '',
      isPublic: resource?.isPublic || false
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };
      onSubmit(data);
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {resource ? 'Edit Resource' : 'Create Resource'}
              </h2>
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {resourceTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {categories.slice(1).map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="3"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="6"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="mindfulness, coping, relaxation"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                className="mr-3"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make this resource public to all counselors
              </label>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-700 transition-all"
              >
                {resource ? 'Update Resource' : 'Create Resource'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resource Library</h2>
          <p className="text-gray-600">Manage and share counseling resources</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Resource
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCategory === category.value
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredResources.map((resource, index) => {
            const TypeIcon = resourceTypes.find(t => t.value === resource.type)?.icon || FileText;
            return (
              <motion.div
                key={resource._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                        <TypeIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                        <p className="text-sm text-gray-500 capitalize">{resource.category}</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{resource.description}</p>
                  
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {resource.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Views: {resource.usage?.views || 0} | Shares: {resource.usage?.shares || 0}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingResource(resource)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(resource._id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <ResourceForm
            onSubmit={handleCreateResource}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
        {editingResource && (
          <ResourceForm
            resource={editingResource}
            onSubmit={(data) => handleUpdateResource(editingResource._id, data)}
            onCancel={() => setEditingResource(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResourceManager;
