export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter q is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const filter = url.searchParams.get('filter') || 'all';

  const instances = [
    'https://pipedapi.adminforge.de',
    'https://pipedapi.drgns.space',
    'https://pipedapi.smnz.de',
    'https://piped-api.garudalinux.org',
    'https://inv.nadeko.net/api/v1',
    'https://invidious.nerdvpn.de/api/v1'
  ];

  let data = null;
  for (const instance of instances) {
    try {
      const endpoint = instance.includes('invidious') || instance.includes('/api/v1')
        ? `${instance}/search?q=${encodeURIComponent(query)}`
        : `${instance}/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`;
        
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        cf: { cacheTtl: 3600, cacheEverything: true }
      });
      if (resp.ok) {
        const json = await resp.json();
        data = json.items || json;
        if (Array.isArray(data) && data.length > 0) {
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600'
  };

  if (data) {
    return new Response(JSON.stringify({ source: 'edge-cache', data }), {
      status: 200,
      headers: corsHeaders
    });
  } else {
    return new Response(JSON.stringify({ error: 'Search failed', data: [] }), {
      status: 200,
      headers: corsHeaders
    });
  }
}
