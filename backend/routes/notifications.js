const express = require('express');
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

const router = express.Router();

// CREATE notification (send message)
router.post('/', async (req, res) => {
  try {
    const { recipientId, recipientEmail, senderName, senderId, message, postId, replyToMessage, type } = req.body;

    // Validate required fields
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    let recipientUser;

    if (recipientId) {
      if (!ObjectId.isValid(recipientId)) {
        return res.status(400).json({ error: 'Invalid recipientId' });
      }
      recipientUser = await getDB()
        .collection('users')
        .findOne({ _id: new ObjectId(recipientId) });
    } else if (recipientEmail) {
      recipientUser = await getDB()
        .collection('users')
        .findOne({ email: recipientEmail });
    } else {
      return res.status(400).json({ error: 'Must provide recipientId or recipientEmail' });
    }

    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const notification = {
      recipientId: recipientUser._id,
      senderName: senderName || 'Anonymous',
      senderId: senderId && ObjectId.isValid(senderId) ? new ObjectId(senderId) : null,
      message,
      postId: postId && ObjectId.isValid(postId) ? new ObjectId(postId) : null,
      replyToMessage: replyToMessage || null,
      type: type || 'message',
      response: null,
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
      .find({ recipientId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// respond to a ride request (accept or decline)
router.patch('/:id/respond', async (req, res) => {
  try {
    const id = req.params.id;
    const { response, responderName } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ error: 'response must be accepted or declined' });
    }

    const db = getDB();
    const notif = await db.collection('notifications').findOne({ _id: new ObjectId(id) });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });

    await db.collection('notifications').updateOne(
      { _id: new ObjectId(id) },
      { $set: { response, read: true } }
    );

    // Send reply notification back to the original requester
    if (notif.senderId) {
      const replyMessage =
        response === 'accepted'
          ? `${responderName || 'The poster'} accepted your ride request!`
          : `${responderName || 'The poster'} declined your ride request.`;

      await db.collection('notifications').insertOne({
        recipientId: notif.senderId,
        senderName: responderName || 'Someone',
        senderId: notif.recipientId,
        message: replyMessage,
        postId: notif.postId || null,
        replyToMessage: notif.message,
        type: 'ride_request_response',
        response: null,
        read: false,
        createdAt: new Date(),
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Respond to ride request error:', err);
    res.status(500).json({ error: 'Failed to respond to ride request' });
  }
});

// mark as read
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