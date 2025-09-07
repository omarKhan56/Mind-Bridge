import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send, X, MessageCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StudentMessaging = ({ isOpen, onClose }) => {
  const [availableCounselors, setAvailableCounselors] = useState([]);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messagePriority, setMessagePriority] = useState('normal');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (isOpen) {
      initializeSocket();
      loadAvailableCounselors();
      loadMessages();
    }
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isOpen]);

  const initializeSocket = () => {
    const newSocket = io('http://localhost:5000');
    
    newSocket.on('connect', () => {
      console.log('Student connected to messaging');
      newSocket.emit('join-user-room', { userId: user.id, role: user.role });
    });

    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, {
        message: message.content,
        sender: message.sender.role,
        counselorName: message.sender.role === 'counselor' ? message.sender.name : null,
        createdAt: message.createdAt,
        messageId: message._id,
        canEdit: false,
        status: 'delivered'
      }]);
    });

    newSocket.on('message_sent', (message) => {
      setMessages(prev => prev.map(msg => 
        msg.messageId === message._id 
          ? { ...msg, status: 'sent' }
          : msg
      ));
    });

    setSocket(newSocket);
  };

  const loadAvailableCounselors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/messages/available-counselors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableCounselors(response.data || []);
    } catch (error) {
      console.error('Failed to load counselors:', error);
      setAvailableCounselors([]);
    }
  };

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/messages/counselor-chat', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedCounselor) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post('/api/messages/send-to-counselor', {
        counselorId: selectedCounselor._id,
        subject: messageSubject || 'Student Message',
        message: newMessage,
        priority: messagePriority
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMsg = {
        message: newMessage,
        sender: 'student',
        createdAt: new Date().toISOString(),
        messageId: Date.now(),
        canEdit: true,
        status: 'sending'
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setMessageSubject('');
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-6xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Counselor Chat</h3>
                  <p className="text-sm text-blue-100">Secure & confidential messaging</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Counselor List Sidebar */}
            <div className="w-1/3 bg-gray-50 border-r overflow-y-auto">
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Available Counselors</h4>
                {availableCounselors.length > 0 ? (
                  <div className="space-y-2">
                    {availableCounselors.map((counselor) => (
                      <div
                        key={counselor._id}
                        onClick={() => setSelectedCounselor(counselor)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedCounselor?._id === counselor._id
                            ? 'bg-blue-100 border-blue-300'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {counselor.name.charAt(0)}
                              </span>
                            </div>
                            {counselor.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{counselor.name}</p>
                            <p className="text-xs text-gray-500 truncate">{counselor.specialization || 'General Counseling'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No counselors available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedCounselor ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {selectedCounselor.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900">{selectedCounselor.name}</h5>
                        <p className="text-sm text-gray-500">{selectedCounselor.specialization}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {messages.length > 0 ? (
                      <div className="space-y-4">
                        {messages.map((message, index) => (
                          <div
                            key={message.messageId || index}
                            className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                              message.sender === 'student'
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-white border shadow-sm rounded-bl-md'
                            }`}>
                              {message.sender !== 'student' && message.counselorName && (
                                <p className="text-xs font-semibold text-blue-600 mb-1">
                                  {message.counselorName}
                                </p>
                              )}
                              <p className="text-sm leading-relaxed">{message.message}</p>
                              <p className={`text-xs mt-2 ${
                                message.sender === 'student' ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {new Date(message.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                          <MessageCircle className="w-8 h-8 text-blue-500" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h4>
                        <p className="text-gray-500 text-sm max-w-sm">
                          Send a message to {selectedCounselor.name} to begin your confidential chat.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 bg-white border-t">
                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        placeholder="Subject (optional)"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={messagePriority}
                        onChange={(e) => setMessagePriority(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && newMessage.trim() && selectedCounselor) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        autoComplete="off"
                        spellCheck="false"
                      />
                      <button
                        onClick={sendMessage}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!newMessage.trim() || !selectedCounselor}
                        type="button"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Messages are encrypted and confidential
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Select a Counselor</h4>
                    <p className="text-gray-500 text-sm">
                      Choose a counselor from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StudentMessaging;
