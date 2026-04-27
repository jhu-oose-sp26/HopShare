const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

// Email helper
const encodeEmail = (email) => email.replace(/\./g, '(dot)');

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

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isActiveRideParticipant(post, email) {
  if (!post || !email) return false;

  const normalized = validateEmail(email);
  const ownerEmail = typeof post.user?.email === 'string' ? post.user.email.trim().toLowerCase() : '';
  if (ownerEmail && ownerEmail === normalized) return true;

  const riderEmails = Array.isArray(post.riderList)
    ? post.riderList
        .map((member) => (typeof member.email === 'string' ? member.email.trim().toLowerCase() : ''))
        .filter(Boolean)
    : [];

  if (riderEmails.includes(normalized)) return true;

  const driverEmails = Array.isArray(post.drivers)
    ? post.drivers
        .map((member) => (typeof member.email === 'string' ? member.email.trim().toLowerCase() : ''))
        .filter(Boolean)
    : [];

  return driverEmails.includes(normalized);
}

function hasChatHistory(chat, email) {
  if (!chat || !Array.isArray(chat.messages) || !email) return false;
  const normalized = normalizeEmail(email);
  return chat.messages.some((message) => normalizeEmail(message?.sender) === normalized);
}

function hasReadOnlyAccess(chat, email) {
  if (!chat || !email) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const allowedReaders = Array.isArray(chat.allowedReaders)
    ? chat.allowedReaders.map((item) => normalizeEmail(item)).filter(Boolean)
    : [];

  return allowedReaders.includes(normalized);
}

