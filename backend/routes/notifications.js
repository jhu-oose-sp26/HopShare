const express = require('express');
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');
const { invalidatePostsCache } = require('./posts');

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

// respond to a ride request or join_list notification (accept or decline)
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

    // Handle join_list approval/decline
    if (notif.type === 'join_list' && notif.postId) {
      // Extract sender email from pendingJoins via the stored notification message sender
      // Look up sender by senderId first, fall back to senderName from notif
      let senderUser = null;
      if (notif.senderId) {
        senderUser = await db.collection('users').findOne({ _id: notif.senderId });
      }
      const senderEmail = senderUser?.email;
      if (senderEmail) {
        if (response === 'accepted') {
          const post = await db.collection('posts').findOne({ _id: notif.postId });
          if (post?.maxRiders != null && (post.riderList?.length ?? 0) >= post.maxRiders) {
            return res.status(400).json({ error: 'This ride is already full.' });
          }
          await db.collection('posts').updateOne(
            { _id: notif.postId },
            {
              $pull: { pendingJoins: senderEmail },
              $push: { riderList: {
                name: senderUser.name || senderUser.displayName || notif.senderName || '',
                email: senderEmail,
                picture: senderUser.picture || null,
                avatar: senderUser.avatar || null,
                googleId: senderUser.googleId || null,
                joinedAt: new Date().toISOString(),
              }},
            }
          );
        } else {
          await db.collection('posts').updateOne(
            { _id: notif.postId },
            { $pull: { pendingJoins: senderEmail } }
          );
        }
      }
    }

    // Handle ride_request (driver offer) approval/decline
    if (notif.type === 'ride_request' && notif.senderId && notif.postId) {
      const senderUser = await db.collection('users').findOne({ _id: notif.senderId });
      if (senderUser?.email) {
        if (response === 'accepted') {
          await db.collection('posts').updateOne(
            { _id: notif.postId },
            {
              $pull: { pendingDrivers: { email: senderUser.email } },
              $push: { drivers: {
                name: senderUser.name || notif.senderName || '',
                email: senderUser.email,
                picture: senderUser.picture || null,
                avatar: senderUser.avatar || null,
                googleId: senderUser.googleId || null,
                takenAt: new Date().toISOString(),
              }},
            }
          );
        } else {
          await db.collection('posts').updateOne(
            { _id: notif.postId },
            { $pull: { pendingDrivers: { email: senderUser.email } } }
          );
        }
      }
    }

    // Handle friend_request approval/decline
    if (notif.type === 'friend_request' && notif.senderId) {
      const requesterId = notif.senderId.toString();
      const accepterId = notif.recipientId.toString();
      const responderUser = await db.collection('users').findOne({ _id: notif.recipientId });

      if (response === 'accepted') {
        // Mutually add friends
        const friends = db.collection('friends');
        await friends.updateOne(
          { userId: accepterId },
          { $addToSet: { friendIds: requesterId }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );
        await friends.updateOne(
          { userId: requesterId },
          { $addToSet: { friendIds: accepterId }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );
        // Delete the pending friendRequest doc
        await db.collection('friendRequests').deleteOne({ senderId: requesterId, receiverId: accepterId, status: 'pending' });

        await db.collection('notifications').insertOne({
          recipientId: notif.senderId,
          senderId: notif.recipientId,
          senderName: responderUser?.name || responderName || 'Someone',
          message: `${responderUser?.name || responderName || 'Someone'} accepted your friend request!`,
          type: 'friend_request_response',
          postId: null, replyToMessage: null, response: null, read: false, createdAt: new Date(),
        });
      } else {
        await db.collection('friendRequests').deleteOne({ senderId: requesterId, receiverId: accepterId, status: 'pending' });

        await db.collection('notifications').insertOne({
          recipientId: notif.senderId,
          senderId: notif.recipientId,
          senderName: responderUser?.name || responderName || 'Someone',
          message: `${responderUser?.name || responderName || 'Someone'} declined your friend request.`,
          type: 'friend_request_response',
          postId: null, replyToMessage: null, response: null, read: false, createdAt: new Date(),
        });
      }

      return res.json({ success: true });
    }

    // Send reply notification back to the original requester
    if (notif.senderId) {
      let replyMessage;
      if (notif.type === 'join_list') {
        replyMessage = response === 'accepted'
          ? `${responderName || 'The poster'} accepted your request to join the list!`
          : `${responderName || 'The poster'} removed you from the list.`;
      } else {
        replyMessage = response === 'accepted'
          ? `${responderName || 'The poster'} accepted your driver request!`
          : `${responderName || 'The poster'} declined your driver request.`;
      }

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

    invalidatePostsCache();
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