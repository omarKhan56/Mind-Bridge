import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Calendar, Clock, User, Video, MapPin, Plus, X, Check, Bell } from '../components/Icons';
import { toast } from 'sonner';
import axios from 'axios';

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [type, setType] = useState('individual');
  const [mode, setMode] = useState('in-person');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);

  const appointmentTypes = [
    { 
      id: 'individual', 
      name: 'Individual Counseling', 
      duration: 50, 
      color: 'from-blue-500 to-blue-600',
      icon: User,
      description: 'One-on-one session with a counselor'
    },
    { 
      id: 'group', 
      name: 'Group Therapy', 
      duration: 90, 
      color: 'from-green-500 to-green-600',
      icon: User,
      description: 'Group session with peers and facilitator'
    },
    { 
      id: 'crisis', 
      name: 'Crisis Support', 
      duration: 30, 
      color: 'from-red-500 to-red-600',
      icon: Bell,
      description: 'Immediate support for urgent situations'
    },
    { 
      id: 'wellness', 
      name: 'Wellness Check', 
      duration: 30, 
      color: 'from-purple-500 to-purple-600',
      icon: Check,
      description: 'Regular check-in for ongoing support'
    }
  ];

  const sessionModes = [
    { id: 'in-person', name: 'In-Person', icon: MapPin, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'video', name: 'Video Call', icon: Video, color: 'bg-green-50 text-green-700 border-green-200' },
    { id: 'phone', name: 'Phone Call', icon: Bell, color: 'bg-purple-50 text-purple-700 border-purple-200' }
  ];

  const statusConfig = {
    pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Pending' },
    confirmed: { color: 'bg-green-50 text-green-700 border-green-200', label: 'Confirmed' },
    completed: { color: 'bg-gray-50 text-gray-700 border-gray-200', label: 'Completed' },
    cancelled: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' },
    'no-show': { color: 'bg-red-50 text-red-700 border-red-200', label: 'No Show' }
  };

  const allTimeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (appointmentDate) {
      loadAvailableSlots();
    }
  }, [appointmentDate]);

  const loadAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/appointments/my-appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/appointments/available-slots?date=${appointmentDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableSlots(response.data.availableSlots || allTimeSlots);
    } catch (error) {
      console.error('Error loading available slots:', error);
      toast.error('Failed to load available time slots');
      setAvailableSlots(allTimeSlots);
    }
  };

  const bookAppointment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const selectedType = appointmentTypes.find(t => t.id === type);
      
      await axios.post('/api/appointments/book', {
        appointmentDate,
        appointmentTime,
        type,
        mode,
        duration: selectedType.duration,
        notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowBooking(false);
      setAppointmentDate('');
      setAppointmentTime('');
      setNotes('');
      loadAppointments();
      
      toast.success('Appointment booked successfully!', {
        description: `${selectedType.name} scheduled for ${new Date(appointmentDate).toLocaleDateString()} at ${appointmentTime}`
      });
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment', {
        description: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  const openDeleteDialog = (appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const cancelAppointment = async () => {
    if (!appointmentToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/appointments/${appointmentToDelete._id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      loadAppointments();
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
      
      toast.success('Appointment cancelled successfully', {
        description: 'Your appointment has been cancelled and the slot is now available for others.'
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment', {
        description: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16 px-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Appointments</h1>
              <p className="text-gray-600">Manage your counseling sessions and wellness appointments</p>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowBooking(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
              >
                <Plus size={20} className="mr-2" />
                Book Appointment
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Appointments Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {appointments.map((appointment, index) => {
              const typeConfig = appointmentTypes.find(t => t.id === appointment.type);
              const modeConfig = sessionModes.find(m => m.id === appointment.mode);
              const status = statusConfig[appointment.status];
              
              return (
                <motion.div
                  key={appointment._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Card className="h-full shadow-md hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 bg-gradient-to-br ${typeConfig?.color} rounded-xl flex items-center justify-center shadow-md`}>
                            {typeConfig?.icon && <typeConfig.icon size={20} className="text-white" />}
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                              {typeConfig?.name}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600">
                              {appointment.duration} minutes
                            </CardDescription>
                          </div>
                        </div>
                        
                        <Badge className={`${status.color} border`}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar size={16} />
                          <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock size={16} />
                          <span>{appointment.appointmentTime}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {modeConfig?.icon && <modeConfig.icon size={16} />}
                          <Badge className={`${modeConfig?.color} border text-xs`}>
                            {modeConfig?.name}
                          </Badge>
                        </div>
                      </div>
                      
                      {appointment.notes && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{appointment.notes}</p>
                        </div>
                      )}
                      
                      {appointment.status === 'pending' && (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(appointment)}
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Cancel Appointment
                          </Button>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {appointments.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-12"
            >
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments yet</h3>
              <p className="text-gray-600 mb-6">Book your first appointment to get started with counseling</p>
              <Button
                onClick={() => setShowBooking(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus size={20} className="mr-2" />
                Book Your First Appointment
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Booking Modal */}
        <AnimatePresence>
          {showBooking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowBooking(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <Card className="shadow-2xl border-0">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-bold text-gray-900">Book Appointment</CardTitle>
                        <CardDescription>Schedule your counseling session</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBooking(false)}
                        className="rounded-full w-8 h-8 p-0"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <form onSubmit={bookAppointment} className="space-y-6">
                      {/* Appointment Type */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Appointment Type
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {appointmentTypes.map((appointmentType) => (
                            <motion.div
                              key={appointmentType.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                type === appointmentType.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}>
                                <input
                                  type="radio"
                                  name="type"
                                  value={appointmentType.id}
                                  checked={type === appointmentType.id}
                                  onChange={(e) => setType(e.target.value)}
                                  className="sr-only"
                                />
                                <div className="flex items-start space-x-3">
                                  <div className={`w-10 h-10 bg-gradient-to-br ${appointmentType.color} rounded-lg flex items-center justify-center`}>
                                    <appointmentType.icon size={16} className="text-white" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{appointmentType.name}</div>
                                    <div className="text-sm text-gray-600">{appointmentType.description}</div>
                                    <div className="text-xs text-gray-500 mt-1">{appointmentType.duration} minutes</div>
                                  </div>
                                </div>
                              </label>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Session Mode */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Session Mode
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          {sessionModes.map((sessionMode) => (
                            <motion.div
                              key={sessionMode.id}
                              whileHover={{ scale: 1.02, x: 4 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                mode === sessionMode.id
                                  ? 'border-blue-500 bg-blue-50 shadow-md'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}>
                                <input
                                  type="radio"
                                  name="mode"
                                  value={sessionMode.id}
                                  checked={mode === sessionMode.id}
                                  onChange={(e) => setMode(e.target.value)}
                                  className="sr-only"
                                />
                                <div className="flex items-center space-x-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                    mode === sessionMode.id
                                      ? 'bg-blue-500 text-white shadow-lg'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    <sessionMode.icon size={20} />
                                  </div>
                                  
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900 mb-1">
                                      {sessionMode.name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {sessionMode.id === 'in-person' && 'Meet face-to-face at our counseling center'}
                                      {sessionMode.id === 'video' && 'Secure video call from anywhere you feel comfortable'}
                                      {sessionMode.id === 'phone' && 'Traditional phone call for audio-only sessions'}
                                    </div>
                                  </div>
                                  
                                  <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                    mode === sessionMode.id
                                      ? 'border-blue-500 bg-blue-500'
                                      : 'border-gray-300'
                                  }`}>
                                    {mode === sessionMode.id && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-full h-full rounded-full bg-white scale-50"
                                      />
                                    )}
                                  </div>
                                </div>
                              </label>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Date Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Preferred Date
                        </label>
                        <input
                          type="date"
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          min={getMinDate()}
                          required
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Time Selection */}
                      {appointmentDate && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                        >
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Available Times
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {availableSlots.map((slot) => (
                              <motion.div
                                key={slot}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <label className={`block p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                                  appointmentTime === slot
                                    ? 'border-blue-500 bg-blue-500 text-white'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                  <input
                                    type="radio"
                                    name="time"
                                    value={slot}
                                    checked={appointmentTime === slot}
                                    onChange={(e) => setAppointmentTime(e.target.value)}
                                    className="sr-only"
                                  />
                                  <div className="text-sm font-medium">{slot}</div>
                                </label>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any specific concerns or topics you'd like to discuss..."
                          rows={3}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="submit"
                          disabled={!appointmentDate || !appointmentTime}
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed h-12"
                        >
                          Book Appointment
                        </Button>
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-500" />
                Cancel Appointment
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {appointmentToDelete && (
              <div className="py-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="font-semibold text-gray-900">
                    {appointmentTypes.find(t => t.id === appointmentToDelete.type)?.name}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(appointmentToDelete.appointmentDate).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock size={14} />
                    {appointmentToDelete.appointmentTime}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                onClick={cancelAppointment}
              >
                Cancel Appointment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Appointments;
