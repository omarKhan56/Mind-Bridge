import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send, MessageCircle, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const StudentMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (user) {
      initializeSocket();
      fetchConversations();
      fetchUnreadCount();
    }
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const initializeSocket = () => {
    const newSocket = io('http://localhost:5001');
    
    newSocket.on('connect', () => {
      console.log('Connected to messaging system');
      newSocket.emit('join-user-room', { userId: user.id, role: user.role });
    });

    newSocket.on('new_message', (message) => {
      // Add new message to current conversation if it matches
      if (selectedConversation && message.conversation === selectedConversation._id) {
        setMessages(prev => [...prev, message]);
      }
      
      // Update conversations list
      fetchConversations();
      fetchUnreadCount();
      
      toast.success(`New message from ${message.sender.name}`);
    });

    newSocket.on('message_read', (data) => {
      // Update message status in UI
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId ? { ...msg, status: 'read' } : msg
      ));
    });

    setSocket(newSocket);
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/messages/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      
      // Mark messages as read
      const unreadMessages = response.data.filter(msg => 
        msg.recipient._id === user.id && msg.status !== 'read'
      );
      
      for (const message of unreadMessages) {
        await markAsRead(message._id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/messages/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/messages/messages/${messageId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (socket) {
        socket.emit('mark-message-read', { messageId, userId: user.id });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/messages/conversations/${selectedConversation._id}/messages`, {
        content: newMessage,
        priority: 'normal'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
      // Emit via socket for real-time delivery
      if (socket) {
        const recipient = selectedConversation.participants.find(p => p.user._id !== user.id);
        socket.emit('send-message', {
          conversationId: selectedConversation._id,
          senderId: user.id,
          recipientId: recipient.user._id,
          content: newMessage,
          priority: 'normal'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation._id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
    >
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-100 bg-gray-50">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold flex items-center text-gray-900">
            <MessageCircle className="h-6 w-6 mr-3 text-blue-600" />
            Messages
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="ml-3 bg-gradient-to-r from-red-500 to-pink-600 text-white text-sm rounded-full px-3 py-1 shadow-lg"
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </h2>
        </div>
        
        <div className="overflow-y-auto h-full">
          {loading ? (
            <div className="p-6 text-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
              />
              <p className="text-gray-500">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 text-center text-gray-500"
            >
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm">Your counselor messages will appear here</p>
            </motion.div>
          ) : (
            conversations.map((conversation, index) => {
              const otherParticipant = conversation.participants.find(p => p.user._id !== user.id);
              return (
                <motion.div
                  key={conversation._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => selectConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 ${
                    selectedConversation?._id === conversation._id 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' 
                      : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {otherParticipant?.user.name}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.subject}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(conversation.lastActivity).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50"
            >
              <h3 className="text-xl font-bold text-gray-900">{selectedConversation.subject}</h3>
              <p className="text-sm text-gray-600">
                {selectedConversation.participants.find(p => p.user._id !== user.id)?.user.name}
              </p>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              <AnimatePresence>
                {messages.map((message, index) => (
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
                ))}
              </AnimatePresence>
            </div>

            {/* Message Input */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 border-t border-gray-100 bg-white"
            >
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
            </motion.div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50"
          >
            <div className="text-center">
              <MessageCircle className="h-20 w-20 mx-auto mb-6 opacity-30" />
              <p className="text-xl font-medium mb-2">Select a conversation</p>
              <p className="text-gray-400">Choose a conversation to start messaging</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default StudentMessages;
