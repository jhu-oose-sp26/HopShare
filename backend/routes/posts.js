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
  const postInfo = req.body;

  // validate the post info
  if (postInfo.title===null || postInfo.description===null) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const db = getDB();
  const result = await db.collection('posts').insertOne(postInfo);
  const tripsCollection = db.collection('trips');

  let tripId = null;
  // if there has trip info, insert it into the trips collection
  if (postInfo.trip) {
    const tripResult = await tripsCollection.insertOne({
        ...postInfo.trip,
        postId: result.insertedId,
      });
      tripId = tripResult.insertedId;
  }

  if (tripId) {
    await db.collection('posts').updateOne(
      { _id: result.insertedId },
      { $set: { tripId } }
    );
  }

    res.status(201).json({ ...result, postId: result.insertedId, tripId: tripId || null });
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
