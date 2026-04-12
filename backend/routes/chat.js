const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

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

// Add message to chat
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { sender, message } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: 'Sender and message are required' });
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

    req.app.get('io').to(req.params.chatId).emit('newMessage', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    }).project({ title: 1 }).toArray(); 
    
    // Create an array of post IDs and a map to quickly look up post titles
    const postIds = userPosts.map(p => p._id);
    const postMap = userPosts.reduce((acc, post) => {
      acc[post._id.toString()] = post.title;
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

      return {
        _id: chat._id,
        postId: chat.postId,
        postTitle: postMap[chat._id.toString()] || 'Unknown Ride',
        lastMessage: lastMessage,
        updatedAt: chat.updatedAt || chat.createdAt
      };
    });

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