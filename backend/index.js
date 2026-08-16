const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache responses for 1 hour by default

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: Date.now() });
});

// Generic proxy & cache endpoint for YouTube/Piped search
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const cacheKey = `search_${query}`;
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return res.json({ source: 'cache', data: cachedResult });
  }

  try {
    // Fetch from Piped or Invidious public API instance
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://pipedapi.drgns.space',
      'https://piped-api.privacy.com.de'
    ];

    let data = null;
    for (const instance of pipedInstances) {
      try {
        const response = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=videos`);
        if (response.ok) {
          const json = await response.json();
          data = json.items || json;
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (data) {
      cache.set(cacheKey, data, 7200); // Cache for 2 hours
      return res.json({ source: 'live', data });
    } else {
      return res.status(502).json({ error: 'All search instances failed' });
    }
  } catch (err) {
    console.error('Search proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// oEmbed proxy with caching
app.get('/api/oembed', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) {
    return res.status(400).json({ error: 'Video ID id is required' });
  }

  const cacheKey = `oembed_${videoId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const resp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (resp.ok) {
      const json = await resp.json();
      cache.set(cacheKey, json, 86400); // Cache for 24 hours
      return res.json({ source: 'live', data: json });
    } else {
      return res.status(404).json({ error: 'Video not found or oEmbed blocked' });
    }
  } catch (err) {
    res.status(500).json({ error: 'oEmbed fetch failed' });
  }
});

app.listen(PORT, () => {
  console.log(`HalalTube Render Backend Proxy listening on port ${PORT}`);
});
