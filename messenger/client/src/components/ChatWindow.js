import React, { useState, useEffect, useRef } from 'react';

function ChatWindow({ chat, messages, user, token, socket, onMessageSent }) {
  const [inputValue, setInputValue] = useState('');
  const [typingStatus, setTypingStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socket.on('user_typing', (data) => {
      if (data.userId !== user.id) {
        setTypingStatus(`${data.username} is typing...`);
        setTimeout(() => setTypingStatus(null), 3000);
      }
    });

    return () => {
      socket.off('user_typing');
    };
  }, [socket, user.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chat_id: chat.id,
          content: inputValue
        })
      });

      if (response.ok) {
        const message = await response.json();
        socket.emit('send_message', {
          ...message,
          chat_id: chat.id,
          username: user.username
        });
        onMessageSent(message);
        setInputValue('');
        setTypingStatus(null);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleTyping = () => {
    socket.emit('typing', {
      chat_id: chat.id,
      username: user.username,
      userId: user.id
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    handleTyping();
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{chat.name}</h3>
        <span className="chat-subtitle">💬 {messages.length} messages</span>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>📭 No messages yet. Start the conversation! 👋</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                <strong>{msg.username}</strong>
                <p>{msg.content}</p>
                <span className="message-time">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        {typingStatus && <div className="typing-indicator">{typingStatus}</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input-form">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-btn">➤</button>
      </form>
    </div>
  );
}

export default ChatWindow;
