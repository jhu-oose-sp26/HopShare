const express = require('express');
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

const router = express.Router();

// Helper to get or create friends document for a user
async function getFriendsDoc(userId) {
  const friends = getDB().collection('friends');
  let doc = await friends.findOne({ userId: userId });

  if (!doc) {
    await friends.insertOne({
      userId: userId,
      friendIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    doc = await friends.findOne({ userId: userId });
  }

  return doc;
}

// GET /api/friends/:userId - Get all friends for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const friendsDoc = await getFriendsDoc(userId);
    const friendObjectIds = (friendsDoc.friendIds || [])
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    if (friendObjectIds.length === 0) {
      return res.json({ friends: [] });
    }

    const users = getDB().collection('users');
    const friendUsers = await users.find(
      { _id: { $in: friendObjectIds } },
      {
        projection: {
          _id: 1,
          googleId: 1,
          name: 1,
          email: 1,
          picture: 1,
          avatar: 1,
          major: 1,
        }
      }
    ).toArray();

    return res.json({ friends: friendUsers });
  } catch (error) {
    console.error('Failed to get friends:', error);
    return res.status(500).json({ error: 'Failed to get friends' });
  }
});

// POST /api/friends/:userId/add - Send a friend request
router.post('/:userId/add', async (req, res) => {
  try {
    const { userId } = req.params;
    const { friendId } = req.body;

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(friendId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (userId === friendId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const users = getDB().collection('users');
    const friendUser = await users.findOne({ _id: new ObjectId(friendId) });
    if (!friendUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check already friends
    const friendsDoc = await getFriendsDoc(userId);
    if (friendsDoc.friendIds?.includes(friendId)) {
      return res.status(409).json({ error: 'Already friends' });
    }

    const requests = getDB().collection('friendRequests');

    // Check for existing pending request in either direction
    const existing = await requests.findOne({
      $or: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
      status: 'pending',
    });
    if (existing) {
      return res.status(409).json({ error: 'Friend request already pending' });
    }

    await requests.insertOne({
      senderId: userId,
      receiverId: friendId,
      status: 'pending',
      createdAt: new Date(),
    });

    return res.json({ success: true, status: 'pending' });
  } catch (error) {
    console.error('Failed to send friend request:', error);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// GET /api/friends/:userId/requests/incoming - Pending requests received by user
router.get('/:userId/requests/incoming', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const requests = getDB().collection('friendRequests');
    const incoming = await requests.find({ receiverId: userId, status: 'pending' }).toArray();

    if (incoming.length === 0) return res.json({ requests: [] });

    const senderIds = incoming
      .filter(r => ObjectId.isValid(r.senderId))
      .map(r => new ObjectId(r.senderId));

    const users = getDB().collection('users');
    const senders = await users.find(
      { _id: { $in: senderIds } },
      { projection: { _id: 1, googleId: 1, name: 1, email: 1, picture: 1, avatar: 1, major: 1 } }
    ).toArray();

    const senderMap = Object.fromEntries(senders.map(u => [u._id.toString(), u]));

    const enriched = incoming.map(r => ({
      _id: r._id,
      sender: senderMap[r.senderId] || null,
      createdAt: r.createdAt,
    }));

    return res.json({ requests: enriched });
  } catch (error) {
    console.error('Failed to get incoming requests:', error);
    return res.status(500).json({ error: 'Failed to get incoming requests' });
  }
});

// GET /api/friends/:userId/requests/sent - Pending requests sent by user
router.get('/:userId/requests/sent', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const requests = getDB().collection('friendRequests');
    const sent = await requests.find({ senderId: userId, status: 'pending' }).toArray();

    return res.json({ requests: sent });
  } catch (error) {
    console.error('Failed to get sent requests:', error);
    return res.status(500).json({ error: 'Failed to get sent requests' });
  }
});

// POST /api/friends/:userId/requests/:requestId/accept
router.post('/:userId/requests/:requestId/accept', async (req, res) => {
  try {
    const { userId, requestId } = req.params;

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const requests = getDB().collection('friendRequests');
    const request = await requests.findOne({ _id: new ObjectId(requestId), receiverId: userId, status: 'pending' });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const senderId = request.senderId;
    const friends = getDB().collection('friends');

    // Mutually add friends
    await friends.updateOne(
      { userId: userId },
      { $addToSet: { friendIds: senderId }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    await friends.updateOne(
      { userId: senderId },
      { $addToSet: { friendIds: userId }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    await requests.deleteOne({ _id: new ObjectId(requestId) });

    const users = getDB().collection('users');
    const senderUser = await users.findOne(
      { _id: new ObjectId(senderId) },
      { projection: { _id: 1, googleId: 1, name: 1, email: 1, picture: 1, avatar: 1, major: 1 } }
    );

    return res.json({ success: true, friend: senderUser });
  } catch (error) {
    console.error('Failed to accept friend request:', error);
    return res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// POST /api/friends/:userId/requests/:requestId/reject
router.post('/:userId/requests/:requestId/reject', async (req, res) => {
  try {
    const { userId, requestId } = req.params;

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const requests = getDB().collection('friendRequests');
    const result = await requests.deleteOne({ _id: new ObjectId(requestId), receiverId: userId, status: 'pending' });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to reject friend request:', error);
    return res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// POST /api/friends/:userId/requests/:requestId/cancel - cancel a sent request
router.post('/:userId/requests/:requestId/cancel', async (req, res) => {
  try {
    const { userId, requestId } = req.params;

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const requests = getDB().collection('friendRequests');
    const result = await requests.deleteOne({ _id: new ObjectId(requestId), senderId: userId, status: 'pending' });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel friend request:', error);
    return res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// DELETE /api/friends/:userId/remove/:friendId - Remove a friend
router.delete('/:userId/remove/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(friendId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const friends = getDB().collection('friends');

    await friends.updateOne(
      { userId: userId },
      { $pull: { friendIds: friendId }, $set: { updatedAt: new Date() } }
    );
    await friends.updateOne(
      { userId: friendId },
      { $pull: { friendIds: userId }, $set: { updatedAt: new Date() } }
    );

    return res.json({ success: true, message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Failed to remove friend:', error);
    return res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// GET /api/friends/:userId/check/:friendId - Check friendship status
router.get('/:userId/check/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(friendId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const friends = getDB().collection('friends');
    const doc = await friends.findOne({ userId: userId });
    const isFriend = doc?.friendIds?.includes(friendId) || false;

    const requests = getDB().collection('friendRequests');
    const pending = await requests.findOne({
      $or: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
      status: 'pending',
    });

    return res.json({ isFriend, pendingRequest: pending ? { _id: pending._id, senderId: pending.senderId } : null });
  } catch (error) {
    console.error('Failed to check friendship:', error);
    return res.status(500).json({ error: 'Failed to check friendship' });
  }
});

// GET /api/friends/:userId/posts - Get posts from friends only
router.get('/:userId/posts', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const friendsDoc = await getFriendsDoc(userId);
    const friendIds = friendsDoc.friendIds || [];

    if (friendIds.length === 0) {
      return res.json({ posts: [] });
    }

    const users = getDB().collection('users');
    const friendObjectIds = friendIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    const friendUsers = await users.find(
      { _id: { $in: friendObjectIds } },
      { projection: { email: 1 } }
    ).toArray();

    const friendEmails = friendUsers.map(u => u.email);

    if (friendEmails.length === 0) {
      return res.json({ posts: [] });
    }

    const posts = getDB().collection('posts');
    const friendPosts = await posts.find({
      'user.email': { $in: friendEmails },
      archived: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .toArray();

    return res.json({ posts: friendPosts });
  } catch (error) {
    console.error('Failed to get friend posts:', error);
    return res.status(500).json({ error: 'Failed to get friend posts' });
  }
});

module.exports = router;
