import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AIBrain from './AIBrain';
import './AIChat.css';

const AIChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { processCustomerMessage } = AIBrain();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await processCustomerMessage(inputMessage, user?.uid || 'anonymous');
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble right now. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitialMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Hello!';
    
    if (hour < 12) greeting = 'Good morning!';
    else if (hour < 17) greeting = 'Good afternoon!';
    else greeting = 'Good evening!';

    return {
      id: 0,
      text: `${greeting} I'm your AI assistant. How can I help you today? I can help with orders, products, returns, and more!`,
      sender: 'ai',
      timestamp: new Date()
    };
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (messages.length === 0) {
      setMessages([getInitialMessage()]);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isOpen) {
    return (
      <div className="ai-chat-toggle" onClick={handleOpen}>
        <Bot size={24} />
        <span>AI Assistant</span>
      </div>
    );
  }

  return (
    <div className={`ai-chat ${isMinimized ? 'minimized' : ''}`}>
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <Bot size={20} />
          <span>AI Assistant</span>
        </div>
        <div className="ai-chat-controls">
          <button onClick={handleMinimize} className="ai-chat-btn">
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={handleClose} className="ai-chat-btn">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="ai-chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-message ${message.sender === 'user' ? 'user' : 'ai'}`}
              >
                <div className="ai-message-avatar">
                  {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="ai-message-content">
                  <div className="ai-message-text">{message.text}</div>
                  <div className="ai-message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="ai-message ai">
                <div className="ai-message-avatar">
                  <Bot size={16} />
                </div>
                <div className="ai-message-content">
                  <div className="ai-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="ai-send-btn"
            >
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChat; 