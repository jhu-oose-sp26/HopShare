require('dotenv').config();
const { MongoClient } = require('mongodb');

async function seed() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db();
  const posts = db.collection('posts');

  await posts.insertOne({
    creatorId: 1,
    content: "Seed test post",
    trip: null
  });

  console.log("Database seeded");
  await client.close();
}

seed();