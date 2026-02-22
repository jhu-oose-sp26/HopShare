const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

router.get('/', async (req, res) => { // READ
  const posts = await getDB().collection('posts').find().toArray();
  res.json(posts);
});

router.post('/', async (req, res) => { // CREATE
  const result = await getDB().collection('posts').insertOne(req.body);
  res.status(201).json(result);
});

router.delete('/:id', async (req, res) => { // DELETE
  await getDB().collection('posts').deleteOne({
    _id: new ObjectId(req.params.id)
  });
  res.json({ success: true });
});

router.put('/:id', async (req, res) => { // UPDATE
  try {
    const { ObjectId } = require('mongodb');

    const { id } = req.params;
    const updateData = req.body;

    const result = await getDB()
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