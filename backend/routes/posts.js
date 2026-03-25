const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

function toObjectId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

// Generates a 6-digits code.
function generateConfirmationCode() {
  const chars = '0123456789'; // omit 0/O/1/I to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

    postInfo.confirmationCode = generateConfirmationCode();
    const postResult = await postsCollection.insertOne(postInfo);
    let tripId = null;

    if (postInfo.trip) {
      // insert the trip and get the tripId
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
    const postId = toObjectId(req.params.id);
    if (!postId) {
      return res.status(400).json({ error: 'Invalid post id' });
    }

    // get the update data
    const updateData = { ...(req.body || {}) };
    delete updateData._id;

    const db = getDB();
    const postsCollection = db.collection('posts');
    const tripsCollection = db.collection('trips');

    const result = await postsCollection.updateOne(
      { _id: postId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let tripId = null;

    // update the trip
    if (Object.prototype.hasOwnProperty.call(updateData, 'trip')) {
      // check if trip field has content (not null/empty object)
      const hasTripValue =
        updateData.trip &&(typeof updateData.trip !== 'object' || Object.keys(updateData.trip).length > 0);

      // create/update trip only when trip has content
      if (hasTripValue) {
        // get the existing trip by postID
        const existingTrip = await tripsCollection.findOne({ postId });

        if (existingTrip) {
          // update the trip
          await tripsCollection.updateOne(
            { _id: existingTrip._id },
            { $set: { ...updateData.trip, postId } }
          );
          tripId = existingTrip._id;
        } else {
          const tripResult = await tripsCollection.insertOne({
            ...updateData.trip,
            postId,
          });
          tripId = tripResult.insertedId;
        }

        await postsCollection.updateOne(
          { _id: postId },
          { $set: { tripId } }
        );
      } else {
        // trip is null/empty object, delete related trip and remove trip fields from post
        await tripsCollection.deleteMany({ postId });
        await postsCollection.updateOne(
          { _id: postId },
          { $unset: { tripId: '', trip: '' } }
        );
      }
    } else {
      // no trip field in update data, keep the existing tripId
      const post = await postsCollection.findOne(
        { _id: postId },
        { projection: { tripId: 1 } }
      );
      tripId = post?.tripId || null;
    }

    res.json({ success: true, updatedCount: result.modifiedCount, postId, tripId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

module.exports = router;
