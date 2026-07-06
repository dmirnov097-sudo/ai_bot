import React, { useState, useEffect } from 'react';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import UsersList from '../components/UsersList';
import '../styles/ChatPage.css';

function ChatPage({ user, token, socket, onLogout }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Загрузить чаты
  useEffect(() => {
    fetchChats();
    fetchUsers();
    
    const interval = setInterval(() => {
      fetchChats();
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  const fetchChats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // Загрузить сообщения чата
  useEffect(() => {
    if (selectedChat) {
      setMessages([]);
      fetchMessages();
      socket.emit('join_chat', selectedChat.id);
    }
    
    return () => {
      if (selectedChat) {
        socket.emit('leave_chat', selectedChat.id);
      }
    };
  }, [selectedChat]);

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const response = await fetch(
        `http://localhost:5000/api/chats/${selectedChat.id}/messages`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  // Socket слушатели
  useEffect(() => {
    socket.on('receive_message', (data) => {
      if (selectedChat && data.chat_id === selectedChat.id) {
        setMessages(prev => [...prev, data]);
      }
    });

    socket.on('users_online', (userIds) => {
      setOnlineUsers(userIds);
    });

    return () => {
      socket.off('receive_message');
      socket.off('users_online');
    };
  }, [socket, selectedChat]);

  const handleCreateChat = async (selectedUsers) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: selectedUsers.length > 1 
            ? 'Group Chat' 
            : users.find(u => u.id === selectedUsers[0])?.username || 'Chat',
          user_ids: selectedUsers
        })
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats(prev => [newChat, ...prev]);
        setShowNewChat(false);
        setSelectedChat(newChat);
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>💬 Messenger</h2>
          <div className="header-buttons">
            <button className="new-chat-btn" onClick={() => setShowNewChat(!showNewChat)} title="New Chat">➕</button>
            <button className="logout-btn" onClick={onLogout} title="Logout">🚪</button>
          </div>
        </div>

        {showNewChat && (
          <UsersList
            users={users}
            onlineUsers={onlineUsers}
            onSelectUser={handleCreateChat}
            loading={loading}
          />
        )}

        <ChatList
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onlineUsers={onlineUsers}
        />
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            messages={messages}
            user={user}
            token={token}
            socket={socket}
            onMessageSent={(msg) => setMessages(prev => [...prev, msg])}
          />
        ) : (
          <div className="empty-state">
            <h2>Welcome! 👋</h2>
            <p>Select a chat to start messaging or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
