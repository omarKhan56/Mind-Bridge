import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, AlertTriangle, Target, Plus, FileText, Calendar, Clock, User, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const SessionNoteForm = ({ isOpen, onClose, onSubmit, appointment, students }) => {
  const [formData, setFormData] = useState({
    student: appointment?.student?._id || '',
    appointment: appointment?._id || '',
    sessionDate: appointment?.appointmentDate ? new Date(appointment.appointmentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    duration: 50,
    sessionType: appointment?.type || 'individual',
    presentingConcerns: '',
    sessionSummary: '',
    interventions: [''],
    studentResponse: '',
    progressNotes: '',
    riskAssessment: {
      suicidalIdeation: 'none',
      selfHarm: 'none',
      riskLevel: 'low',
      safetyPlan: ''
    },
    goals: [{ description: '', status: 'not-started', targetDate: '' }],
    homework: [{ task: '', dueDate: '', completed: false }],
    nextSteps: '',
    followUpDate: '',
    referrals: [],
    confidentialityNotes: ''
  });

  const [activeTab, setActiveTab] = useState('basic');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addIntervention = () => {
    setFormData(prev => ({
      ...prev,
      interventions: [...prev.interventions, '']
    }));
  };

  const addGoal = () => {
    setFormData(prev => ({
      ...prev,
      goals: [...prev.goals, { description: '', status: 'not-started', targetDate: '' }]
    }));
  };

  const addHomework = () => {
    setFormData(prev => ({
      ...prev,
      homework: [...prev.homework, { task: '', dueDate: '', completed: false }]
    }));
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-full shadow-lg bg-gradient-to-r from-teal-500 to-cyan-600">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create Session Note</h2>
                <p className="mt-1 text-sm text-gray-600">Document counseling session details and progress</p>
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose} 
              className="p-2 text-gray-400 transition-colors rounded-full hover:text-gray-600 hover:bg-white/50"
            >
              <X className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex px-6">
            {[
              { id: 'basic', label: 'Basic Info', icon: User },
              { id: 'session', label: 'Session Details', icon: BookOpen },
              { id: 'assessment', label: 'Assessment', icon: AlertTriangle },
              { id: 'goals', label: 'Goals & Plans', icon: Target }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  activeTab === id
                    ? 'border-teal-500 text-teal-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="p-4 border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <label className="flex items-center block mb-3 text-sm font-semibold text-blue-900">
                      <User className="w-4 h-4 mr-2" />
                      Student
                    </label>
                    <select
                      value={formData.student}
                      onChange={(e) => setFormData({...formData, student: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Select Student</option>
                      {students?.map(student => (
                        <option key={student._id} value={student._id}>{student.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="p-4 border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <label className="flex items-center block mb-3 text-sm font-semibold text-green-900">
                      <Calendar className="w-4 h-4 mr-2" />
                      Session Date
                    </label>
                    <input
                      type="date"
                      value={formData.sessionDate}
                      onChange={(e) => setFormData({...formData, sessionDate: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="p-4 border border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <label className="flex items-center block mb-3 text-sm font-semibold text-purple-900">
                      <Clock className="w-4 h-4 mr-2" />
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  
                  <div className="p-4 border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
                    <label className="flex items-center block mb-3 text-sm font-semibold text-orange-900">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Session Type
                    </label>
                    <select
                      value={formData.sessionType}
                      onChange={(e) => setFormData({...formData, sessionType: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="individual">Individual Counseling</option>
                      <option value="group">Group Session</option>
                      <option value="crisis">Crisis Intervention</option>
                      <option value="follow-up">Follow-up Session</option>
                      <option value="assessment">Initial Assessment</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Session Details Tab */}
            {activeTab === 'session' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="p-6 border border-red-100 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl">
                  <label className="flex items-center block mb-3 text-sm font-semibold text-red-900">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Presenting Concerns
                  </label>
                  <textarea
                    value={formData.presentingConcerns}
                    onChange={(e) => setFormData({...formData, presentingConcerns: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-red-200 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows="4"
                    placeholder="What brought the student to this session? What are their main concerns?"
                    required
                  />
                </div>

                <div className="p-6 border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <label className="flex items-center block mb-3 text-sm font-semibold text-blue-900">
                    <FileText className="w-4 h-4 mr-2" />
                    Session Summary
                  </label>
                  <textarea
                    value={formData.sessionSummary}
                    onChange={(e) => setFormData({...formData, sessionSummary: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-blue-200 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows="5"
                    placeholder="Summarize what was discussed, interventions used, and student's responses..."
                    required
                  />
                </div>

                <div className="p-6 border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <label className="flex items-center block mb-3 text-sm font-semibold text-green-900">
                    <Target className="w-4 h-4 mr-2" />
                    Next Steps & Follow-up
                  </label>
                  <textarea
                    value={formData.nextSteps}
                    onChange={(e) => setFormData({...formData, nextSteps: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-green-200 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows="3"
                    placeholder="What are the recommended next steps and follow-up actions?"
                  />
                </div>
              </motion.div>
            )}

            {/* Assessment Tab */}
            {activeTab === 'assessment' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="p-6 border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                  <h3 className="flex items-center mb-4 text-lg font-semibold text-red-900">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Risk Assessment
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-red-800">Overall Risk Level</label>
                      <select
                        value={formData.riskAssessment.riskLevel}
                        onChange={(e) => setFormData({
                          ...formData, 
                          riskAssessment: {...formData.riskAssessment, riskLevel: e.target.value}
                        })}
                        className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="low">Low Risk</option>
                        <option value="moderate">Moderate Risk</option>
                        <option value="high">High Risk</option>
                        <option value="imminent">Imminent Risk</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-red-800">Suicidal Ideation</label>
                      <select
                        value={formData.riskAssessment.suicidalIdeation}
                        onChange={(e) => setFormData({
                          ...formData, 
                          riskAssessment: {...formData.riskAssessment, suicidalIdeation: e.target.value}
                        })}
                        className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="none">None</option>
                        <option value="passive">Passive</option>
                        <option value="active">Active</option>
                        <option value="plan">With Plan</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block mb-2 text-sm font-medium text-red-800">Safety Plan Notes</label>
                    <textarea
                      value={formData.riskAssessment.safetyPlan}
                      onChange={(e) => setFormData({
                        ...formData, 
                        riskAssessment: {...formData.riskAssessment, safetyPlan: e.target.value}
                      })}
                      className="w-full px-4 py-3 bg-white border border-red-200 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      rows="3"
                      placeholder="Safety planning details, coping strategies, emergency contacts..."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Goals & Plans Tab */}
            {activeTab === 'goals' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="p-6 border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="flex items-center text-lg font-semibold text-purple-900">
                      <Target className="w-5 h-5 mr-2" />
                      Treatment Goals
                    </h3>
                    <button
                      type="button"
                      onClick={addGoal}
                      className="flex items-center px-4 py-2 text-sm text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Goal
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.goals.map((goal, index) => (
                      <div key={index} className="p-4 bg-white border border-purple-200 rounded-lg">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="block mb-2 text-sm font-medium text-purple-800">Goal Description</label>
                            <input
                              type="text"
                              value={goal.description}
                              onChange={(e) => {
                                const newGoals = [...formData.goals];
                                newGoals[index].description = e.target.value;
                                setFormData({...formData, goals: newGoals});
                              }}
                              className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Describe the treatment goal..."
                            />
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-medium text-purple-800">Status</label>
                            <select
                              value={goal.status}
                              onChange={(e) => {
                                const newGoals = [...formData.goals];
                                newGoals[index].status = e.target.value;
                                setFormData({...formData, goals: newGoals});
                              }}
                              className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="not-started">Not Started</option>
                              <option value="in-progress">In Progress</option>
                              <option value="achieved">Achieved</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="px-6 py-3 font-medium text-gray-700 transition-all border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="flex items-center px-8 py-3 font-medium text-white transition-all shadow-lg bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:from-teal-600 hover:to-cyan-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Session Note
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default SessionNoteForm;
