import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Smile,
  Mic,
  Paperclip,
  Info,
  Terminal
} from 'lucide-react';
import { processUserMessage, initialConversationState } from '../services/humanisticAiAgent';
import { CLINIC_INFO } from '../data/clinicData';

export function WhatsAppChat({ onAppointmentUpdated }) {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'bot',
      text: `Hey! I’m Ava, the AI assistant from BrightSmile Dental Clinic 😊 How can I assist you today?`,
      timestamp: formatTime(new Date())
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiState, setAiState] = useState({ ...initialConversationState, hasIntroduced: true });
  const [viewMode, setViewMode] = useState('mobile');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend) => {
    const messageText = textToSend || inputText;
    if (!messageText.trim()) return;

    const userMsgObj = {
      id: `m_${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: formatTime(new Date()),
      status: 'read'
    };

    setMessages(prev => [...prev, userMsgObj]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const response = processUserMessage(messageText, aiState);
      setAiState(response.state);

      const botMsgObj = {
        id: `m_${Date.now() + 1}`,
        sender: 'bot',
        text: response.text,
        timestamp: formatTime(new Date()),
        toolCalls: response.toolCalls
      };

      setMessages(prev => [...prev, botMsgObj]);
      setIsTyping(false);

      if (onAppointmentUpdated) {
        onAppointmentUpdated();
      }
    }, 900);
  };

  const handleResetChat = () => {
    setAiState({ ...initialConversationState, hasIntroduced: true });
    setMessages([
      {
        id: 'm_reset',
        sender: 'bot',
        text: `Hey! I’m Ava, the AI assistant from BrightSmile Dental Clinic 😊 How can I assist you today?`,
        timestamp: formatTime(new Date())
      }
    ]);
  };

  return (
    <div className="whatsapp-container-wrapper font-sans">
      {/* Simulator Toolbar */}
      <div className="sim-toolbar">
        <div className="sim-badge">
          <Sparkles className="icon-sm text-cyan" />
          <span>Ava (BrightSmile AI Assistant) • IST Timezone</span>
        </div>
        <div className="sim-controls">
          <button
            className={`sim-btn ${viewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewMode('mobile')}
          >
            📱 Mobile Frame
          </button>
          <button
            className={`sim-btn ${viewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            💻 Desktop Web View
          </button>
          <button className="sim-btn reset-btn" onClick={handleResetChat} title="Reset Chat / Type 'restart'">
            <RefreshCw className="icon-sm" /> Restart Chat
          </button>
        </div>
      </div>

      {/* Main WhatsApp Frame */}
      <div className={`whatsapp-window ${viewMode === 'desktop' ? 'desktop-frame' : 'mobile-frame'}`}>
        {/* WhatsApp Header */}
        <div className="wa-header">
          <div className="wa-avatar-container">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
              alt="Ava AI Assistant"
              className="wa-avatar"
            />
            <span className="online-indicator"></span>
          </div>

          <div className="wa-header-info">
            <div className="wa-header-name">
              <span>Ava (BrightSmile Assistant)</span>
              <ShieldCheck className="verified-icon" title="Verified Business AI" />
            </div>
            <div className="wa-header-status">
              {isTyping ? <span className="typing-text">typing...</span> : <span>Online | 24/7 IST Support</span>}
            </div>
          </div>

          <div className="wa-header-actions">
            <Phone className="wa-icon-btn" title="Call Clinic" />
            <Video className="wa-icon-btn" title="Video Call" />
            <MoreVertical className="wa-icon-btn" title="Options" />
          </div>
        </div>

        {/* WhatsApp Chat Body */}
        <div className="wa-chat-body">
          <div className="wa-encryption-notice">
            <Info className="icon-xs" /> Messages are end-to-end encrypted with BrightSmile Dental Security.
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`wa-msg-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}>
              <div className={`wa-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                {msg.sender === 'bot' && <div className="bot-name-tag">Ava • BrightSmile Assistant</div>}

                {/* Simulated Tool Execution Tag */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="tool-execution-badge font-mono">
                    <Terminal className="icon-xs" /> tool_call: {msg.toolCalls[0].name}()
                  </div>
                )}

                {/* Plain Text Message Content */}
                <div className="msg-text-content" style={{ whiteSpace: 'pre-line' }}>
                  {msg.text}
                </div>

                <div className="msg-meta">
                  <span className="msg-time">{msg.timestamp}</span>
                  {msg.sender === 'user' && <CheckCheck className="double-tick" />}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="wa-msg-row bot-row">
              <div className="wa-bubble bot-bubble typing-bubble">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="wa-input-bar">
          <Smile className="wa-input-icon" />
          <Paperclip className="wa-input-icon" />
          <input
            type="text"
            className="wa-input-field"
            placeholder="Type a message or ask a question..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          {inputText.trim() ? (
            <button className="wa-send-btn" onClick={() => handleSendMessage()}>
              <Send className="icon-sm" />
            </button>
          ) : (
            <button className="wa-mic-btn" title="Record Audio Note">
              <Mic className="icon-sm" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
