const API_ORIGIN = 'https://paragon-api.kelpselp.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = API_ORIGIN + url.pathname + url.search;

  return fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'manual',
  });
}
