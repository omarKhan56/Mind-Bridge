import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Send, Sparkles, Plus, MessageCircle, Shield, Trash2, Menu } from '../components/Icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    loadSessions();
    console.log('🔌 Connecting to Socket.IO server...');
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to AI chat server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from AI chat server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('ai-response', (data) => {
      console.log('🤖 Received AI response:', data);
      setIsTyping(false);
      
      const newMessage = {
        sender: 'ai',
        text: data.message,
        timestamp: new Date(),
        therapistName: data.therapistName || 'Dr. Sarah Chen',
        responseType: data.responseType || 'therapeutic',
        id: Date.now() + Math.random()
      };
      
      setMessages(prev => {
        const exists = prev.some(msg => 
          msg.sender === 'ai' && 
          msg.text === data.message && 
          Math.abs(new Date(msg.timestamp) - new Date()) < 5000
        );
        
        if (exists) {
          console.log('Duplicate message detected, skipping');
          return prev;
        }
        
        return [...prev, newMessage];
      });
    });

    // Listen for crisis alerts
    newSocket.on('crisis_alert', (data) => {
      console.log('🚨 Crisis alert received:', data);
      
      // Show immediate crisis alert notification
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('Crisis Alert Detected', {
          body: 'Crisis language detected. Help resources are available.',
          icon: '/favicon.ico',
          tag: 'crisis-alert'
        });
      }
      
      // Add crisis alert message to chat
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        text: `🚨 **Crisis Support Alert**: I've detected that you might be going through a difficult time. Please know that help is available 24/7:

**Immediate Help:**
• National Suicide Prevention Lifeline: 988
• Crisis Text Line: Text HOME to 741741
• Emergency Services: 911

**You are not alone. Your life has value and meaning.**`,
        sender: 'system',
        timestamp: new Date(),
        isAlert: true,
        alertType: 'crisis'
      }]);
    });

    // Request notification permission
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      console.log('🔌 Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = chatContainerRef.current;
      if (!chatContainer) return;

      const currentScrollY = chatContainer.scrollTop;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down - hide sidebar
        setShowSidebar(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show sidebar
        setShowSidebar(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ai-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sortedSessions = response.data.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      setSessions(sortedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected) {
      console.log('❌ Cannot send message:', { 
        hasMessage: !!inputMessage.trim(), 
        isConnected 
      });
      return;
    }

    console.log('📤 Sending message:', inputMessage);

    const userMessage = {
      sender: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    let sessionId = currentSession?._id;
    if (!sessionId) {
      try {
        const token = localStorage.getItem('token');
        
        let title = inputMessage.trim();
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }
        
        title = title.charAt(0).toUpperCase() + title.slice(1);
        
        const response = await axios.post('/api/ai-sessions', {
          title: title,
          mood: 'neutral'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        sessionId = response.data._id;
        setCurrentSession(response.data);
        
        loadSessions();
        
        console.log('✅ Created new session:', sessionId);
      } catch (error) {
        console.error('❌ Failed to create session:', error);
      }
    }

    if (socket) {
      socket.emit('user-message', {
        message: inputMessage,
        userId: user?.id,
        sessionId: sessionId,
        mood: 'neutral'
      });
      console.log('✅ Message sent to server');
    } else {
      console.error('❌ Socket not available');
      setIsTyping(false);
    }

    setInputMessage('');
  };

  const handleQuickPrompt = (text) => {
    setInputMessage(text);
    setTimeout(() => {
      const event = { preventDefault: () => {} };
      handleSendMessage(event);
    }, 100);
  };

  const loadSession = async (session) => {
    try {
      setCurrentSession(session);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/ai-sessions/${session._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sessionMessages = response.data.messages.map(msg => ({
        sender: msg.role === 'assistant' ? 'ai' : 'user',
        text: msg.content,
        timestamp: new Date(msg.timestamp),
        therapistName: msg.role === 'assistant' ? 'Dr. Sarah Chen' : undefined
      }));
      
      setMessages(sessionMessages);
      console.log('Loaded session messages:', sessionMessages.length);
    } catch (error) {
      console.error('Failed to load session:', error);
      setCurrentSession(session);
      setMessages([]);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const deleteSession = (sessionId, e) => {
    e.stopPropagation(); // Prevent session loading when clicking delete
    const session = sessions.find(s => s._id === sessionId);
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/ai-sessions/${sessionToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // If deleting current session, clear it
      if (currentSession?._id === sessionToDelete._id) {
        setCurrentSession(null);
        setMessages([]);
      }
      
      // Refresh sessions list
      loadSessions();
      toast.success('Session deleted successfully!');
      console.log('✅ Session deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete session:', error);
      toast.error('Failed to delete session. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  const startNewSession = () => {
    setMessages([]);
    setCurrentSession(null);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-14 px-2 overflow-hidden">
      <div className="max-w-6xl mx-auto h-[calc(100vh-3.5rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`grid gap-3 h-full transition-all duration-300 ${
            showSidebar ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'
          }`}
        >
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ 
              opacity: showSidebar ? 1 : 0,
              x: showSidebar ? 0 : -300,
              width: showSidebar ? 'auto' : 0
            }}
            transition={{ duration: 0.3 }}
            className={`lg:col-span-1 overflow-hidden ${showSidebar ? 'block' : 'hidden lg:block'}`}
          >
            <Card className="h-full shadow-lg border-0 bg-gradient-to-b from-gray-50 to-white">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                    <Brain size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-base font-bold">AI Therapy</div>
                    <div className="text-xs text-gray-500 font-normal">Dr. Sarah Chen</div>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-3 space-y-3 flex-1 overflow-hidden flex flex-col">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={startNewSession}
                    className="w-full h-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md text-sm"
                  >
                    <Plus size={14} className="mr-1" />
                    New Session
                  </Button>
                </motion.div>

                <div className="space-y-2 flex-1 min-h-0">
                  <h4 className="text-xs font-semibold text-gray-700 px-1">Recent Sessions</h4>
                  
                  <div className="h-full overflow-y-auto space-y-1 pr-1">
                    {sessions.length > 0 ? (
                      sessions.slice(0, 10).map((session) => (
                        <motion.div
                          key={session._id}
                          whileHover={{ scale: 1.02, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`p-2 rounded-lg cursor-pointer transition-all duration-200 group ${
                            currentSession?._id === session._id 
                              ? 'bg-blue-100 border border-blue-300 shadow-sm' 
                              : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                          }`}
                          onClick={() => loadSession(session)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs text-gray-800 truncate mb-1">
                                {session.title?.length > 25 
                                  ? session.title.substring(0, 25) + '...' 
                                  : session.title || 'New Conversation'
                                }
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span className="capitalize text-xs">{session.mood || 'general'}</span>
                                <span className="text-xs">{new Date(session.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                })}</span>
                              </div>
                            </div>
                            
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => deleteSession(session._id, e)}
                              className="ml-2 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <Trash2 size={12} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        <MessageCircle size={24} className="mx-auto mb-1 opacity-50" />
                        <p className="text-xs">No sessions yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Chat Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`transition-all duration-300 ${
              showSidebar ? 'lg:col-span-3' : 'col-span-1'
            }`}
          >
            <Card className="h-full shadow-lg flex flex-col">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleSidebar}
                      className={`p-2 rounded-lg border transition-all duration-200 ${
                        showSidebar 
                          ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600' 
                          : 'bg-white/80 hover:bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                      title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
                    >
                      <motion.div
                        animate={{ rotate: showSidebar ? 0 : 180 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Menu size={16} />
                      </motion.div>
                    </motion.button>
                    
                    <motion.div
                      animate={{ 
                        rotate: isTyping ? 360 : 0,
                        scale: isTyping ? [1, 1.1, 1] : 1
                      }}
                      transition={{ 
                        rotate: { duration: 2, repeat: isTyping ? Infinity : 0 },
                        scale: { duration: 1, repeat: isTyping ? Infinity : 0 }
                      }}
                      className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <Sparkles size={20} className="text-white" />
                    </motion.div>
                    
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        Dr. Sarah Chen
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {isTyping ? (
                          <span className="flex items-center gap-1">
                            <motion.div
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              💭
                            </motion.div>
                            Thinking...
                          </span>
                        ) : isConnected ? (
                          <span>✨ Ready to help</span>
                        ) : (
                          <span>🔄 Connecting...</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={messages.length > 0 ? "default" : "secondary"} 
                      className="px-2 py-1 bg-white/80 text-gray-700 border border-gray-200 text-xs"
                    >
                      {messages.length}
                    </Badge>
                    
                    {currentSession && (
                      <Badge 
                        variant="outline" 
                        className="px-2 py-1 bg-blue-50 text-blue-700 border-blue-200 text-xs"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full flex flex-col">
                  <div 
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-6 space-y-4"
                  >
                    {messages.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col items-center justify-center h-full space-y-12 px-8"
                      >
                        {/* Welcome Section */}
                        <div className="text-center space-y-6 max-w-lg">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.05, 1],
                              rotate: [0, 2, -2, 0]
                            }}
                            transition={{ 
                              duration: 6, 
                              repeat: Infinity, 
                              repeatDelay: 3,
                              ease: "easeInOut"
                            }}
                            className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
                          >
                            <Brain size={32} className="text-white" />
                          </motion.div>
                          
                          <div className="space-y-3">
                            <h1 className="text-3xl font-bold text-gray-800">
                              Hi there! 👋
                            </h1>
                            <p className="text-lg text-gray-600 leading-relaxed">
                              I'm <span className="font-semibold text-purple-600">Dr. Sarah Chen</span>, 
                              your AI mental health companion
                            </p>
                            <p className="text-gray-500">
                              I'm here to listen, support, and help you navigate whatever you're going through. 
                              Your wellbeing matters.
                            </p>
                          </div>
                        </div>

                        {/* Quick Start Options */}
                        <div className="w-full max-w-2xl space-y-6">
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                              How are you feeling today?
                            </h3>
                            <p className="text-sm text-gray-500">
                              Choose what resonates with you, or share your own thoughts below
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { 
                                text: "I'm feeling anxious", 
                                icon: "😰", 
                                gradient: "from-amber-400 to-orange-500",
                                description: "Let's work through this together"
                              },
                              { 
                                text: "I need some motivation", 
                                icon: "💪", 
                                gradient: "from-emerald-400 to-teal-500",
                                description: "I'll help you find your strength"
                              },
                              { 
                                text: "I'm stressed about school", 
                                icon: "📚", 
                                gradient: "from-violet-400 to-purple-500",
                                description: "Academic pressure is real, let's talk"
                              },
                              { 
                                text: "I'm having trouble sleeping", 
                                icon: "😴", 
                                gradient: "from-blue-400 to-indigo-500",
                                description: "Sleep is so important for wellbeing"
                              }
                            ].map((prompt, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 * index }}
                                whileHover={{ 
                                  scale: 1.03, 
                                  y: -4,
                                  transition: { duration: 0.2 }
                                }}
                                whileTap={{ scale: 0.97 }}
                              >
                                <Button
                                  variant="outline"
                                  className="w-full h-auto p-6 bg-white hover:bg-gray-50 border-2 border-gray-100 hover:border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 group"
                                  onClick={() => handleQuickPrompt(prompt.text)}
                                >
                                  <div className="flex items-start space-x-4 text-left">
                                    <div className={`w-14 h-14 bg-gradient-to-br ${prompt.gradient} rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:shadow-lg transition-shadow`}>
                                      {prompt.icon}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      <div className="font-semibold text-gray-800 text-base">
                                        {prompt.text}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {prompt.description}
                                      </div>
                                    </div>
                                  </div>
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* Bottom Section */}
                        <div className="text-center space-y-4 max-w-md">
                          <div className="flex items-center justify-center space-x-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-gray-600 font-medium">
                              {isConnected ? 'Connected & Ready to Help' : 'Connecting...'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Shield size={14} />
                              <span>Confidential</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageCircle size={14} />
                              <span>24/7 Available</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        <AnimatePresence>
                          {messages.map((message, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{ duration: 0.3 }}
                              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex items-start gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className={`text-xs ${
                                    message.sender === 'user' 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-purple-500 text-white'
                                  }`}>
                                    {message.sender === 'user' ? 'U' : 'SC'}
                                  </AvatarFallback>
                                </Avatar>
                                
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  className={`p-4 rounded-2xl shadow-sm ${
                                    message.isAlert && message.alertType === 'crisis'
                                      ? 'bg-red-50 border-2 border-red-200 text-red-800'
                                      : message.sender === 'user'
                                      ? 'bg-blue-500 text-white rounded-br-md'
                                      : message.sender === 'system'
                                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                                      : 'bg-white border border-gray-200 rounded-bl-md'
                                  }`}
                                >
                                  {message.sender === 'ai' && message.therapistName && (
                                    <div className="text-xs text-gray-500 mb-2 font-medium">
                                      {message.therapistName}
                                    </div>
                                  )}
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {message.text}
                                  </p>
                                  <div className={`text-xs mt-2 ${
                                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                                  }`}>
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </div>
                                </motion.div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        
                        <AnimatePresence>
                          {isTyping && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className="flex justify-start"
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-purple-500 text-white text-xs">
                                    SC
                                  </AvatarFallback>
                                </Avatar>
                                <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-md shadow-sm">
                                  <div className="flex space-x-1">
                                    {[0, 1, 2].map((i) => (
                                      <motion.div
                                        key={i}
                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{
                                          duration: 1,
                                          repeat: Infinity,
                                          delay: i * 0.2
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="border-t bg-white p-3 sticky bottom-0">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder="Share what's on your mind..."
                          className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm"
                        />
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          type="submit"
                          disabled={!inputMessage.trim() || !isConnected}
                          className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                          <Send size={16} />
                        </Button>
                      </motion.div>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Session</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this chat session? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteSession}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AIChat;
