export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
