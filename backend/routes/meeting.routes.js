const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const router = express.Router();

/**
 * POST /api/meeting/token
 * Safely generates and signs a short-lived LiveKit Access Token server-side.
 * The API Secret is NEVER exposed to the frontend/Angular browser.
 */
router.post('/token', async (req, res) => {
  try {
    const { roomName, participantName, participantId } = req.body || {};

    if (!roomName || !participantId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'roomName and participantId are required' 
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    const livekitUrl = process.env.LIVEKIT_URL || 'wss://livekit.example.com';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantId,
      name: participantName || 'Participant',
      ttl: '4h'
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();

    return res.json({
      ok: true,
      token,
      serverUrl: livekitUrl,
      isConfigured: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_URL)
    });
  } catch (error) {
    console.error('[Meeting Routes] Error issuing LiveKit token:', error);
    return res.status(500).json({ ok: false, error: 'Failed to issue token' });
  }
});

module.exports = router;
