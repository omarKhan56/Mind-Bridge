import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import SessionNoteForm from './SessionNoteForm';

const CounselorCalendar = ({ onScheduleAppointment }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSessionNoteForm, setShowSessionNoteForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchAppointments();
    fetchStudents();
  }, [currentDate]);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/counselor/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleCreateSessionNote = async (noteData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/counselor/session-notes', noteData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update appointment status to completed
      if (selectedAppointment) {
        await axios.put(`/api/counselor/appointments/${selectedAppointment._id}`, {
          status: 'completed'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setShowSessionNoteForm(false);
      setSelectedAppointment(null);
      fetchAppointments(); // Refresh appointments
      toast.success('Session note created successfully');
    } catch (error) {
      console.error('Error creating session note:', error);
      toast.error('Failed to create session note');
    }
  };

  const openSessionNoteForm = (appointment) => {
    setSelectedAppointment(appointment);
    setShowSessionNoteForm(true);
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await axios.get('/api/counselor/calendar', {
        params: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString()
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAppointments(response.data);
    } catch (error) {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getAppointmentsForDate = (date) => {
    if (!date) return [];
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const dayAppointments = getAppointmentsForDate(date);
            const isSelected = selectedDate && date && selectedDate.toDateString() === date.toDateString();
            
            return (
              <motion.div
                key={index}
                whileHover={{ scale: date ? 1.02 : 1 }}
                className={`
                  min-h-[100px] p-2 border border-gray-100 rounded-lg cursor-pointer transition-all
                  ${date ? 'hover:bg-gray-50' : ''}
                  ${isToday(date) ? 'bg-blue-50 border-blue-200' : ''}
                  ${isSelected ? 'bg-blue-100 border-blue-300' : ''}
                  ${isPastDate(date) ? 'opacity-50' : ''}
                `}
                onClick={() => date && setSelectedDate(date)}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-2 ${
                      isToday(date) ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((apt, idx) => (
                        <div
                          key={apt._id}
                          className={`text-xs p-1 rounded truncate ${
                            apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center mt-1">
                            <User className="h-3 w-3 mr-1" />
                            {apt.student?.name}
                          </div>
                        </div>
                      ))}
                      
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                      
                      {dayAppointments.length === 0 && !isPastDate(date) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onScheduleAppointment && onScheduleAppointment(date);
                          }}
                          className="w-full text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center py-1"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-gray-100 p-6 bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900 mb-4">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          <div className="space-y-3">
            {getAppointmentsForDate(selectedDate).map(apt => (
              <div key={apt._id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Clock className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="font-medium">
                        {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-gray-600 capitalize">{apt.type}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <User className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-900">{apt.student?.name}</span>
                    </div>
                    {apt.notes && (
                      <p className="text-sm text-gray-600 mb-2">{apt.notes}</p>
                    )}
                    {apt.status === 'confirmed' && (
                      <button
                        onClick={() => openSessionNoteForm(apt)}
                        className="text-sm bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Create Session Note
                      </button>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
            
            {getAppointmentsForDate(selectedDate).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No appointments scheduled for this date</p>
                {!isPastDate(selectedDate) && (
                  <button
                    onClick={() => onScheduleAppointment && onScheduleAppointment(selectedDate)}
                    className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    Schedule Appointment
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Session Note Form */}
      <AnimatePresence>
        {showSessionNoteForm && (
          <SessionNoteForm
            isOpen={showSessionNoteForm}
            onClose={() => {
              setShowSessionNoteForm(false);
              setSelectedAppointment(null);
            }}
            onSubmit={handleCreateSessionNote}
            appointment={selectedAppointment}
            students={students}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CounselorCalendar;
