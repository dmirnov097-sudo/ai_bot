# Messenger App

Real-time chat application built with Node.js, Express, Socket.io, React, and PostgreSQL.

## Setup

### Backend

1. Navigate to the messenger directory:
   ```bash
   cd messenger
   npm install
   ```

2. Create `.env` file:
   ```
   PORT=5000
   DATABASE_URL=postgresql://postgres@localhost/messenger_db
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   ```

3. Start the server:
   ```bash
   npm start
   ```

### Database

1. Create PostgreSQL database:
   ```bash
   createdb messenger_db
   psql messenger_db
   ```

2. Run these SQL commands:
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(255) UNIQUE NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     avatar_url TEXT,
     bio TEXT,
     status VARCHAR(50) DEFAULT 'offline',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE chats (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255),
     is_group BOOLEAN DEFAULT FALSE,
     avatar_url TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE chat_members (
     id SERIAL PRIMARY KEY,
     chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
     user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
     joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE(chat_id, user_id)
   );

   CREATE TABLE messages (
     id SERIAL PRIMARY KEY,
     chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
     sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
     content TEXT NOT NULL,
     is_edited BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### Frontend

1. Navigate to client directory:
   ```bash
   cd client
   npm install
   ```

2. Start the app:
   ```bash
   npm start
   ```

3. Open http://localhost:3000 in your browser

## Architecture

- **Backend**: Express.js server with Socket.io for real-time communication
- **Frontend**: React with Socket.io client
- **Database**: PostgreSQL
- **Communication**: WebSockets (Socket.io)

## Features

- Real-time messaging
- User authentication
- Chat rooms
- User status
- Message history
