import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Building, Users, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const CollegeManagement = () => {
  const [colleges, setColleges] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showCounselorModal, setShowCounselorModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [editingCounselor, setEditingCounselor] = useState(null);
  const [counselorToDelete, setCounselorToDelete] = useState(null);
  const [deleteCounselorDialogOpen, setDeleteCounselorDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collegeToDelete, setCollegeToDelete] = useState(null);

  const [collegeForm, setCollegeForm] = useState({
    name: '',
    code: '',
    address: '',
    contactEmail: '',
    contactPhone: ''
  });

  const [counselorForm, setCounselorForm] = useState({
    name: '',
    email: '',
    college: '',
    password: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [collegesRes, counselorsRes] = await Promise.all([
        axios.get('/api/admin/colleges', config),
        axios.get('/api/admin/counselors', config)
      ]);
      
      setColleges(collegesRes.data);
      setCounselors(counselorsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (editingCollege) {
        await axios.put(`/api/admin/colleges/${editingCollege._id}`, collegeForm, config);
        toast.success('College updated successfully!');
      } else {
        await axios.post('/api/admin/colleges', collegeForm, config);
        toast.success('College created successfully!');
      }
      
      loadData();
      resetCollegeForm();
    } catch (error) {
      console.error('Failed to save college:', error);
      toast.error('Failed to save college');
    }
  };

  const handleCounselorSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (editingCounselor) {
        await axios.put(`/api/admin/counselors/${editingCounselor._id}`, counselorForm, config);
        toast.success('Counselor updated successfully!');
      } else {
        await axios.post('/api/admin/counselors', counselorForm, config);
        toast.success('Counselor created successfully!');
      }
      
      loadData();
      resetCounselorForm();
    } catch (error) {
      console.error('Failed to save counselor:', error);
      toast.error('Failed to save counselor');
    }
  };

  const handleDeleteCounselor = (counselor) => {
    setCounselorToDelete(counselor);
    setDeleteCounselorDialogOpen(true);
  };

  const confirmDeleteCounselor = async () => {
    if (!counselorToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/counselors/${counselorToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Counselor deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Failed to delete counselor:', error);
      toast.error('Failed to delete counselor');
    } finally {
      setDeleteCounselorDialogOpen(false);
      setCounselorToDelete(null);
    }
  };

  const editCounselor = (counselor) => {
    setCounselorForm({
      name: counselor.name,
      email: counselor.email,
      college: counselor.college?._id || '',
      password: ''
    });
    setEditingCounselor(counselor);
    setShowCounselorModal(true);
  };

  const handleDeleteCollege = (college) => {
    setCollegeToDelete(college);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCollege = async () => {
    if (!collegeToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/colleges/${collegeToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('College deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Failed to delete college:', error);
      toast.error('Failed to delete college');
    } finally {
      setDeleteDialogOpen(false);
      setCollegeToDelete(null);
    }
  };

  const resetCollegeForm = () => {
    setCollegeForm({ name: '', code: '', address: '', contactEmail: '', contactPhone: '' });
    setEditingCollege(null);
    setShowCollegeModal(false);
  };

  const resetCounselorForm = () => {
    setCounselorForm({ name: '', email: '', college: '', password: '' });
    setEditingCounselor(null);
    setShowCounselorModal(false);
  };

  const editCollege = (college) => {
    setCollegeForm(college);
    setEditingCollege(college);
    setShowCollegeModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading colleges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">College Management</h1>
          <p className="text-gray-600">Manage colleges and their counselors</p>
        </div>

        {/* Colleges Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Colleges ({colleges.length})
              </CardTitle>
              <Button onClick={() => setShowCollegeModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add College
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {colleges.map((college) => (
                <motion.div
                  key={college._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{college.name}</h3>
                      <p className="text-sm text-gray-500">Code: {college.code}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editCollege(college)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteCollege(college)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {college.contactEmail}
                    </div>
                    {college.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {college.contactPhone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {counselors.filter(c => c.college?._id === college._id).length} counselors
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Counselors Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Counselors ({counselors.length})
              </CardTitle>
              <Button onClick={() => setShowCounselorModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Counselor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {counselors.map((counselor) => (
                    <tr key={counselor._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{counselor.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{counselor.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {counselor.college?.name || 'No College'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(counselor.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editCounselor(counselor)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteCounselor(counselor)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* College Modal */}
        <Dialog open={showCollegeModal} onOpenChange={setShowCollegeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCollege ? 'Edit College' : 'Add New College'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCollegeSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">College Name</Label>
                <Input
                  id="name"
                  value={collegeForm.name}
                  onChange={(e) => setCollegeForm({...collegeForm, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">College Code</Label>
                <Input
                  id="code"
                  value={collegeForm.code}
                  onChange={(e) => setCollegeForm({...collegeForm, code: e.target.value.toUpperCase()})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={collegeForm.address}
                  onChange={(e) => setCollegeForm({...collegeForm, address: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={collegeForm.contactEmail}
                  onChange={(e) => setCollegeForm({...collegeForm, contactEmail: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={collegeForm.contactPhone}
                  onChange={(e) => setCollegeForm({...collegeForm, contactPhone: e.target.value})}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetCollegeForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCollege ? 'Update' : 'Create'} College
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Counselor Modal */}
        <Dialog open={showCounselorModal} onOpenChange={setShowCounselorModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCounselor ? 'Edit Counselor' : 'Add New Counselor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCounselorSubmit} className="space-y-4">
              <div>
                <Label htmlFor="counselorName">Name</Label>
                <Input
                  id="counselorName"
                  value={counselorForm.name}
                  onChange={(e) => setCounselorForm({...counselorForm, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="counselorEmail">Email</Label>
                <Input
                  id="counselorEmail"
                  type="email"
                  value={counselorForm.email}
                  onChange={(e) => setCounselorForm({...counselorForm, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="counselorCollege">College</Label>
                <select
                  id="counselorCollege"
                  value={counselorForm.college}
                  onChange={(e) => setCounselorForm({...counselorForm, college: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select College</option>
                  {colleges.map((college) => (
                    <option key={college._id} value={college._id}>
                      {college.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="counselorPassword">Password (optional)</Label>
                <Input
                  id="counselorPassword"
                  type="password"
                  value={counselorForm.password}
                  onChange={(e) => setCounselorForm({...counselorForm, password: e.target.value})}
                  placeholder="Leave blank for auto-generated password"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetCounselorForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCounselor ? 'Update' : 'Create'} Counselor
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Counselor Delete Confirmation Dialog */}
        <Dialog open={deleteCounselorDialogOpen} onOpenChange={setDeleteCounselorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Counselor</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{counselorToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteCounselorDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteCounselor}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* College Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete College</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{collegeToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteCollege}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CollegeManagement;
