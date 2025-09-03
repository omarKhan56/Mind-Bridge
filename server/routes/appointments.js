const express = require('express');
const Appointment = require('../models/Appointment');
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

// Get user's appointments
router.get('/my-appointments', auth, async (req, res) => {
  try {
    console.log('Fetching appointments for user:', req.user.userId);
    
    const appointments = await Appointment.find({ student: req.user.userId })
      .populate('counselor', 'name email')
      .sort({ appointmentDate: -1, appointmentTime: -1 }); // Most recent first
    
    console.log(`Found ${appointments.length} appointments for user ${req.user.userId}`);
    
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: error.message });
  }
});

// Book new appointment
router.post('/book', auth, async (req, res) => {
  try {
    const { type, appointmentDate, appointmentTime, mode, notes } = req.body;
    
    // Validate required fields
    if (!type || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if slot is already taken
    const existingAppointment = await Appointment.findOne({
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }
    
    // Set duration based on type
    const durations = {
      individual: 50,
      group: 90,
      crisis: 30,
      wellness: 30
    };
    
    const appointment = new Appointment({
      student: req.user.userId,
      type,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      duration: durations[type] || 50,
      mode: mode || 'in-person',
      location: mode === 'video' ? 'Online Session' : 'To be assigned',
      notes: notes || '',
      status: 'pending'
    });
    
    await appointment.save();
    
    // Populate student info for response
    await appointment.populate('student', 'name email');
    
    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available time slots for a date
router.get('/available-slots', auth, async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    const allSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    
    // Find booked slots for the date
    const bookedAppointments = await Appointment.find({
      appointmentDate: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    }).select('appointmentTime');
    
    const bookedSlots = bookedAppointments.map(apt => apt.appointmentTime);
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
    
    res.json({ availableSlots, bookedSlots });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update appointment status (for counselors/admin)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, counselorId, location } = req.body;
    
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Update appointment
    appointment.status = status;
    if (counselorId) appointment.counselor = counselorId;
    if (location) appointment.location = location;
    
    await appointment.save();
    await appointment.populate(['student', 'counselor'], 'name email');
    
    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if user owns the appointment
    if (appointment.student.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }
    
    appointment.status = 'cancelled';
    await appointment.save();
    
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
