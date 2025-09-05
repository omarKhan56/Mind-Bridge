import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send, X, User, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const CounselorMessaging = ({ studentId, studentName, isOpen, onClose }) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (isOpen && studentId) {
      initializeSocket();
      loadOrCreateConversation();
    }
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isOpen, studentId]);

  const initializeSocket = () => {
    const newSocket = io('http://localhost:5001');
    
    newSocket.on('connect', () => {
      console.log('Counselor connected to messaging');
      newSocket.emit('join-user-room', { userId: user.id, role: user.role });
    });

    newSocket.on('new_message', (message) => {
      if (conversation && message.conversation === conversation._id) {
        setMessages(prev => [...prev, message]);
      }
    });

    setSocket(newSocket);
  };

  const loadOrCreateConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // First, try to find existing conversation
      const conversationsResponse = await axios.get('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const existingConversation = conversationsResponse.data.find(conv => 
        conv.participants.some(p => p.user._id === studentId)
      );

      if (existingConversation) {
        setConversation(existingConversation);
        loadMessages(existingConversation._id);
      } else {
        // Create new conversation without initial message
        const newConvResponse = await axios.post('/api/messages/conversations', {
          recipientId: studentId,
          subject: `Counseling Session - ${studentName}`,
          initialMessage: '', // Empty initial message
          priority: 'normal'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setConversation(newConvResponse.data.conversation);
        setMessages([]); // Start with empty messages
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/messages/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/messages/conversations/${conversation._id}/messages`, {
        content: newMessage,
        priority: 'normal'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
      // Emit via socket for real-time delivery
      if (socket) {
        socket.emit('send-message', {
          conversationId: conversation._id,
          senderId: user.id,
          recipientId: studentId,
          content: newMessage,
          priority: 'normal'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white rounded-2xl w-full max-w-2xl h-[600px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-4 shadow-lg">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Message {studentName}</h2>
                    <p className="text-sm text-gray-600">Counseling Conversation</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-white/50 transition-colors"
                >
                  <X className="h-6 w-6" />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                  />
                  <span className="ml-3 text-gray-500">Loading conversation...</span>
                </div>
              ) : messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center items-center h-full text-gray-500"
                >
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Start the conversation</p>
                    <p className="text-sm">Send your first message to begin</p>
                  </div>
                </motion.div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex ${message.sender._id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                        message.sender._id === user.id
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${message.sender._id === user.id ? 'text-blue-100' : 'text-gray-500'}`}>
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                        {message.sender._id === user.id && (
                          <span className="text-xs text-blue-100">
                            {message.status === 'read' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-gray-100 bg-white">
              <form onSubmit={sendMessage} className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  <Send className="h-5 w-5" />
                </motion.button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CounselorMessaging;
