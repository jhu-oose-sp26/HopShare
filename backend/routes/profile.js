const express = require('express');
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

const router = express.Router();

// Get user profile by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const users = getDB().collection('users');
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          picture: 1,
          avatar: 1,
          phone: 1,
          bio: 1,
          major: 1,
          graduationYear: 1,
          createdAt: 1,
          // Don't expose sensitive data like googleId
        },
      }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, bio, major, graduationYear, avatar } = req.body;
    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Validate input
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Name must be a non-empty string' });
    }
    
    if (phone && (typeof phone !== 'string' || phone.trim().length === 0)) {
      return res.status(400).json({ error: 'Phone must be a non-empty string' });
    }

    if (bio && typeof bio !== 'string') {
      return res.status(400).json({ error: 'Bio must be a string' });
    }

    if (major && typeof major !== 'string') {
      return res.status(400).json({ error: 'Major must be a string' });
    }

    if (graduationYear && (typeof graduationYear !== 'number' || graduationYear < 2000 || graduationYear > 2100)) {
      return res.status(400).json({ error: 'Graduation year must be a valid year' });
    }

    if (avatar && typeof avatar !== 'string') {
      return res.status(400).json({ error: 'Avatar must be a valid base64 string' });
    }

    // Validate avatar size (limit to ~1MB base64)
    if (avatar && avatar.length > 1400000) {
      return res.status(400).json({ error: 'Avatar file is too large (max 1MB)' });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    // Only update provided fields
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (major !== undefined) updateData.major = major.trim();
    if (graduationYear !== undefined) updateData.graduationYear = graduationYear;
    if (avatar !== undefined) updateData.avatar = avatar;

    const users = getDB().collection('users');
    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return updated user profile
    const updatedUser = await users.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          picture: 1,
          avatar: 1,
          phone: 1,
          bio: 1,
          major: 1,
          graduationYear: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    return res.json({ user: updatedUser });
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
});

module.exports = router;