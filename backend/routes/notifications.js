const express = require('express');
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

const router = express.Router();

// CREATE notification (send message)
router.post('/', async (req, res) => {
  try {
    const { recipientEmail, senderName, senderId, message, postId } = req.body;

    if (!recipientEmail || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Find the recipient by email
    const user = await getDB().collection('users').findOne({ email: recipientEmail });
    if (!user) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const notification = {
      recipientId: user._id,
      senderName: senderName || 'Anonymous',
      senderId: senderId ? new ObjectId(senderId) : null,
      message,
      postId: postId ? new ObjectId(postId) : null,
      read: false,
      createdAt: new Date(),
    };

    const result = await getDB()
      .collection('notifications')
      .insertOne(notification);

    res.status(201).json({ success: true, id: result.insertedId });
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// GET notifications for a user
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const notifications = await getDB()
      .collection('notifications')
      .aggregate([
        { $match: { recipientId: new ObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'sender',
          },
        },
        {
          $unwind: { path: '$sender', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            message: 1,
            read: 1,
            createdAt: 1,
            senderName: '$sender.name',
          }
        }
      ])
      .toArray();

    res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// mark as read (optional but useful)
router.patch('/:id/read', async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    await getDB().collection('notifications').updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;