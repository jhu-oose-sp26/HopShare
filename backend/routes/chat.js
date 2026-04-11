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

    res.json(newMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function toObjectId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

module.exports = router;