const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

// Validation helpers
function sanitizeString(str, fieldName = 'input', maxLength = 5000) {
  if (typeof str !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  // Remove potential XSS vectors
  const sanitized = str
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
  
  if (sanitized.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
  
  return sanitized;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    throw new Error('Invalid email format');
  }
  return email.trim().toLowerCase();
}

// Get or create chat for a post
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const db = getDB();

    const chatId = toObjectId(postId);
    if (!chatId) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    // Check if chat exists for this post
    let chat = await db.collection('chats').findOne({ _id: chatId });

    if (!chat) {
      // Create new chat
      const newChat = {
        _id: chatId,
        postId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('chats').insertOne(newChat);
      chat = newChat;
    }

    res.json(chat);
  } catch (error) {
    console.error('Error getting/creating chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add message to chat - validate sender and message, prevent self-messaging
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    let { sender, message, recipientEmail } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: 'Sender and message are required' });
    }

    // Validate and sanitize input
    try {
      sender = validateEmail(sender);
      message = sanitizeString(message, 'Message', 10000);
      
      if (recipientEmail) {
        recipientEmail = validateEmail(recipientEmail);
      }
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    // PREVENT SELF-MESSAGING: user cannot message themselves
    if (recipientEmail && sender === recipientEmail) {
      return res.status(400).json({ error: 'You cannot message yourself' });
    }

    const db = getDB();
    const chatObjectId = toObjectId(chatId);
    if (!chatObjectId) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const newMessage = {
      _id: new ObjectId(),
      sender,
      message,
      timestamp: new Date()
    };

    const result = await db.collection('chats').updateOne(
      { _id: chatObjectId },
      {
        $push: { messages: newMessage },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    req.app.get('io').to(req.params.chatId).emit('newMessage', { ...newMessage, chatId: req.params.chatId });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Add this to your chat.js file

// GET all chats for a user
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const db = getDB();

    // Find all posts where the user is the owner, a rider, or a driver
    const userPosts = await db.collection('posts').find({
      $or: [
        { 'user.email': email },
        { 'riderList.email': email },
        { 'drivers.email': email }
      ]
    }).project({ title: 1, 'trip.date': 1, 'trip.time': 1, riderList: 1, drivers: 1 }).toArray();

    // Create an array of post IDs and a map to quickly look up post info
    const postIds = userPosts.map(p => p._id);
    const postMap = userPosts.reduce((acc, post) => {
      acc[post._id.toString()] = {
        title: post.title,
        tripDate: post.trip?.date || null,
        tripTime: post.trip?.time || null,
        participantCount: 1 + (post.riderList?.length || 0) + (post.drivers?.length || 0),
      };
      return acc;
    }, {});

    // Find all chats tied to those posts OR where the user has sent a message
    const chats = await db.collection('chats').find({
      $or: [
        { _id: { $in: postIds } },
        { 'messages.sender': email }
      ]
    }).toArray();

    // Format the chats for the UI (attach post title, get last message)
    const formattedChats = chats.map(chat => {
      const lastMessage = chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1] 
        : null;

      const postInfo = postMap[chat._id.toString()] || {};
      return {
        _id: chat._id,
        postId: chat.postId,
        postTitle: postInfo.title || 'Unknown Ride',
        tripDate: postInfo.tripDate || null,
        tripTime: postInfo.tripTime || null,
        participantCount: postInfo.participantCount ?? null,
        lastMessage: lastMessage,
        updatedAt: chat.updatedAt || chat.createdAt
      };
    });

    // Enrich lastMessage with sender's display name
    // sender may be stored as email OR MongoDB ObjectId string
    const senderValues = [...new Set(
      formattedChats.filter(c => c.lastMessage?.sender).map(c => c.lastMessage.sender)
    )];
    if (senderValues.length > 0) {
      const emailSenders = senderValues.filter(s => s.includes('@'));
      const idSenders = senderValues.filter(s => !s.includes('@') && ObjectId.isValid(s));

      const orClauses = [];
      if (emailSenders.length > 0) orClauses.push({ email: { $in: emailSenders } });
      if (idSenders.length > 0) orClauses.push({ _id: { $in: idSenders.map(id => new ObjectId(id)) } });

      const senderUsers = orClauses.length > 0
        ? await db.collection('users')
            .find({ $or: orClauses }, { projection: { _id: 1, email: 1, name: 1 } })
            .toArray()
        : [];

      const nameByKey = {};
      for (const u of senderUsers) {
        if (u.email) nameByKey[u.email.toLowerCase()] = u.name;
        nameByKey[u._id.toString()] = u.name;
      }

      for (const chat of formattedChats) {
        const s = chat.lastMessage?.sender;
        if (s) {
          chat.lastMessage.senderName = nameByKey[s.toLowerCase()] || nameByKey[s] || null;
        }
      }
    }

    // Sort by most recently updated
    formattedChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(formattedChats);
  } catch (error) {
    console.error('Error getting user chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function toObjectId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

module.exports = router;