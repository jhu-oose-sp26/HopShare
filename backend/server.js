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
// Avatar uploads are sent as base64 in JSON, so allow larger payloads.
app.use(express.json({ limit: '2mb' }));
app.use('/posts', postsRoutes);
app.use('/places', placesRoutes);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

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

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
