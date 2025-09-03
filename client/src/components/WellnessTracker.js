import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Brain, Moon, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const WellnessTracker = ({ isOpen, onClose }) => {
  const [entry, setEntry] = useState({
    mood: 5,
    stress: 5,
    sleep: 5,
    notes: ''
  });
  const [hasEntryToday, setHasEntryToday] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTodayEntry();
    }
  }, [isOpen]);

  const loadTodayEntry = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/wellness/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setEntry({
          mood: response.data.mood,
          stress: response.data.stress,
          sleep: response.data.sleep,
          notes: response.data.notes || ''
        });
        setHasEntryToday(true);
      }
    } catch (error) {
      console.error('Failed to load today\'s entry:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/wellness/entry', entry, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(hasEntryToday ? 'Wellness entry updated!' : 'Wellness entry saved!');
      setHasEntryToday(true);
      
      // Emit event to refresh wellness data in dashboard
      window.dispatchEvent(new CustomEvent('wellnessUpdated'));
      
      // Close modal after successful save
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error('Failed to save wellness entry:', error);
      toast.error('Failed to save wellness entry');
    } finally {
      setLoading(false);
    }
  };

  const SliderInput = ({ label, value, onChange, icon: Icon, color, description }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <Label className="font-medium">{label}</Label>
        <span className="ml-auto text-2xl font-bold text-gray-700">{value}</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Daily Wellness Check-in
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <SliderInput
            label="Mood"
            value={entry.mood}
            onChange={(value) => setEntry({...entry, mood: value})}
            icon={Heart}
            color="text-red-500"
            description="1 = Very Low, 10 = Excellent"
          />
          
          <SliderInput
            label="Stress Level"
            value={entry.stress}
            onChange={(value) => setEntry({...entry, stress: value})}
            icon={Brain}
            color="text-yellow-500"
            description="1 = No Stress, 10 = Very Stressed"
          />
          
          <SliderInput
            label="Sleep Quality"
            value={entry.sleep}
            onChange={(value) => setEntry({...entry, sleep: value})}
            icon={Moon}
            color="text-blue-500"
            description="1 = Poor Sleep, 10 = Great Sleep"
          />
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={entry.notes}
              onChange={(e) => setEntry({...entry, notes: e.target.value})}
              placeholder="How are you feeling today?"
              className="w-full p-3 border border-gray-300 rounded-md resize-none h-20"
              maxLength={500}
            />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : hasEntryToday ? 'Update Entry' : 'Save Entry'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WellnessTracker;
