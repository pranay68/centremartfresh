import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Support.css';

const Support = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [faqAutoReplies, setFaqAutoReplies] = useState([
    {
      id: 1,
      question: 'How do I track my order?',
      answer: 'You can track your order by going to your account dashboard and clicking on "My Orders". You\'ll find your tracking number there.',
      keywords: ['track', 'order', 'tracking', 'where is my order']
    },
    {
      id: 2,
      question: 'What is your return policy?',
      answer: 'We offer a 30-day return policy for most items. Items must be unused and in original packaging. Contact our support team to initiate a return.',
      keywords: ['return', 'refund', 'policy', 'exchange']
    },
    {
      id: 3,
      question: 'How long does shipping take?',
      answer: 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. International shipping takes 7-14 business days.',
      keywords: ['shipping', 'delivery', 'how long', 'eta']
    },
    {
      id: 4,
      question: 'Do you ship internationally?',
      answer: 'Yes, we ship to most countries worldwide. International shipping costs and delivery times vary by location.',
      keywords: ['international', 'overseas', 'country', 'worldwide']
    },
    {
      id: 5,
      question: 'How can I contact customer service?',
      answer: 'You can contact us through this chat, email us at support@centremart.com, or call us at 1-800-CENTRE-MART.',
      keywords: ['contact', 'help', 'support', 'customer service']
    }
  ]);

  useEffect(() => {
    // Listen to all customer support chats
    const q = query(
      collection(db, 'supportChats'),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeMessages;
    let chatId = selectedChat?.id;
    if (selectedChat) {
      // Mark admin as online for this chat
      updateDoc(doc(db, 'supportChats', chatId), { adminOnline: true });
      // Listen to messages for selected chat
      const q = query(
        collection(db, 'supportChats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );
      unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSelectedChat(prev => ({
          ...prev,
          messages
        }));
      });
    }
    return () => {
      if (chatId) {
        // Mark admin as offline when leaving chat
        updateDoc(doc(db, 'supportChats', chatId), { adminOnline: false });
      }
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, [selectedChat?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const messageData = {
      text: newMessage,
      sender: 'admin',
      timestamp: serverTimestamp(),
      isAutoReply: false
    };

    try {
      await addDoc(collection(db, 'supportChats', selectedChat.id, 'messages'), messageData);
      
      // Update chat's last message time
      await updateDoc(doc(db, 'supportChats', selectedChat.id), {
        lastMessageTime: serverTimestamp(),
        status: 'active'
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendAutoReply = async (reply) => {
    if (!selectedChat) return;

    const messageData = {
      text: reply,
      sender: 'admin',
      timestamp: serverTimestamp(),
      isAutoReply: true
    };

    try {
      await addDoc(collection(db, 'supportChats', selectedChat.id, 'messages'), messageData);
      
      await updateDoc(doc(db, 'supportChats', selectedChat.id), {
        lastMessageTime: serverTimestamp(),
        status: 'active'
      });
    } catch (error) {
      console.error('Error sending auto-reply:', error);
    }
  };

  const closeChat = async (chatId) => {
    try {
      await updateDoc(doc(db, 'supportChats', chatId), {
        status: 'closed',
        closedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const getFilteredChats = () => {
    let filtered = chats;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(chat => chat.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(chat => 
        chat.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getUnreadCount = (chat) => {
    return chat.messages?.filter(msg => 
      msg.sender === 'customer' && !msg.read
    ).length || 0;
  };

  const markAsRead = async (chatId) => {
    try {
      const messagesRef = collection(db, 'supportChats', chatId, 'messages');
      const unreadMessages = selectedChat.messages.filter(msg => 
        msg.sender === 'customer' && !msg.read
      );

      for (const message of unreadMessages) {
        await updateDoc(doc(db, 'supportChats', chatId, 'messages', message.id), {
          read: true
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const filteredChats = getFilteredChats();

  return (
    <div className="support-page">
      <div className="support-header">
        <h1>Customer Support</h1>
        <div className="support-stats">
          <div className="stat-card">
            <span className="stat-number">{chats.filter(c => c.status === 'active').length}</span>
            <span className="stat-label">Active Chats</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{chats.filter(c => c.status === 'pending').length}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{chats.filter(c => c.status === 'closed').length}</span>
            <span className="stat-label">Closed</span>
          </div>
        </div>
      </div>

      <div className="support-container">
        {/* Chat List */}
        <div className="chat-list">
          <div className="chat-list-header">
            <h3>Customer Chats</h3>
            <div className="chat-filters">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="status-filter"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="chat-list-content">
            {filteredChats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''} ${chat.status}`}
                onClick={() => {
                  setSelectedChat(chat);
                  if (chat.status === 'active') {
                    markAsRead(chat.id);
                  }
                }}
              >
                <div className="chat-item-header">
                  <span className="customer-name">{chat.customerName || 'Anonymous'}</span>
                  <span className={`status-badge ${chat.status}`}>{chat.status}</span>
                </div>
                <div className="chat-item-preview">
                  {chat.lastMessage || 'No messages yet'}
                </div>
                <div className="chat-item-footer">
                  <span className="timestamp">
                    {chat.lastMessageTime?.toDate?.()?.toLocaleString() || 'Just now'}
                  </span>
                  {getUnreadCount(chat) > 0 && (
                    <span className="unread-badge">{getUnreadCount(chat)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="chat-window">
          {selectedChat ? (
            <>
              <div className="chat-header">
                <div className="chat-customer-info">
                  <h3>{selectedChat.customerName || 'Anonymous'}</h3>
                  <span className={`status-badge ${selectedChat.status}`}>
                    {selectedChat.status}
                  </span>
                </div>
                <div className="chat-actions">
                  {selectedChat.status !== 'closed' && (
                    <button
                      className="close-chat-btn"
                      onClick={() => closeChat(selectedChat.id)}
                    >
                      Close Chat
                    </button>
                  )}
                </div>
              </div>

              <div className="chat-messages">
                {selectedChat.messages?.map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.sender === 'admin' ? 'admin' : 'customer'} ${message.isAutoReply ? 'auto-reply' : ''}`}
                  >
                    <div className="message-content">
                      {message.text}
                    </div>
                    <div className="message-time">
                      {message.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}
                      {message.isAutoReply && <span className="auto-reply-tag">Auto</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input-section">
                <div className="auto-replies">
                  <h4>Quick Replies:</h4>
                  <div className="auto-reply-buttons">
                    {faqAutoReplies.map(faq => (
                      <button
                        key={faq.id}
                        className="auto-reply-btn"
                        onClick={() => sendAutoReply(faq.answer)}
                      >
                        {faq.question}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="message-input">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    className="send-btn"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="no-chat-icon">💬</div>
              <h3>Select a chat to start</h3>
              <p>Choose a customer chat from the list to begin supporting them</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Support; 