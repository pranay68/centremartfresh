import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './CustomerSupport.css';

const CustomerSupportChat = ({ isOpen, onClose, customerId, customerName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState('pending');
  const [adminOnline, setAdminOnline] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      initializeChat();
    }
  }, [isOpen, customerId]);

  useEffect(() => {
    if (isOpen && chatId) {
      // Listen for adminOnline status
      const chatDocRef = doc(db, 'supportChats', chatId);
      const unsubscribe = onSnapshot(chatDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setAdminOnline(!!docSnap.data().adminOnline);
        }
      });
      return () => unsubscribe();
    }
  }, [isOpen, chatId]);

  const initializeChat = async () => {
    setIsLoading(true);
    try {
      // Create a new chat session
      const chatData = {
        customerId: customerId,
        customerName: customerName || 'Anonymous',
        status: 'pending',
        createdAt: serverTimestamp(),
        lastMessageTime: serverTimestamp(),
        lastMessage: 'Chat initiated'
      };

      const chatRef = await addDoc(collection(db, 'supportChats'), chatData);
      setChatId(chatRef.id);

      // Add initial message
      const initialMessage = {
        text: 'Hello! How can we help you today?',
        sender: 'admin',
        timestamp: serverTimestamp(),
        isAutoReply: true
      };

      await addDoc(collection(db, 'supportChats', chatRef.id, 'messages'), initialMessage);

      // Listen to messages
      const messagesQuery = query(
        collection(db, 'supportChats', chatRef.id, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messageList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messageList);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    const messageData = {
      text: newMessage,
      sender: 'customer',
      timestamp: serverTimestamp(),
      read: false
    };

    try {
      await addDoc(collection(db, 'supportChats', chatId, 'messages'), messageData);
      
      // Update chat's last message
      await updateDoc(doc(db, 'supportChats', chatId), {
        lastMessage: newMessage,
        lastMessageTime: serverTimestamp(),
        status: 'active'
      });

      setNewMessage('');
      setChatStatus('active');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="customer-support-chat">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">💬</span>
          <h3>Customer Support</h3>
        </div>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {isLoading ? (
          <div className="loading-message">
            <div className="loading-spinner"></div>
            <p>Connecting to support...</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`message ${message.sender === 'customer' ? 'customer' : 'admin'}`}
            >
              <div className="message-content">
                {message.text}
              </div>
              <div className="message-time">
                {message.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}
                {message.isAutoReply && <span className="auto-reply-tag">Auto</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="chat-input">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!newMessage.trim() || isLoading}
        >
          Send
        </button>
      </div>

      <div className="chat-status">
        {adminOnline ? (
          <span className="status-indicator active">Support Agent is Online</span>
        ) : (
          <span className="status-indicator pending">Waiting for agent...</span>
        )}
        {chatStatus === 'closed' && (
          <span className="status-indicator closed">Chat closed</span>
        )}
      </div>
    </div>
  );
};

export default CustomerSupportChat; 