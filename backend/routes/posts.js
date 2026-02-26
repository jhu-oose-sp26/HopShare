const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

function toObjectId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}


// READ ALL POSTS
router.get('/', async (req, res) => { 
  const posts = await getDB().collection('posts').find().toArray();
  res.json(posts);
});

// GET ONE POST
router.get('/:id', async (req, res) => { 
  const postId = toObjectId(req.params.id);
  if (!postId) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  const post = await getDB().collection('posts').findOne({ _id: postId });

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json(post);
});

// CREATE
router.post('/', async (req, res) => { 
  try {
    const postInfo = req.body || {};
      // validate the post info
  if (postInfo.title===null || postInfo.description===null) {
    return res.status(400).json({ error: 'Title and description are required' });
  }
    const db = getDB();
    const postsCollection = db.collection('posts');
    const tripsCollection = db.collection('trips');

    const postResult = await postsCollection.insertOne(postInfo);
    let tripId = null;

    if (postInfo.trip) {
      const tripResult = await tripsCollection.insertOne({
        ...postInfo.trip,
        postId: postResult.insertedId,
      });

      tripId = tripResult.insertedId;

      await postsCollection.updateOne(
        { _id: postResult.insertedId },
        { $set: { tripId } }
      );
    }

    res.status(201).json({
      acknowledged: postResult.acknowledged,
      postId: postResult.insertedId,
      tripId,
    });
  } catch (error) {
    console.error('Failed to create post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});


// DELETE
router.delete('/:id', async (req, res) => { 
  const postId = toObjectId(req.params.id);
  
  if (!postId) {
    return res.status(400).json({ error: 'Invalid post id' });
  }
  const postDeleteResult = await getDB().collection('posts').deleteOne({ _id: postId });

  if (postDeleteResult.deletedCount === 0) {
    return res.status(404).json({ error: 'Post not found' });
  }
  // delete the related trips
  await getDB().collection('trips').deleteMany({ postId });
  res.json({ success: true });
});

// UPDATE
router.put('/:id', async (req, res) => { 
  try {
    const { ObjectId } = require('mongodb');

    const { id } = req.params;
    const updateData = req.body;

    // update the post data
    const result = await db
      .collection('posts')
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

module.exports = router;
