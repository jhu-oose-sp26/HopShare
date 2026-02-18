const express = require('express');
const { connectDB, getDB } = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());

connectDB().then(async () => {
  console.log('Database is connected');

  const db = getDB();
  const postsCollection = db.collection('posts');

  // one mock post
  // placeholder IDs for now (creatorId and trip)
  await postsCollection.insertOne({
    creatorId: 1,        // placeholder until we create users
    content: 'This is the first post in HopShare!',
    trip: null           // placeholder until trips exist
  });

  console.log('Inserted a mock post');

  // route that gets all posts
  app.get('/posts', async (req, res) => {
    const posts = await postsCollection.find().toArray();
    res.json(posts);
  });

  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
});
