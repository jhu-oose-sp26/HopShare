require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const postsRoutes = require('./routes/posts');
const placesRoutes = require('./routes/places');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/posts', postsRoutes);
app.use('/places', placesRoutes);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
