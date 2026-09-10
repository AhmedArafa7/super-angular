/**
 * Cloudflare Pages Function: POST /api/ai/generate
 * 
 * Secure Serverless Edge Proxy for Gemini & Imagen API.
 * Keeps GEMINI_API_KEY strictly server-side in Cloudflare Environment Secrets.
 * 
 * Accepts:
 *  - body: {
 *      model?: string,             // e.g. 'gemini-2.5-flash', 'gemini-3.5-flash-lite', 'imagen-3.0-generate-001'
 *      action?: string,            // 'generateContent' | 'predict'
 *      contents?: any[],           // Gemini standard contents
 *      prompt?: string,            // Simple prompt convenience
 *      instances?: any[],          // Imagen standard instances
 *      parameters?: any,           // Imagen parameters
 *      generationConfig?: any,     // Generation configuration
 *      systemInstruction?: any     // System instructions
 *    }
 *  - optional header: 'x-gemini-api-key' (for user-provided BYOK keys)
 */

export async function onRequestPost({ request, env }) {
  try {
    const customHeaderKey = request.headers.get('x-gemini-api-key');
    const body = await request.json().catch(() => ({}));

    // Resolve API Key: custom key from client OR server secret from Cloudflare Pages env
    const apiKey = (customHeaderKey || body.apiKey || env?.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'لم يتم تكوين مفتاح GEMINI_API_KEY على خادم Cloudflare Pages. يرجى إضافته في Secrets أو إدخال مفتاح مخصص في الإعدادات.'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const model = body.model || 'gemini-2.5-flash';
    const isPredict = model.includes('imagen') || body.action === 'predict';
    const action = body.action || (isPredict ? 'predict' : 'generateContent');

    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}`;

    // Construct upstream payload
    let upstreamBody = {};

    if (isPredict) {
      upstreamBody = {
        instances: body.instances || (body.prompt ? [{ prompt: body.prompt }] : []),
        parameters: body.parameters || { sampleCount: 1 }
      };
    } else {
      if (body.contents) {
        upstreamBody.contents = body.contents;
      } else if (body.prompt) {
        upstreamBody.contents = [{ parts: [{ text: body.prompt }] }];
      } else {
        upstreamBody.contents = [];
      }

      if (body.systemInstruction) {
        upstreamBody.systemInstruction = body.systemInstruction;
      }
      if (body.generationConfig) {
        upstreamBody.generationConfig = body.generationConfig;
      }
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(upstreamBody)
    });

    const responseData = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      return new Response(JSON.stringify({
        ok: false,
        status: upstreamResponse.status,
        error: responseData.error?.message || 'Google Gemini API Error',
        details: responseData.error
      }), {
        status: upstreamResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Extract quick text convenience if standard generateContent
    let text = '';
    if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = responseData.candidates[0].content.parts[0].text;
    }

    return new Response(JSON.stringify({
      ok: true,
      data: responseData,
      text
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err.message || 'Server Edge Error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-gemini-api-key',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400'
    }
  });
}
