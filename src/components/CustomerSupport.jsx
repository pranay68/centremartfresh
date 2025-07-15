import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  MessageCircle, 
  Send, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Bot,
  FileText,
  Paperclip,
  Smile,
  X,
  Minimize2,
  Maximize2,
  HelpCircle,
  Settings,
  Archive,
  Plus
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import toast from 'react-hot-toast';
import './CustomerSupport.css';

const CustomerSupport = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const categories = [
    'Order Issues',
    'Product Questions',
    'Returns & Refunds',
    'Payment Problems',
    'Technical Support',
    'Account Issues',
    'General Inquiry'
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-red-600' }
  ];

  useEffect(() => {
    if (user && isOpen) {
      loadTickets();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (currentTicket) {
      loadMessages(currentTicket.id);
    }
  }, [currentTicket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTickets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const ticketsQuery = query(
        collection(db, 'supportTickets'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const userTickets = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setTickets(userTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
      // For demo purposes, create sample tickets
      createSampleTickets();
    } finally {
      setLoading(false);
    }
  };

  const createSampleTickets = () => {
    const sampleTickets = [
      {
        id: 'ticket1',
        subject: 'Order not delivered',
        category: 'Order Issues',
        priority: 'high',
        status: 'open',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        lastMessage: 'When will my order be delivered?',
        messageCount: 3
      },
      {
        id: 'ticket2',
        subject: 'Product quality issue',
        category: 'Product Questions',
        priority: 'medium',
        status: 'resolved',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        lastMessage: 'Thank you for your help!',
        messageCount: 5
      }
    ];
    setTickets(sampleTickets);
  };

  const loadMessages = async (ticketId) => {
    if (!ticketId) return;
    
    try {
      const messagesQuery = query(
        collection(db, 'supportMessages'),
        where('ticketId', '==', ticketId),
        orderBy('createdAt', 'asc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const ticketMessages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setMessages(ticketMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      // For demo purposes, create sample messages
      createSampleMessages(ticketId);
    }
  };

  const createSampleMessages = (ticketId) => {
    const sampleMessages = [
      {
        id: 'msg1',
        ticketId,
        sender: 'user',
        senderName: user?.displayName || 'User',
        message: 'Hi, I have an issue with my order. It was supposed to be delivered yesterday but I haven\'t received it yet.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'msg2',
        ticketId,
        sender: 'support',
        senderName: 'Support Team',
        message: 'Hello! I\'m sorry to hear about the delay. Let me check your order status for you. Can you please provide your order number?',
        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
      },
      {
        id: 'msg3',
        ticketId,
        sender: 'user',
        senderName: user?.displayName || 'User',
        message: 'My order number is #12345. Thank you for your help!',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ];
    setMessages(sampleMessages);
  };

  const handleCreateTicket = async () => {
    if (!user) {
      toast.error('Please login to create a support ticket');
      return;
    }

    if (!ticketForm.subject || !ticketForm.category || !ticketForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const ticketData = {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        subject: ticketForm.subject,
        category: ticketForm.category,
        priority: ticketForm.priority,
        description: ticketForm.description,
        status: 'open',
        createdAt: serverTimestamp(),
        messageCount: 1
      };

      const ticketRef = await addDoc(collection(db, 'supportTickets'), ticketData);
      
      // Add initial message
      const messageData = {
        ticketId: ticketRef.id,
        sender: 'user',
        senderName: user.displayName || user.email?.split('@')[0] || 'User',
        message: ticketForm.description,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'supportMessages'), messageData);
      
      // Update local state
      const newTicket = {
        id: ticketRef.id,
        ...ticketData,
        createdAt: new Date(),
        lastMessage: ticketForm.description
      };
      setTickets(prev => [newTicket, ...prev]);
      setCurrentTicket(newTicket);
      
      // Reset form
      setTicketForm({
        subject: '',
        category: '',
        priority: 'medium',
        description: ''
      });
      setShowTicketForm(false);
      
      toast.success('Support ticket created successfully!');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create support ticket');
    }
  };

  const handleSendMessage = async () => {
    if (!currentTicket || !newMessage.trim()) return;

    try {
      const messageData = {
        ticketId: currentTicket.id,
        sender: 'user',
        senderName: user.displayName || user.email?.split('@')[0] || 'User',
        message: newMessage.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'supportMessages'), messageData);
      
      // Update local state
      const newMsg = {
        id: Date.now().toString(),
        ...messageData,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, newMsg]);
      
      // Update ticket's last message
      const updatedTickets = tickets.map(ticket =>
        ticket.id === currentTicket.id
          ? { ...ticket, lastMessage: newMessage.trim(), messageCount: ticket.messageCount + 1 }
          : ticket
      );
      setTickets(updatedTickets);
      setCurrentTicket(updatedTickets.find(t => t.id === currentTicket.id));
      
      setNewMessage('');
      
      // Simulate support response after 2 seconds
      setTimeout(() => {
        const supportResponse = {
          id: Date.now().toString() + '_support',
          ticketId: currentTicket.id,
          sender: 'support',
          senderName: 'Support Team',
          message: 'Thank you for your message. Our support team will get back to you shortly.',
          createdAt: new Date()
        };
        setMessages(prev => [...prev, supportResponse]);
      }, 2000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    const priorityInfo = priorities.find(p => p.value === priority);
    return priorityInfo?.color || 'text-gray-600';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!user) {
    return null; // Don't show support widget for non-logged users
  }

  return (
    <>
      {/* Support Widget Button */}
      {!isOpen && (
        <button
          className="support-widget-btn"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle size={20} />
          <span>Support</span>
        </button>
      )}

      {/* Support Chat Window */}
      {isOpen && (
        <div className={`support-chat ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="chat-header">
            <div className="header-left">
              <MessageCircle size={20} />
              <span>Customer Support</span>
              {currentTicket && (
                <span className="ticket-subject">- {currentTicket.subject}</span>
              )}
            </div>
            <div className="header-actions">
              <button
                className="header-btn"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                className="header-btn"
                onClick={() => {
                  setIsOpen(false);
                  setCurrentTicket(null);
                  setShowTicketForm(false);
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="chat-content">
              {!currentTicket ? (
                // Ticket List
                <div className="tickets-view">
                  <div className="tickets-header">
                    <h3>Support Tickets</h3>
                    <Button 
                      size="sm"
                      onClick={() => setShowTicketForm(true)}
                    >
                      <Plus size={16} className="mr-1" />
                      New Ticket
                    </Button>
                  </div>

                  {showTicketForm ? (
                    // Create Ticket Form
                    <div className="ticket-form">
                      <div className="form-header">
                        <h4>Create New Ticket</h4>
                        <button
                          className="close-btn"
                          onClick={() => setShowTicketForm(false)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      <div className="form-content">
                        <div className="form-group">
                          <label>Subject *</label>
                          <input
                            type="text"
                            value={ticketForm.subject}
                            onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                            placeholder="Brief description of your issue"
                            className="form-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>Category *</label>
                          <select
                            value={ticketForm.category}
                            onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                            className="form-input"
                          >
                            <option value="">Select category</option>
                            {categories.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Priority</label>
                          <div className="priority-options">
                            {priorities.map(priority => (
                              <label key={priority.value} className="priority-option">
                                <input
                                  type="radio"
                                  value={priority.value}
                                  checked={ticketForm.priority === priority.value}
                                  onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})}
                                />
                                <span className={priority.color}>{priority.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Description *</label>
                          <textarea
                            value={ticketForm.description}
                            onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                            placeholder="Please describe your issue in detail..."
                            rows={4}
                            className="form-input"
                          />
                        </div>

                        <Button 
                          onClick={handleCreateTicket}
                          disabled={!ticketForm.subject || !ticketForm.category || !ticketForm.description}
                          className="w-full"
                        >
                          <Send size={16} className="mr-2" />
                          Create Ticket
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Tickets List
                    <div className="tickets-list">
                      {loading ? (
                        <div className="loading">Loading tickets...</div>
                      ) : tickets.length === 0 ? (
                        <div className="no-tickets">
                          <HelpCircle size={48} className="no-tickets-icon" />
                          <h4>No support tickets</h4>
                          <p>Create a new ticket to get help</p>
                          <Button onClick={() => setShowTicketForm(true)}>
                            Create Ticket
                          </Button>
                        </div>
                      ) : (
                        tickets.map(ticket => (
                          <div
                            key={ticket.id}
                            className={`ticket-item ${currentTicket?.id === ticket.id ? 'active' : ''}`}
                            onClick={() => setCurrentTicket(ticket)}
                          >
                            <div className="ticket-info">
                              <h4 className="ticket-subject">{ticket.subject}</h4>
                              <p className="ticket-category">{ticket.category}</p>
                              <p className="ticket-last-message">{ticket.lastMessage}</p>
                            </div>
                            <div className="ticket-meta">
                              <span className={`ticket-status ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                              </span>
                              <span className={`ticket-priority ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                              <span className="ticket-time">
                                {formatTimeAgo(ticket.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Chat View
                <div className="chat-view">
                  <div className="chat-messages">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`message ${message.sender === 'user' ? 'user' : 'support'}`}
                      >
                        <div className="message-avatar">
                          {message.sender === 'user' ? (
                            <User size={16} />
                          ) : (
                            <Bot size={16} />
                          )}
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <span className="message-sender">{message.senderName}</span>
                            <span className="message-time">
                              {formatTimeAgo(message.createdAt)}
                            </span>
                          </div>
                          <p className="message-text">{message.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="chat-input">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your message..."
                        className="message-input"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="send-btn"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default CustomerSupport; 