require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const { Server }  = require('socket.io');
const http = require('http');
const postsRoutes = require('./routes/posts');
const placesRoutes = require('./routes/places');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const notificationsRoutes = require('./routes/notifications');
const weatherRoutes = require('./routes/weather');
const chatRoutes = require('./routes/chat');

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

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // join a chat room
  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`Joined room: ${chatId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});