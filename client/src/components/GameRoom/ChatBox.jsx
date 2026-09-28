import React, { useState, useEffect, useRef } from 'react';
import socket from '../../socket';
import { useGame } from '../../context/GameContext';

export function ChatBox() {
  const { roomId, phase, currentDrawerId, guessedCorrectly, mySocketId } = useGame();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Use reactive mySocketId — raw socket.id can be undefined on first render
  const isDrawer = Boolean(mySocketId && mySocketId === currentDrawerId);
  const hasGuessed = mySocketId ? guessedCorrectly.includes(mySocketId) : false;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    function handleMessage(msg) {
      setMessages((prev) => [...prev, msg]);
    }
    socket.on('chat:message', handleMessage);
    
    // Clear chat when the room is left
    if (!roomId) {
      setMessages([]);
    }

    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [roomId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDrawer || hasGuessed || phase !== 'drawing') return;

    const trimmed = inputText.trim();
    if (!trimmed) return;
    
    // Client-side safety: cap at 200 chars
    const safeText = trimmed.slice(0, 200);

    socket.emit('chat:message', {
      roomId,
      text: safeText
    });
    
    setInputText('');
  };

  let placeholder = 'Type your guess here...';
  let isDisabled = false;

  if (phase !== 'drawing') {
    placeholder = 'Chat...';
  } else if (isDrawer) {
    placeholder = "You're drawing!";
    isDisabled = true;
  } else if (hasGuessed) {
    placeholder = 'You guessed it!';
    isDisabled = true;
  }

  return (
    <div className="chatbox-container">
      <div className="chatbox-messages">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`chat-message ${msg.system ? 'chat-message-system' : ''}`}
          >
            {!msg.system && msg.playerName && <span className="chat-author">{msg.playerName}: </span>}
            <span className="chat-text">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chatbox-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          maxLength={200}
          className="chatbox-input"
        />
        <button 
          type="submit" 
          disabled={isDisabled || !inputText.trim()}
          className="chatbox-submit"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatBox;