// Get or create chat for a post
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { viewerEmail } = req.query;
    const db = getDB();

    const chatId = toObjectId(postId);
    if (!chatId) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await db.collection('posts').findOne({ _id: chatId });
    if (!post) {
      return res.status(404).json({ error: 'Ride post not found' });
    }

    if (!viewerEmail) {
      return res.status(400).json({ error: 'viewerEmail is required' });
    }

    let viewer;
    try {
      viewer = validateEmail(viewerEmail);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    let chat = await db.collection('chats').findOne({ _id: chatId });

    const isActiveParticipant = isActiveRideParticipant(post, viewer);
    const canReadHistory = hasChatHistory(chat, viewer) || hasReadOnlyAccess(chat, viewer);

    // Read-only access policy:
    // - active participants can read/create chat
    // - former participants can read existing chat history if they have participated before
    if (!isActiveParticipant && !canReadHistory) {
      return res.status(403).json({ error: 'You are not authorized to view this chat' });
    }

    if (!chat) {
      if (!isActiveParticipant) {
        return res.status(403).json({ error: 'You are not authorized to view this chat' });
      }

      // Create new chat
      const newChat = {
        _id: chatId,
        postId,
        messages: [],
        allowedReaders: [viewer],
        unreadCount: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('chats').insertOne(newChat);
      chat = newChat;
    } else if (isActiveParticipant) {
      await db.collection('chats').updateOne(
        { _id: chatId },
        { $addToSet: { allowedReaders: viewer } }
      );

      if (!Array.isArray(chat.allowedReaders)) {
        chat.allowedReaders = [viewer];
      } else if (!chat.allowedReaders.includes(viewer)) {
        chat.allowedReaders.push(viewer);
      }
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

    try {
      sender = validateEmail(sender);
      message = sanitizeString(message, 'Message', 10000);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const db = getDB();
    const chatObjectId = toObjectId(chatId);
    
    const post = await db.collection('posts').findOne({ _id: chatObjectId });
    if (!post) return res.status(404).json({ error: 'Ride post not found' });

    if (!isActiveRideParticipant(post, sender)) {
      return res.status(403).json({ error: 'You are no longer part of this ride' });
    }

    // 1. Identify all active participants in the ride
    const participants = [
      post.user?.email,
      ...(post.riderList || []).map(r => r.email),
      ...(post.drivers || []).map(d => d.email)
    ]
    .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter((email, index, self) => email && self.indexOf(email) === index); // Unique emails

    // 2. Prepare unread increments for everyone EXCEPT the sender
    const unreadUpdates = {};
    participants.forEach(p => {
      if (p !== sender) {
        unreadUpdates[`unreadCount.${encodeEmail(p)}`] = 1;
      }
    });

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
        $set: { updatedAt: new Date() },
        $inc: unreadUpdates // Increment counts for others
      }
    );
  
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Chat not found' });

    req.app.get('io').to(chatId).emit('newMessage', { ...newMessage, chatId });

    req.app.get('io').emit('unreadUpdate', {
      chatId: chatId.toString(),
      sender: sender,
      participants: participants
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all chats for a user
router.get('/user/:email', async (req, res) => {
  try {
    const email = validateEmail(req.params.email);
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
      _id: { $in: postIds }
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
        unreadCount: chat.unreadCount || {},
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

// Get or create a DM chat between two users (not tied to a post)
// Get or create a DM chat between two users, OR fetch an existing DM by chatId
router.get('/dm/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { viewerEmail } = req.query;

    if (!viewerEmail) {
      return res.status(400).json({ error: 'viewerEmail is required' });
    }

    let viewer;
    try {
      viewer = validateEmail(viewerEmail);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const db = getDB();

    // 1. Check if the identifier is an existing DM Chat ID
    if (ObjectId.isValid(identifier)) {
      const chat = await db.collection('chats').findOne({ 
        _id: new ObjectId(identifier), 
        type: 'dm' 
      });
      
      if (chat) {
        // Verify viewer is actually a participant of this DM
        const participants = chat.participants?.map(p => normalizeEmail(p)) || [];
        if (!participants.includes(viewer)) {
          return res.status(403).json({ error: 'You are not a participant of this DM chat' });
        }
        return res.json(chat);
      }
    }

    // 2. If it's not a chat ID, treat it as a User ID or Email to find/create a DM
    let otherUserEmail = identifier;
    if (ObjectId.isValid(identifier)) {
      const otherUser = await db.collection('users').findOne({ _id: new ObjectId(identifier) });
      if (otherUser) {
        otherUserEmail = otherUser.email;
      }
    } else if (identifier.includes('@')) {
      otherUserEmail = identifier;
    }

    // If it STILL isn't a valid email after database lookups, reject it
    if (!otherUserEmail || !otherUserEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid user ID or chat ID' });
    }

    otherUserEmail = validateEmail(otherUserEmail);

    // Prevent DM with self
    if (viewer === otherUserEmail) {
      return res.status(400).json({ error: 'Cannot create a DM with yourself' });
    }

    // Check if a DM chat already exists between these two users
    // DM chats have type: 'dm' and participants array
    const existingDm = await db.collection('chats').findOne({
      type: 'dm',
      participants: { $all: [viewer, otherUserEmail], $size: 2 }
    });

    if (existingDm) {
      return res.json(existingDm);
    }

    // Create new DM chat
    const newDm = {
      _id: new ObjectId(),
      type: 'dm',
      participants: [viewer, otherUserEmail],
      messages: [],
      allowedReaders: [viewer, otherUserEmail],
      unreadCount: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('chats').insertOne(newDm);
    res.status(201).json(newDm);
  } catch (error) {
    console.error('Error creating DM chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message in a DM chat
router.post('/dm/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    let { sender, message } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: 'Sender and message are required' });
    }

    // Validate and sanitize input
    try {
      sender = validateEmail(sender);
      message = sanitizeString(message, 'Message', 10000);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const db = getDB();
    const chatObjectId = toObjectId(chatId);
    if (!chatObjectId) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    // Verify this is a DM chat
    const chat = await db.collection('chats').findOne({ _id: chatObjectId, type: 'dm' });
    if (!chat) {
      return res.status(404).json({ error: 'DM chat not found' });
    }

    // Verify sender is a participant
    const normalizedSender = normalizeEmail(sender);
    const participants = chat.participants?.map(p => normalizeEmail(p)) || [];
    if (!participants.includes(normalizedSender)) {
      return res.status(403).json({ error: 'You are not a participant of this DM chat' });
    }

    const newMessage = {
      _id: new ObjectId(),
      sender,
      message,
      timestamp: new Date()
    };

    // Increment unread count for all participants except sender
    const unreadUpdates = {};
    for (const participant of participants) {
      if (normalizeEmail(participant) !== normalizedSender) {
        unreadUpdates[`unreadCount.${encodeEmail(participant)}`] = 1;
      }
    }

    const result = await db.collection('chats').updateOne(
      { _id: chatObjectId },
      {
        $push: { messages: newMessage },
        $set: { updatedAt: new Date() },
        $inc: unreadUpdates
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    req.app.get('io').to(chatId).emit('newMessage', { ...newMessage, chatId });

    // Emit unread update to all participants
    req.app.get('io').emit('unreadUpdate', {
      chatId: chatId.toString(),
      sender: sender,
      participants: participants
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error adding DM message:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Reset unread count for a user when they view the chat
router.post('/:chatId/read', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userEmail } = req.body;

    if (!userEmail) return res.status(400).json({ error: 'userEmail is required' });
    const viewer = validateEmail(userEmail);
    
    const db = getDB();
    const chatObjectId = toObjectId(chatId);

    const chat = await db.collection('chats').findOne({ _id: chatObjectId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    let isAuthorized = false;
    if (chat.type === 'dm') {
      isAuthorized = chat.participants?.map(p => normalizeEmail(p)).includes(viewer);
    } else {
      // For group chats, check the post participant list
      const post = await db.collection('posts').findOne({ _id: chatObjectId });
      isAuthorized = isActiveRideParticipant(post, viewer);
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'You are not a participant of this chat' });
    }

    await db.collection('chats').updateOne(
      { _id: chatObjectId },
      { $set: { [`unreadCount.${encodeEmail(viewer)}`]: 0 } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all DM chats for a user (separate from post-based chats)
router.get('/dm/user/:email', async (req, res) => {
  try {
    const email = validateEmail(req.params.email);
    const db = getDB();

    const dmChats = await db.collection('chats').find({
      type: 'dm',
      participants: email
    }).toArray();

    // Enrich with participant user info
    const allParticipants = [...new Set(
      dmChats.flatMap(chat => chat.participants || [])
    )];

    const participantUsers = await db.collection('users').find(
      { email: { $in: allParticipants } },
      { projection: { _id: 1, email: 1, name: 1, picture: 1, avatar: 1, googleId: 1 } }
    ).toArray();

    const userByEmail = {};
    for (const user of participantUsers) {
      userByEmail[user.email.toLowerCase()] = user;
    }

    const formattedDms = dmChats.map(chat => {
      const otherParticipant = chat.participants?.find(p => 
        normalizeEmail(p) !== normalizeEmail(email)
      );
      const otherUser = otherParticipant ? userByEmail[otherParticipant.toLowerCase()] : null;

      const lastMessage = chat.messages?.length > 0
        ? chat.messages[chat.messages.length - 1]
        : null;

      if (lastMessage) {
        const senderIsViewer = normalizeEmail(lastMessage.sender) === normalizeEmail(email);
        lastMessage.senderName = senderIsViewer
          ? null
          : (otherUser?.name || otherParticipant);
      }

      return {
        _id: chat._id,
        type: 'dm',
        postId: null,
        postTitle: null,
        unreadCount: chat.unreadCount || {},
        otherUser: otherUser ? {
          _id: otherUser._id,
          googleId: otherUser.googleId,
          name: otherUser.name,
          email: otherUser.email,
          picture: otherUser.picture || otherUser.avatar
        } : {
          name: otherParticipant,
          email: otherParticipant
        },
        lastMessage: lastMessage,
        updatedAt: chat.updatedAt || chat.createdAt
      };
    });

    // Sort by most recently updated
    formattedDms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(formattedDms);
  } catch (error) {
    console.error('Error getting user DM chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function toObjectId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

module.exports = router;