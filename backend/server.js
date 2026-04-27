require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB, getDB } = require('./db');
const { Server }  = require('socket.io');
const http = require('http');
const postsRoutes = require('./routes/posts');
const placesRoutes = require('./routes/places');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const notificationsRoutes = require('./routes/notifications');
const weatherRoutes = require('./routes/weather');
const chatRoutes = require('./routes/chat');
const friendsRouter = require('./routes/friends');

const app = express();
const PORT = 3000;

app.use(cors());
// Avatar uploads are sent as base64 in JSON, so allow larger payloads.
app.use(express.json({ limit: '2mb' }));
app.use('/posts', postsRoutes);
app.use('/places', placesRoutes);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/weather', weatherRoutes);
app.use('/chat', chatRoutes);
app.use('/friends', friendsRouter);

// Return JSON for body-size errors so frontend does not receive HTML pages.
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Avatar payload is too large. Please upload a smaller image.',
    });
  }

  if (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  return next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.set('io', io);

// Change Stream for realtime posts
function setupPostsChangeStream() {
  const db = getDB();
  const postsCollection = db.collection('posts');

  const changeStream = postsCollection.watch([], {
    fullDocument: 'updateLookup'
  });

  console.log('MongoDB Change Stream setup for posts collection');

  changeStream.on('change', async (change) => {
    console.log('Posts change detected:', change.operationType);

    try {
      let post = change.fullDocument;

      // Enrich with googleId if needed (referring to enrichPostsWithGoogleIds func in routes/posts.js)
      if (post && post.user?.email && !post.user?.googleId) {
        const user = await db.collection('users').findOne(
          { email: post.user.email },
          { projection: { googleId: 1 } }
        );
        if (user?.googleId) {
          post.user.googleId = user.googleId;
        }
      }

      switch (change.operationType) {
        case 'insert':
          io.emit('post:created', { post });
          console.log('Broadcasted new post:', post._id);
          break;

        case 'update':
        case 'replace':
          if (post) {
            io.emit('post:updated', { post });
            console.log('Broadcasted updated post:', post._id);
          }
          break;

        case 'delete':
          const postId = change.documentKey._id.toString();
          io.emit('post:deleted', { postId });
          console.log('Broadcasted deleted post:', postId);
          break;

        default:
          io.emit('posts:refresh');
      }
    } catch (err) {
      console.error('Error processing change stream event:', err);
    }
  });

  changeStream.on('error', (error) => {
    console.error('Change stream error:', error);
  });
}

// Change Stream for real-time notifications
function setupNotificationsChangeStream() {
  const db = getDB();
  const notificationsCollection = db.collection('notifications');

  const changeStream = notificationsCollection.watch([], {
    fullDocument: 'updateLookup'
  });

  console.log('MongoDB Change Stream setup for notifications collection');

  changeStream.on('change', async (change) => {
    console.log('Notifications change detected:', change.operationType);

    try {
      switch (change.operationType) {
        case 'insert': {
          const notification = change.fullDocument;
          const recipientId = notification.recipientId?.toString();
          if (recipientId) {
            io.emit(`notification:created:${recipientId}`, { notification });
            console.log('Broadcasted new notification to user:', recipientId);
          }
          break;
        }

        case 'update':
        case 'replace': {
          const notification = change.fullDocument;
          if (notification) {
            const recipientId = notification.recipientId?.toString();
            if (recipientId) {
              io.emit(`notification:updated:${recipientId}`, { notification });
              console.log('Broadcasted updated notification to user:', recipientId);
            }
          }
          break;
        }

        case 'delete': {
          const notificationId = change.documentKey._id.toString();
          io.emit('notification:deleted', { notificationId });
          console.log('Broadcasted deleted notification:', notificationId);
          break;
        }
      }
    } catch (err) {
      console.error('Error processing notification change stream event:', err);
    }
  });

  changeStream.on('error', (error) => {
    console.error('Notifications change stream error:', error);
  });
}

connectDB().then(() => {
  setupPostsChangeStream();
  setupNotificationsChangeStream();
  
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("leaveChat", (chatId) => {
    socket.leave(chatId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});