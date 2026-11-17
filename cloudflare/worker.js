/**
 * CVMF — Worker de Cloudflare.
 *
 * 1. Cron cada 5 minutos: pide a GitHub que ejecute el flujo de actualización.
 * 2. /partido?id=1234: puente con la FAV para leer el marcador en vivo (CORS).
 * 3. /run: lanza una actualización a mano. Requiere la cabecera
 *    «Authorization: Bearer <RUN_KEY>»; sin RUN_KEY configurada queda cerrado.
 *
 * Variables necesarias en el Worker:
 *   GH_TOKEN     (secreto)  token de GitHub con permiso Actions: read and write
 *   GH_REPO      (texto)    iAWebDemos/CVMF-Web-DEMO
 *   GH_WORKFLOW  (texto)    actualizar-partidos.yml
 *   RUN_KEY      (secreto)  clave larga y aleatoria para /run (opcional)
 */

const FAV = 'https://www.favoley.net/publico/competicion_partido_datos.php?id=';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(dispatch(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/partido') {
      if (request.method !== 'GET') {
        return json({ ok: false, error: 'método no permitido' }, 405);
      }
      const id = url.searchParams.get('id') || '';
      if (!/^\d{1,9}$/.test(id)) {
        return json({ ok: false, error: 'id no válido' }, 400);
      }
      const upstream = await fetch(FAV + id, {
        headers: { 'user-agent': 'Mozilla/5.0', 'x-requested-with': 'XMLHttpRequest' },
        cf: { cacheTtl: 15, cacheEverything: true },
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: {
          ...CORS,
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=15',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
          'content-security-policy': "default-src 'none'; sandbox",
        },
      });
    }

    if (url.pathname === '/run') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'método no permitido' }, 405);
      }
      if (!(await authorized(request, env))) {
        return json({ ok: false, error: 'no autorizado' }, 401);
      }
      return json(await dispatch(env));
    }

    return new Response(
      'CVMF · worker activo\n\n' +
        'Cron: cada 5 minutos\n' +
        'Marcador en vivo: /partido?id=1234\n',
      { headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  },
};

async function authorized(request, env) {
  if (!env.RUN_KEY) return false;
  const expected = 'Bearer ' + env.RUN_KEY;
  const given = request.headers.get('authorization') || '';
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

async function dispatch(env) {
  if (!env.GH_TOKEN || !env.GH_REPO || !env.GH_WORKFLOW) {
    return { ok: false, error: 'faltan GH_TOKEN, GH_REPO o GH_WORKFLOW' };
  }

  const base =
    'https://api.github.com/repos/' + env.GH_REPO + '/actions/workflows/' + env.GH_WORKFLOW;

  const headers = {
    authorization: 'Bearer ' + env.GH_TOKEN,
    accept: 'application/vnd.github+json',
    'user-agent': 'cvmf-worker',
  };

  // Si ya hay una ejecución en marcha, no encolamos otra.
  const running = await fetch(base + '/runs?status=in_progress&per_page=1', { headers });
  if (running.ok) {
    const data = await running.json();
    if ((data.total_count || 0) > 0) {
      return { ok: true, skipped: 'ya hay una ejecución en curso' };
    }
  }

  const response = await fetch(base + '/dispatches', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ ref: 'main' }),
  });

  return { ok: response.ok, status: response.status };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
  });
}
