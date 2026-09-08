/**
 * Cloudflare Pages Function: POST /api/meeting/token
 * Issues a signed LiveKit Access Token server-side.
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { roomName, participantName, participantId } = body;

    if (!roomName || !participantId) {
      return new Response(JSON.stringify({ ok: false, error: 'roomName and participantId are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = env?.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = env?.LIVEKIT_API_SECRET || 'secret';
    const livekitUrl = env?.LIVEKIT_URL || 'wss://livekit.example.com';

    // Build standard LiveKit Access Token JWT Header & Claims
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: apiKey,
      sub: participantId,
      name: participantName || 'Participant',
      nbf: now - 5,
      exp: now + (4 * 3600), // 4 hours TTL
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      }
    };

    const b64Url = (str) => btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const headerB64 = b64Url(JSON.stringify(header));
    const payloadB64 = b64Url(JSON.stringify(payload));
    const dataToSign = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
    const sigBytes = new Uint8Array(signature);
    let binary = '';
    for (let i = 0; i < sigBytes.byteLength; i++) {
      binary += String.fromCharCode(sigBytes[i]);
    }
    const signatureB64 = b64Url(binary);

    const token = `${dataToSign}.${signatureB64}`;

    return new Response(JSON.stringify({
      ok: true,
      token,
      serverUrl: livekitUrl,
      isConfigured: !!(env?.LIVEKIT_API_KEY && env?.LIVEKIT_API_SECRET && env?.LIVEKIT_URL)
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
