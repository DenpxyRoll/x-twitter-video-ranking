const ALLOWED_ORIGIN = 'https://twvideo-rank.net';

function corsHeaders(origin) {
  const ok = origin === ALLOWED_ORIGIN || origin?.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // POST /click : {url, category} → KVのカウントをインクリメント
    if (request.method === 'POST' && url.pathname === '/click') {
      try {
        const { url: videoUrl, category } = await request.json();
        if (!videoUrl) return new Response('Bad Request', { status: 400, headers: corsHeaders(origin) });
        const key = `${category || 'today'}::${videoUrl}`;
        const current = parseInt(await env.VIDEO_CLICKS.get(key) || '0', 10);
        await env.VIDEO_CLICKS.put(key, String(current + 1));
        return new Response(JSON.stringify({ ok: true, count: current + 1 }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch {
        return new Response('Bad Request', { status: 400, headers: corsHeaders(origin) });
      }
    }

    // GET /clicks : 全カウントをJSON形式で返す
    if (request.method === 'GET' && url.pathname === '/clicks') {
      const list = await env.VIDEO_CLICKS.list();
      const result = {};
      await Promise.all(list.keys.map(async k => {
        result[k.name] = parseInt(await env.VIDEO_CLICKS.get(k.name) || '0', 10);
      }));
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // /videos/* はmixhostから直接配信
    if (url.pathname.startsWith('/videos/')) {
      const originUrl = 'http://ik10002.mixhost.jp' + url.pathname;
      const originRequest = new Request(originUrl, {
        method: request.method,
        headers: { 'Host': 'twvideo-rank.net' },
      });
      const response = await fetch(originRequest);
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    }

    // それ以外はGitHubリポジトリの静的アセットを配信
    return env.ASSETS.fetch(request);
  },
};
