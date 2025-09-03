import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, CheckCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import axios from 'axios';

const WellnessButton = ({ onOpenTracker }) => {
  const [hasEntryToday, setHasEntryToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTodayEntry();
    
    // Listen for wellness updates
    const handleWellnessUpdate = () => {
      checkTodayEntry();
    };
    
    window.addEventListener('wellnessUpdated', handleWellnessUpdate);
    return () => window.removeEventListener('wellnessUpdated', handleWellnessUpdate);
  }, []);

  const checkTodayEntry = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/wellness/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHasEntryToday(!!response.data);
    } catch (error) {
      console.error('Failed to check today\'s entry:', error);
      setHasEntryToday(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className="shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={onOpenTracker}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                hasEntryToday 
                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                  : 'bg-gradient-to-br from-red-500 to-red-600'
              }`}>
                {hasEntryToday ? (
                  <CheckCircle className="h-8 w-8 text-white" />
                ) : (
                  <Heart className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {hasEntryToday ? 'Wellness Logged' : 'Daily Check-in'}
                </h3>
                <p className="text-sm text-gray-600">
                  {hasEntryToday 
                    ? 'Great job! You can update anytime' 
                    : 'Track your mood, stress & sleep'
                  }
                </p>
              </div>
            </div>
            <Button variant={hasEntryToday ? "outline" : "default"} size="sm">
              {hasEntryToday ? 'Update' : 'Start'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default WellnessButton;
