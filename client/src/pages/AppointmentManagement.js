import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, CheckCircle, XCircle, Edit, Users, BarChart3, Eye, MessageCircle, Plus, Filter, Search, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, filter, searchTerm]);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/counselor/appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = appointments;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === filter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAppointments(filtered);
  };

  const handleAppointmentAction = async (appointmentId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/counselor/appointments/${appointmentId}/${action}`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      toast.success(`Appointment ${action}ed successfully`);
      fetchAppointments();
    } catch (error) {
      console.error(`Failed to ${action} appointment:`, error);
      toast.error(`Failed to ${action} appointment`);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      'no-show': { color: 'bg-gray-100 text-gray-800', label: 'No Show' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getTypeIcon = (type) => {
    const icons = {
      individual: <Users className="w-4 h-4" />,
      group: <Users className="w-4 h-4" />,
      crisis: <AlertTriangle className="w-4 h-4" />,
      wellness: <CheckCircle className="w-4 h-4" />
    };
    return icons[type] || <Calendar className="w-4 h-4" />;
  };

  const clearFilters = () => {
    setFilter('all');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
            <p className="text-gray-600 mt-1">Manage and track all student appointments</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
        </motion.div>

        {/* Appointment Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="text-white bg-gradient-to-r from-blue-500 to-blue-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Today</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(a => new Date(a.appointmentDate).toDateString() === new Date().toDateString()).length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="text-white bg-gradient-to-r from-yellow-500 to-yellow-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-100">Pending</p>
                  <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'pending').length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="text-white bg-gradient-to-r from-green-500 to-green-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100">Confirmed</p>
                  <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'confirmed').length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="text-white bg-gradient-to-r from-purple-500 to-purple-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">This Week</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(a => {
                      const appointmentDate = new Date(a.appointmentDate);
                      const weekStart = new Date();
                      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekEnd.getDate() + 6);
                      return appointmentDate >= weekStart && appointmentDate <= weekEnd;
                    }).length}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Urgent Appointments */}
        {appointments.filter(a => 
          new Date(a.appointmentDate).toDateString() === new Date().toDateString() && 
          (a.status === 'pending' || a.status === 'confirmed')
        ).length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Today's Appointments Requiring Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments
                  .filter(a => 
                    new Date(a.appointmentDate).toDateString() === new Date().toDateString() && 
                    (a.status === 'pending' || a.status === 'confirmed')
                  )
                  .slice(0, 4)
                  .map((appointment) => (
                    <div key={appointment._id} className="p-4 bg-white border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-10 h-10 mr-3 bg-orange-100 rounded-full">
                            {getTypeIcon(appointment.type)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{appointment.student?.name}</h4>
                            <p className="text-sm text-gray-600">{appointment.appointmentTime} • {appointment.type}</p>
                          </div>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAppointmentAction(appointment._id, 'confirm')}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter Section */}
        <Card className="shadow-xl border-0 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="h-6 w-6 mr-3 text-blue-600" />
                All Appointments ({filteredAppointments.length})
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={clearFilters} size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by student name, email, or appointment type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Appointments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mr-3">
                          {getTypeIcon(appointment.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{appointment.student?.name}</h3>
                          <p className="text-sm text-gray-600">{appointment.student?.email}</p>
                        </div>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{appointment.appointmentTime} • {appointment.duration} min</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-16">Type:</span>
                        <span className="capitalize">{appointment.type}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-16">Mode:</span>
                        <span className="capitalize">{appointment.mode}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {appointment.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => handleAppointmentAction(appointment._id, 'confirm')} className="flex-1">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Confirm
                        </Button>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Button size="sm" variant="outline" onClick={() => handleAppointmentAction(appointment._id, 'complete')} className="flex-1">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleAppointmentAction(appointment._id, 'cancel')}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredAppointments.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || filter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No appointments scheduled yet'
                  }
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule New Appointment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentManagement;
