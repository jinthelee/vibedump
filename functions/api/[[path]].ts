interface Env {
  BACKEND_URL?: string;
}

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  const backendBase = env.BACKEND_URL?.trim();

  if (!backendBase) {
    return Response.json(
      { error: 'API 백엔드가 연결되지 않았습니다. Cloudflare Pages 환경 변수 BACKEND_URL을 설정해주세요.' },
      { status: 503 }
    );
  }

  let target: URL;
  try {
    target = new URL(request.url);
    const backend = new URL(backendBase);
    target.protocol = backend.protocol;
    target.host = backend.host;
    target.username = backend.username;
    target.password = backend.password;
  } catch {
    return Response.json({ error: 'BACKEND_URL 설정이 올바르지 않습니다.' }, { status: 500 });
  }

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', new URL(request.url).host);

  try {
    const upstream = new Request(target.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });
    return await fetch(upstream);
  } catch {
    return Response.json({ error: 'API 백엔드에 연결할 수 없습니다.' }, { status: 502 });
  }
};
