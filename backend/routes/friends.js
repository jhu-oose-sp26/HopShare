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

    // Get friend user details
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

// POST /api/friends/:userId/add - Add a friend
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

    // Verify the friend user exists
    const users = getDB().collection('users');
    const friendUser = await users.findOne({ _id: new ObjectId(friendId) });
    
    if (!friendUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friends = getDB().collection('friends');
    
    // Add friend to user's list (if not already there)
    await friends.updateOne(
      { userId: userId },
      { 
        $addToSet: { friendIds: friendId },
        $set: { updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    // Also add reverse relationship (mutual friendship)
    await friends.updateOne(
      { userId: friendId },
      { 
        $addToSet: { friendIds: userId },
        $set: { updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    return res.json({ 
      success: true, 
      message: 'Friend added successfully',
      friend: {
        _id: friendUser._id,
        googleId: friendUser.googleId,
        name: friendUser.name,
        email: friendUser.email,
        picture: friendUser.picture,
        avatar: friendUser.avatar,
        major: friendUser.major,
      }
    });
  } catch (error) {
    console.error('Failed to add friend:', error);
    return res.status(500).json({ error: 'Failed to add friend' });
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

    // Remove from user's list
    await friends.updateOne(
      { userId: userId },
      { 
        $pull: { friendIds: friendId },
        $set: { updatedAt: new Date() }
      }
    );

    // Remove reverse relationship
    await friends.updateOne(
      { userId: friendId },
      { 
        $pull: { friendIds: userId },
        $set: { updatedAt: new Date() }
      }
    );

    return res.json({ success: true, message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Failed to remove friend:', error);
    return res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// GET /api/friends/:userId/check/:friendId - Check if two users are friends
router.get('/:userId/check/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(friendId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const friends = getDB().collection('friends');
    const doc = await friends.findOne({ userId: userId });
    
    const isFriend = doc?.friendIds?.includes(friendId) || false;

    return res.json({ isFriend });
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

    // Get user's friends
    const friendsDoc = await getFriendsDoc(userId);
    const friendIds = friendsDoc.friendIds || [];

    if (friendIds.length === 0) {
      return res.json({ posts: [] });
    }

    // Get friend user emails (since posts use email to identify users)
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

    // Get posts from friends
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