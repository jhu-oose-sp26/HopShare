const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

function toObjectId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generates a 6-digits code.
function generateConfirmationCode() {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get today's date in YYYY-MM-DD format
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Archive all posts where trip.date is in the past (throttled to once per 5 minutes)
let lastArchiveRun = 0;
async function archivePastRides() {
  const now = Date.now();
  if (now - lastArchiveRun < 5 * 60 * 1000) return 0;
  lastArchiveRun = now;

  const today = getTodayDateString();
  const result = await getDB().collection('posts').updateMany(
    {
      'trip.date': { $lt: today },
      archived: { $ne: true }
    },
    {
      $set: { archived: true, archivedAt: new Date().toISOString() }
    }
  );
  return result.modifiedCount;
}

// Enrich posts with Google IDs for user navigation (single batched query)
async function enrichPostsWithGoogleIds(posts) {
  if (!posts || posts.length === 0) return posts;

  // Collect emails that are missing a googleId
  const emails = [
    ...new Set(
      posts
        .filter(p => p.user?.email && !p.user?.googleId)
        .map(p => p.user.email)
    ),
  ];

  if (emails.length === 0) return posts;

  const userDocs = await getDB().collection('users')
    .find({ email: { $in: emails } }, { projection: { email: 1, googleId: 1 } })
    .toArray();

  const googleIdByEmail = {};
  for (const doc of userDocs) {
    if (doc.email && doc.googleId) googleIdByEmail[doc.email] = doc.googleId;
  }

  for (const post of posts) {
    if (post.user?.email && !post.user?.googleId) {
      const gid = googleIdByEmail[post.user.email];
      if (gid) post.user.googleId = gid;
    }
  }

  return posts;
}


// READ ALL POSTS (non-archived only)
router.get('/', async (req, res) => {
  // Archive past rides first
  await archivePastRides();

  // Return only non-archived posts
  const posts = await getDB().collection('posts').find({ archived: { $ne: true } }).toArray();
  
  // Enrich posts with Google IDs for user navigation
  const enrichedPosts = await enrichPostsWithGoogleIds(posts);
  
  res.json(enrichedPosts);
});

// READ ARCHIVED POSTS
router.get('/archived', async (req, res) => {
  const posts = await getDB().collection('posts').find({ archived: true }).toArray();
  
  // Enrich posts with Google IDs for user navigation
  const enrichedPosts = await enrichPostsWithGoogleIds(posts);
  
  res.json(enrichedPosts);
});

// GET ONE POST
router.get('/:id', async (req, res) => { 
  const postId = toObjectId(req.params.id);
  if (!postId) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  const post = await getDB().collection('posts').findOne({ _id: postId });

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  // Enrich single post with Google ID for user navigation
  const enrichedPosts = await enrichPostsWithGoogleIds([post]);
  
  res.json(enrichedPosts[0]);
});

// CREATE
router.post('/', async (req, res) => { 
  try {
    const postInfo = req.body || {};
      // validate the post info
  if (postInfo.title===null || postInfo.description===null) {
    return res.status(400).json({ error: 'Title and description are required' });
  }
    const db = getDB();
    const postsCollection = db.collection('posts');
    const tripsCollection = db.collection('trips');

    postInfo.confirmationCode = generateConfirmationCode();
    postInfo.archived = false; // New posts are not archived
    const postResult = await postsCollection.insertOne(postInfo);
    let tripId = null;

    if (postInfo.trip) {
      // insert the trip and get the tripId
      const tripResult = await tripsCollection.insertOne({
        ...postInfo.trip,
        postId: postResult.insertedId,
      });

      tripId = tripResult.insertedId;

      await postsCollection.updateOne(
        { _id: postResult.insertedId },
        { $set: { tripId } }
      );
    }

    res.status(201).json({
      acknowledged: postResult.acknowledged,
      postId: postResult.insertedId,
      tripId,
    });
  } catch (error) {
    console.error('Failed to create post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});


// DELETE
router.delete('/:id', async (req, res) => { 
  const postId = toObjectId(req.params.id);
  
  if (!postId) {
    return res.status(400).json({ error: 'Invalid post id' });
  }
  const postDeleteResult = await getDB().collection('posts').deleteOne({ _id: postId });

  if (postDeleteResult.deletedCount === 0) {
    return res.status(404).json({ error: 'Post not found' });
  }
  // delete the related trips
  await getDB().collection('trips').deleteMany({ postId });
  res.json({ success: true });
});

// UPDATE
router.put('/:id', async (req, res) => { 
  try {
    const postId = toObjectId(req.params.id);
    if (!postId) {
      return res.status(400).json({ error: 'Invalid post id' });
    }

    // get the update data
    const updateData = { ...(req.body || {}) };
    delete updateData._id;

    // If trip.date is updated, check if it should be unarchived
    if (updateData.trip?.date) {
      const today = getTodayDateString();
      if (updateData.trip.date >= today) {
        updateData.archived = false;
        updateData.archivedAt = null;
      }
    }

    const db = getDB();
    const postsCollection = db.collection('posts');
    const tripsCollection = db.collection('trips');

    const result = await postsCollection.updateOne(
      { _id: postId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let tripId = null;

    // update the trip
    if (Object.prototype.hasOwnProperty.call(updateData, 'trip')) {
      // check if trip field has content (not null/empty object)
      const hasTripValue =
        updateData.trip &&(typeof updateData.trip !== 'object' || Object.keys(updateData.trip).length > 0);

      // create/update trip only when trip has content
      if (hasTripValue) {
        // get the existing trip by postID
        const existingTrip = await tripsCollection.findOne({ postId });

        if (existingTrip) {
          // update the trip
          await tripsCollection.updateOne(
            { _id: existingTrip._id },
            { $set: { ...updateData.trip, postId } }
          );
          tripId = existingTrip._id;
        } else {
          const tripResult = await tripsCollection.insertOne({
            ...updateData.trip,
            postId,
          });
          tripId = tripResult.insertedId;
        }

        await postsCollection.updateOne(
          { _id: postId },
          { $set: { tripId } }
        );
      } else {
        // trip is null/empty object, delete related trip and remove trip fields from post
        await tripsCollection.deleteMany({ postId });
        await postsCollection.updateOne(
          { _id: postId },
          { $unset: { tripId: '', trip: '' } }
        );
      }
    } else {
      // no trip field in update data, keep the existing tripId
      const post = await postsCollection.findOne(
        { _id: postId },
        { projection: { tripId: 1 } }
      );
      tripId = post?.tripId || null;
    }

    res.json({ success: true, updatedCount: result.modifiedCount, postId, tripId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// JOIN rider list
router.post('/:id/join', async (req, res) => {
  try {
    const postId = toObjectId(req.params.id);
    if (!postId) return res.status(400).json({ error: 'Invalid post id' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'User email required' });

    const db = getDB();
    const post = await db.collection('posts').findOne({ _id: postId });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const riderList = post.riderList || [];
    const pendingJoins = post.pendingJoins || [];

    if (riderList.some(u => u.email === email) || pendingJoins.includes(email)) {
      return res.json({ success: true, alreadyJoined: true });
    }

    await db.collection('posts').updateOne(
      { _id: postId },
      { $push: { pendingJoins: email } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Join list error:', err);
    res.status(500).json({ error: 'Failed to join list' });
  }
});

// TAKE a ride request (driver offers to drive — persisted so it survives refresh)
router.post('/:id/take', async (req, res) => {
  try {
    const postId = toObjectId(req.params.id);
    if (!postId) return res.status(400).json({ error: 'Invalid post id' });

    const { name, email, picture, avatar, googleId } = req.body;
    if (!email) return res.status(400).json({ error: 'User email required' });

    const db = getDB();
    const post = await db.collection('posts').findOne({ _id: postId });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const drivers = post.drivers || [];
    const pendingDrivers = post.pendingDrivers || [];
    if (drivers.some(d => d.email === email) || pendingDrivers.some(d => d.email === email)) {
      return res.json({ success: true, alreadyTaken: true });
    }

    await db.collection('posts').updateOne(
      { _id: postId },
      { $push: { pendingDrivers: { name, email, picture, avatar, googleId, requestedAt: new Date().toISOString() } } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Take ride error:', err);
    res.status(500).json({ error: 'Failed to take ride' });
  }
});


// REMOVE a member from riderList (offer) or waitlist (request) — owner action
router.post('/:id/remove-member', async (req, res) => {
  try {
    const postId = toObjectId(req.params.id);
    if (!postId) return res.status(400).json({ error: 'Invalid post id' });

    const { email, name, actorEmail, actorName, actorId } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const db = getDB();
    const post = await db.collection('posts').findOne({ _id: postId });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const riderListBefore = post.riderList || [];
    const removedMember = riderListBefore.find((member) => member.email === email)
      || riderListBefore.find((member) => name && member.name === name)
      || null;

    await db.collection('posts').updateOne(
      { _id: postId },
      { $pull: { riderList: { email: email || null } } }
    );
    // Also remove any entry that matched on name if email was blank
    if (!email) {
      if (name) {
        await db.collection('posts').updateOne(
          { _id: postId },
          { $pull: { riderList: { name } } }
        );
      }
    }

    const updatedPost = await db.collection('posts').findOne({ _id: postId });
    const remainingRiders = (updatedPost?.riderList || []).filter((member) => member.email !== email);
    let notifiedCount = 0;

    const removedDisplayName = removedMember?.name || name || email;
    const actorDisplayName = actorName || removedDisplayName;
    const removedOwnself = actorEmail && actorEmail === email;
    const routeSummary = `${post.trip?.startLocation?.title || 'start'} to ${post.trip?.endLocation?.title || 'destination'}`;
    const dateSummary = post.trip?.date ? ` on ${post.trip.date}` : '';
    const timeSummary = post.trip?.time ? ` at ${post.trip.time}` : '';
    const rideSummary = `${routeSummary}${dateSummary}${timeSummary}`;
    const notificationMessage = removedOwnself
      ? `${removedDisplayName} left your riding list for ${rideSummary}.`
      : `${removedDisplayName} was removed from your riding list for ${rideSummary} by ${actorDisplayName}.`;

    // Notify all remaining riders and the post owner.
    const recipientEmailSet = new Set(
      remainingRiders
        .map((member) => (typeof member.email === 'string' ? member.email.trim() : ''))
        .filter(Boolean)
    );
    if (typeof post.user?.email === 'string' && post.user.email.trim()) {
      recipientEmailSet.add(post.user.email.trim());
    }
    if (typeof email === 'string' && email.trim()) {
      // Don't notify the member who just left/was removed.
      recipientEmailSet.delete(email.trim());
    }

    const recipientEmails = Array.from(recipientEmailSet);

    const recipients = [];
    for (const recipientEmail of recipientEmails) {
      // Use exact match first, then a case-insensitive fallback for inconsistent email casing.
      let user = await db.collection('users').findOne(
        { email: recipientEmail },
        { projection: { _id: 1, email: 1 } }
      );

      if (!user) {
        user = await db.collection('users').findOne(
          { email: { $regex: `^${escapeRegex(recipientEmail)}$`, $options: 'i' } },
          { projection: { _id: 1, email: 1 } }
        );
      }

      if (user) {
        recipients.push(user);
      }
    }

    if (recipients.length > 0) {
      const senderObjectId = actorId && ObjectId.isValid(actorId)
        ? new ObjectId(actorId)
        : null;

      const result = await db.collection('notifications').insertMany(
        recipients.map((user) => ({
          recipientId: user._id,
          senderName: actorDisplayName || 'HopShare',
          senderId: senderObjectId,
          message: notificationMessage,
          postId,
          replyToMessage: null,
          type: 'left_list',
          response: null,
          read: false,
          createdAt: new Date(),
        }))
      );
      notifiedCount = result.insertedCount || 0;
    }

    res.json({ success: true, notifiedCount });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// REMOVE a driver — owner action
router.post('/:id/remove-driver', async (req, res) => {
  try {
    const postId = toObjectId(req.params.id);
    if (!postId) return res.status(400).json({ error: 'Invalid post id' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const db = getDB();
    await db.collection('posts').updateOne(
      { _id: postId },
      { $pull: { drivers: { email }, pendingDrivers: { email } } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Remove driver error:', err);
    res.status(500).json({ error: 'Failed to remove driver' });
  }
});

module.exports = router;
