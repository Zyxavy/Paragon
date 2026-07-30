import type { PagesFunction } from '@cloudflare/workers-types';

const API_ORIGIN = 'https://paragon-api.kelpselp.workers.dev';

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = API_ORIGIN + url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.set('Host', new URL(API_ORIGIN).host);

  try {
    return await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'manual',
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'proxy_error', message: 'Failed to reach API server.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
