import React from 'react';

function ChatList({ chats, selectedChat, onSelectChat, onlineUsers }) {
  return (
    <div className="chat-list">
      {chats.length === 0 ? (
        <div className="empty-chats">
          <p>📭 No chats yet</p>
        </div>
      ) : (
        chats.map(chat => {
          const isOnline = chat.is_group ? false : onlineUsers.some(uid => uid);
          return (
            <div
              key={chat.id}
              className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat)}
            >
              <div className="chat-avatar">
                {chat.is_group ? '👥' : '💬'}
              </div>
              <div className="chat-info">
                <h4>{chat.name}</h4>
                <p>{isOnline ? '🟢 Online' : '🕐 Last message'}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default ChatList;
