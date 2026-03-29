const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const postsRoutes = require('./routes/posts');
const placesRoutes = require('./routes/places');
const authRoutes = require('./routes/auth');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/posts', postsRoutes);
app.use('/places', placesRoutes);
app.use('/auth', authRoutes);
app.use('/notifications', notificationsRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
