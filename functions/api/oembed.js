export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const videoId = url.searchParams.get('id');

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Video ID id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const resp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      cf: { cacheTtl: 86400, cacheEverything: true }
    });
    if (resp.ok) {
      const json = await resp.json();
      return new Response(JSON.stringify({ source: 'edge-cache', data: json }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400'
        }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'oEmbed failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
