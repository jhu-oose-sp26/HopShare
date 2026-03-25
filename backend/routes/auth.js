const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { getDB } = require('../db');

const router = express.Router();
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const oauthClient = googleClientId ? new OAuth2Client(googleClientId) : null;

router.post('/google', async (req, res) => {
  try {
    const credential = req.body?.credential;

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    if (!googleClientId || !oauthClient) {
      return res.status(500).json({
        error: 'GOOGLE_CLIENT_ID is not configured on the server',
      });
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      return res.status(401).json({ error: 'Invalid Google token payload' });
    }

    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Google email is not verified' });
    }

    const users = getDB().collection('users');
    const now = new Date();

    await users.updateOne(
      { googleId: payload.sub },
      {
        $set: {
          name: payload.name || '',
          email: payload.email,
          picture: payload.picture || '',
          emailVerified: Boolean(payload.email_verified),
          provider: 'google',
          lastLoginAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          googleId: payload.sub,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    await users.updateOne(
      { email: payload.email, googleId: { $exists: false } },
      { $set: { googleId: payload.sub, updatedAt: now, lastLoginAt: now } }
    );

    const user = await users.findOne(
      { googleId: payload.sub },
      {
        projection: {
          _id: 1,
          googleId: 1,
          name: 1,
          email: 1,
          picture: 1,
          phone: 1,
          createdAt: 1,
          lastLoginAt: 1,
        },
      }
    );

    return res.json({ user });
  } catch (error) {
    console.error('Google auth failed:', error);
    return res.status(401).json({ error: 'Google authentication failed' });
  }
});

module.exports = router;
