import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, FileText, Calendar, User, AlertTriangle, Target, X, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import SessionNoteForm from './SessionNoteForm';

const SessionNotes = ({ studentId, studentName }) => {
  const [notes, setNotes] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(studentId || '');

  useEffect(() => {
    fetchNotes();
    fetchStudents();
  }, [studentId, selectedStudent]);

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

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = selectedStudent 
        ? `/api/counselor/session-notes?studentId=${selectedStudent}`
        : '/api/counselor/session-notes';
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(response.data);
    } catch (error) {
      toast.error('Failed to load session notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (noteData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/counselor/session-notes', noteData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes([response.data, ...notes]);
      setShowCreateModal(false);
      toast.success('Session note created successfully');
    } catch (error) {
      toast.error('Failed to create session note');
    }
  };

  const handleUpdateNote = async (id, noteData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/counselor/session-notes/${id}`, noteData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(notes.map(n => n._id === id ? response.data : n));
      setEditingNote(null);
      toast.success('Session note updated successfully');
    } catch (error) {
      toast.error('Failed to update session note');
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'imminent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="h-7 w-7 mr-3 text-teal-600" />
            Session Notes {studentName && `- ${studentName}`}
          </h2>
          <p className="text-gray-600 mt-1">Document and track counseling sessions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Session Note
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-teal-700 mb-2">Filter by Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-4 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student._id} value={student._id}>
                  {student.name} - {student.department}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="bg-white rounded-lg px-4 py-2 border border-teal-200">
              <span className="text-sm font-medium text-teal-700">{notes.length} notes found</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-6">
        <AnimatePresence>
          {notes.map((note, index) => (
            <motion.div
              key={note._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-r from-teal-100 to-cyan-100 flex items-center justify-center mr-4">
                      <FileText className="h-7 w-7 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {note.student?.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(note.sessionDate).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        <Clock className="h-4 w-4 mr-1" />
                        {note.duration} minutes
                        <span className="mx-2">•</span>
                        <BookOpen className="h-4 w-4 mr-1" />
                        {note.sessionType}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {note.riskAssessment?.riskLevel && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskLevelColor(note.riskAssessment.riskLevel)}`}>
                        {note.riskAssessment.riskLevel} risk
                      </span>
                    )}
                    <button
                      onClick={() => setEditingNote(note)}
                      className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Presenting Concerns
                    </h4>
                    <p className="text-blue-800 text-sm leading-relaxed">{note.presentingConcerns}</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Session Summary
                    </h4>
                    <p className="text-green-800 text-sm leading-relaxed">{note.sessionSummary}</p>
                  </div>
                </div>

                {note.goals && note.goals.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-purple-600" />
                      Treatment Goals
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {note.goals.map((goal, idx) => (
                        <div key={idx} className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <span className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${
                            goal.status === 'achieved' ? 'bg-green-500' :
                            goal.status === 'in-progress' ? 'bg-yellow-500' :
                            'bg-gray-300'
                          }`} />
                          <span className="text-purple-800 text-sm font-medium">{goal.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {note.nextSteps && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                    <h4 className="font-semibold text-amber-900 mb-3 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Next Steps & Follow-up
                    </h4>
                    <p className="text-amber-800 text-sm leading-relaxed">{note.nextSteps}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {notes.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <FileText className="h-12 w-12 text-teal-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No session notes yet</h3>
          <p className="text-gray-500 mb-6">Create your first session note to start documenting sessions</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg"
          >
            Create First Note
          </button>
        </div>
      )}

      {/* Session Note Form */}
      <AnimatePresence>
        {showCreateModal && (
          <SessionNoteForm
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateNote}
            students={students}
          />
        )}
        {editingNote && (
          <SessionNoteForm
            isOpen={!!editingNote}
            onClose={() => setEditingNote(null)}
            onSubmit={(data) => handleUpdateNote(editingNote._id, data)}
            appointment={editingNote}
            students={students}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SessionNotes;
