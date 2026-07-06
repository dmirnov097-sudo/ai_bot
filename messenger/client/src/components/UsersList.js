import React from 'react';

function UsersList({ users, onlineUsers, onSelectUser, loading }) {
  return (
    <div className="new-chat-panel">
      <h3>👥 Start New Chat</h3>
      <div className="users-list">
        {users.length === 0 ? (
          <p className="no-users">No users available</p>
        ) : (
          users.map(u => (
            <button
              key={u.id}
              className="user-item"
              onClick={() => onSelectUser([u.id])}
              disabled={loading}
            >
              <span className={`user-status ${onlineUsers.includes(u.id) ? 'online' : 'offline'}`}>
                {onlineUsers.includes(u.id) ? '🟢' : '⚪'}
              </span>
              <span className="user-name">{u.username}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default UsersList;
