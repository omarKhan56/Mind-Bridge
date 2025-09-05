import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Calendar, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const CounselorReports = () => {
  const [reportType, setReportType] = useState('caseload');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (reportType === 'caseload') {
      generateCaseloadReport();
    }
  }, [dateRange, reportType]);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/counselor/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      toast.error('Failed to load students');
    }
  };

  const generateCaseloadReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Generating caseload report with params:', dateRange);
      
      const response = await axios.get('/api/counselor/reports/caseload-summary', {
        params: dateRange,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Caseload report response:', response.data);
      setReportData(response.data);
    } catch (error) {
      console.error('Caseload report error:', error.response?.data || error.message);
      toast.error(`Failed to generate report: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateStudentReport = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Generating student report for:', selectedStudent, 'with params:', dateRange);
      
      const response = await axios.get(`/api/counselor/reports/student-progress/${selectedStudent}`, {
        params: dateRange,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Student report response:', response.data);
      setReportData(response.data);
    } catch (error) {
      console.error('Student report error:', error.response?.data || error.message);
      toast.error(`Failed to generate student report: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }
    
    // Create a formatted report
    const formattedReport = {
      reportType: reportType,
      generatedAt: new Date().toISOString(),
      dateRange: dateRange,
      data: reportData
    };
    
    const dataStr = JSON.stringify(formattedReport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const CaseloadReport = ({ data }) => {
    const riskData = data.riskDistribution?.length > 0 ? data.riskDistribution.map((item, index) => ({
      name: item._id || 'Unknown',
      value: item.count,
      color: COLORS[index % COLORS.length]
    })) : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Students</p>
                <p className="text-3xl font-bold">{data.totalStudents || 0}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Total Sessions</p>
                <p className="text-3xl font-bold">{data.totalSessions || 0}</p>
              </div>
              <Calendar className="h-12 w-12 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Completed</p>
                <p className="text-3xl font-bold">{data.completedSessions || 0}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Completion Rate</p>
                <p className="text-3xl font-bold">{data.completionRate || 0}%</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-orange-200" />
            </div>
          </div>
        </div>

        {riskData.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Level Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Level Distribution</h3>
            <div className="text-center py-8 text-gray-500">
              <p>No risk assessment data available for this period</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const StudentReport = ({ data }) => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Progress Report: {data.student}
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Total Sessions</p>
            <p className="text-2xl font-bold text-gray-900">{data.totalSessions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completed Sessions</p>
            <p className="text-2xl font-bold text-green-600">{data.completedSessions}</p>
          </div>
        </div>
        
        {data.goals && data.goals.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Treatment Goals</h4>
            <div className="space-y-2">
              {data.goals.map((goal, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    goal.status === 'achieved' ? 'bg-green-500' :
                    goal.status === 'in-progress' ? 'bg-yellow-500' :
                    'bg-gray-300'
                  }`} />
                  <span className="text-gray-700">{goal.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {data.interventions && data.interventions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Interventions Used</h4>
            <div className="flex flex-wrap gap-2">
              {[...new Set(data.interventions)].map((intervention, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {intervention}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Generate detailed reports and insights</p>
        </div>
        <button
          onClick={exportReport}
          disabled={!reportData}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg flex items-center disabled:opacity-50"
        >
          <Download className="h-5 w-5 mr-2" />
          Export Report
        </button>
      </div>

      {/* Report Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="caseload">Caseload Summary</option>
              <option value="student">Student Progress</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {reportType === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Student</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>{student.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <button
            onClick={reportType === 'student' ? generateStudentReport : generateCaseloadReport}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-all flex items-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <FileText className="h-5 w-5 mr-2" />
            )}
            Generate Report
          </button>
        </div>
      </div>

      {/* Report Results */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {reportData && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {reportType === 'caseload' ? (
            <CaseloadReport data={reportData} />
          ) : (
            <StudentReport data={reportData} />
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CounselorReports;
