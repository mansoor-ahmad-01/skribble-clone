import React, { useState } from 'react';
import socket from '../../socket';
import { useGame } from '../../context/GameContext';

export function Lobby() {
  const { roomId, dispatch } = useGame();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const payload = {
      roomId: roomCode.trim().toUpperCase(),
      playerName: trimmedName,
    };

    // Client-side console log with exact payload before emitting room:join
    console.log('[Lobby] Emitting room:join with payload:', payload);

    socket.emit('room:join', payload, (response) => {
      console.log('[Lobby] Received room:join ack callback response:', response);
      setIsSubmitting(false);
      if (response?.roomId) {
        dispatch({ type: 'SET_ROOM_ID', payload: response.roomId });
      }
    });
  };

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If already joined a room, show the room code
  if (roomId) {
    return (
      <div className="lobby-card joined-card">
        <div className="badge-pill">Room Joined</div>
        <h2 className="lobby-title">Room Code</h2>
        <div className="room-code-box">
          <span className="room-code-text">{roomId}</span>
          <button
            type="button"
            className="action-btn secondary-btn"
            onClick={handleCopyCode}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <p className="lobby-subtitle">Share this 5-letter code with your friends to play together!</p>
      </div>
    );
  }

  return (
    <div className="lobby-card">
      <h2 className="lobby-title">Join or Create Room</h2>
      <p className="lobby-subtitle">Enter your name and join an existing room or create a new one.</p>

      {error && <div className="lobby-error">{error}</div>}

      <form onSubmit={handleSubmit} className="lobby-form">
        <div className="form-group">
          <label htmlFor="playerName">Your Name</label>
          <input
            id="playerName"
            type="text"
            placeholder="Enter your name..."
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            className="lobby-input"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="roomCode">
            Room Code <span className="label-optional">(optional)</span>
          </label>
          <input
            id="roomCode"
            type="text"
            placeholder="e.g. ABC12 (blank to create new)"
            value={roomCode}
            maxLength={10}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="lobby-input uppercase-input"
          />
          <span className="input-helper">Leave empty to generate a random 5-character room code</span>
        </div>

        <button
          type="submit"
          className="action-btn primary-btn submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Connecting...'
            : roomCode.trim()
            ? 'Join Room'
            : 'Create New Room'}
        </button>
      </form>
    </div>
  );
}

export default Lobby;
