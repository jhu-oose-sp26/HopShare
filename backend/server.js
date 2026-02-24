const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const postsRoutes = require('./routes/posts');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/posts', postsRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});