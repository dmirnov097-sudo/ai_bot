import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';

const socket = io('http://localhost:5000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
    if (token) {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData) {
        setUser(userData);
        socket.emit('user_join', userData.id);
      }
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    socket.disconnect();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      {token && user ? (
        <ChatPage user={user} token={token} socket={socket} onLogout={handleLogout} />
      ) : (
        <LoginPage setToken={setToken} setUser={setUser} socket={socket} />
      )}
    </div>
  );
}

export default App;
