export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter q is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.drgns.space',
    'https://piped-api.privacy.com.de'
  ];

  let data = null;
  for (const instance of pipedInstances) {
    try {
      const resp = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=videos`, {
        cf: { cacheTtl: 86400, cacheEverything: true }
      });
      if (resp.ok) {
        const json = await resp.json();
        data = json.items || json;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (data) {
    return new Response(JSON.stringify({ source: 'edge-cache', data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400'
      }
    });
  } else {
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
