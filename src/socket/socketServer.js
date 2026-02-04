import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { User } from '../models/User.js';
import { ForumPost, ForumComment } from '../models/DomainModels.js';

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.userId})`);

    // Join forum room
    socket.on('join-forum', () => {
      socket.join('forum');
      console.log(`User ${socket.user.name} joined forum`);
    });

    // Leave forum room
    socket.on('leave-forum', () => {
      socket.leave('forum');
    });

    // New post created
    socket.on('new-post', async (postData) => {
      try {
        const post = await ForumPost.findById(postData._id)
          .populate('author', 'name role');
        
        // Broadcast to all users in forum room
        io.to('forum').emit('post-created', post);
      } catch (err) {
        console.error('Error broadcasting new post:', err);
      }
    });

    // New comment added
    socket.on('new-comment', async (commentData) => {
      try {
        const comment = await ForumComment.findById(commentData._id)
          .populate('author', 'name role');
        
        // Broadcast to all users in forum room
        io.to('forum').emit('comment-added', {
          comment,
          postId: commentData.post,
        });
      } catch (err) {
        console.error('Error broadcasting new comment:', err);
      }
    });

    // Post liked
    socket.on('post-liked', (data) => {
      // Broadcast like update
      io.to('forum').emit('post-like-updated', {
        postId: data.postId,
        likes: data.likes,
      });
    });

    // User typing indicator
    socket.on('typing', (data) => {
      socket.to('forum').emit('user-typing', {
        userId: socket.userId,
        userName: socket.user.name,
        postId: data.postId,
      });
    });

    socket.on('stop-typing', (data) => {
      socket.to('forum').emit('user-stopped-typing', {
        userId: socket.userId,
        postId: data.postId,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

