import { createServer } from 'node:http';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'docs');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
const dataFile = path.join(dataDir, 'guestbook.json');
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.ADMIN_PASSWORD || '';
const adminEnabled = adminPassword.length >= 12 && adminPassword !== 'replace-with-a-long-unique-password';
const limits = new Map();
let writeQueue = Promise.resolve();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar; charset=utf-8'
};

function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function readEntries() {
  try {
    const parsed = JSON.parse(await readFile(dataFile, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('Invalid guestbook data');
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveEntries(entries) {
  await mkdir(dataDir, { recursive: true });
  const temporaryFile = path.join(dataDir, `guestbook-${randomUUID()}.tmp`);
  await writeFile(temporaryFile, JSON.stringify(entries, null, 2), { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryFile, dataFile);
}

function mutateEntries(operation) {
  const next = writeQueue.then(async () => {
    const entries = await readEntries();
    const result = await operation(entries);
    await saveEntries(entries);
    return result;
  });
  writeQueue = next.catch(() => {});
  return next;
}

function isAdmin(req) {
  if (!adminEnabled) return false;
  const supplied = req.headers['x-admin-password'];
  if (typeof supplied !== 'string') return false;
  const storedHash = createHash('sha256').update(adminPassword).digest();
  const suppliedHash = createHash('sha256').update(supplied).digest();
  return timingSafeEqual(storedHash, suppliedHash);
}

async function readJsonBody(req) {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    const error = new Error('JSON 형식으로 보내 주세요.');
    error.status = 415;
    throw error;
  }
  let length = 0;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 10240) {
      const error = new Error('메시지가 너무 깁니다.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('올바른 JSON 형식이 아닙니다.');
    error.status = 400;
    throw error;
  }
}

function clientIp(req) {
  if (process.env.TRUST_PROXY === '1') {
    return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (limits.get(ip) || []).filter(time => now - time < 600000);
  if (recent.length >= 3) return false;
  recent.push(now);
  limits.set(ip, recent);
  if (limits.size > 10000) {
    for (const [key, timestamps] of limits) {
      if (timestamps.every(time => now - time >= 600000)) limits.delete(key);
    }
  }
  return true;
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/guestbook' && req.method === 'GET') {
    const entries = (await readEntries())
      .filter(entry => entry.status === 'approved')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100)
      .map(({ id, name, message, createdAt }) => ({ id, name, message, createdAt }));
    return sendJson(res, 200, { entries });
  }

  if (pathname === '/api/guestbook' && req.method === 'POST') {
    const body = await readJsonBody(req);
    if (body?.website) return sendJson(res, 200, { ok: true });
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (name.length < 1 || name.length > 30 || message.length < 2 || message.length > 500) {
      return sendJson(res, 400, { error: '이름은 1~30자, 메시지는 2~500자로 적어 주세요.' });
    }
    if (!checkRateLimit(req)) return sendJson(res, 429, { error: '잠시 후 다시 메시지를 남겨 주세요.' });
    await mutateEntries(entries => {
      entries.push({ id: randomUUID(), name, message, createdAt: new Date().toISOString(), status: 'pending' });
    });
    return sendJson(res, 201, { ok: true, status: 'pending' });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!adminEnabled) return sendJson(res, 503, { error: '관리자 비밀번호가 설정되지 않았습니다.' });
    if (!isAdmin(req)) return sendJson(res, 401, { error: '비밀번호를 확인해 주세요.' });
    if (pathname === '/api/admin/guestbook' && req.method === 'GET') {
      const entries = (await readEntries()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return sendJson(res, 200, { entries });
    }
    const match = pathname.match(/^\/api\/admin\/guestbook\/([0-9a-f-]+)$/);
    if (match && req.method === 'PATCH') {
      const body = await readJsonBody(req);
      if (!['approved', 'rejected'].includes(body?.status)) {
        return sendJson(res, 400, { error: '올바른 상태가 아닙니다.' });
      }
      const found = await mutateEntries(entries => {
        const entry = entries.find(item => item.id === match[1]);
        if (!entry) return false;
        entry.status = body.status;
        entry.reviewedAt = new Date().toISOString();
        return true;
      });
      return found ? sendJson(res, 200, { ok: true }) : sendJson(res, 404, { error: '메시지를 찾을 수 없습니다.' });
    }
  }
  return sendJson(res, 404, { error: '요청한 API를 찾을 수 없습니다.' });
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: '허용되지 않는 요청입니다.' });
  const requested = pathname === '/' ? '/index.html' : pathname === '/admin' ? '/admin.html' : pathname;
  let decoded;
  try { decoded = decodeURIComponent(requested); } catch { return sendJson(res, 400, { error: '잘못된 주소입니다.' }); }
  const filePath = path.resolve(publicDir, `.${decoded}`);
  const relative = path.relative(publicDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return sendJson(res, 403, { error: '접근할 수 없습니다.' });
  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return sendJson(res, 404, { error: '페이지를 찾을 수 없습니다.' });
    throw error;
  }
}

const server = createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
    await serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, error.status || 500, { error: error.status ? error.message : '서버 오류가 발생했습니다.' });
    else res.end();
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Wedding invitation: http://localhost:${port}`);
    if (!adminEnabled) console.warn('ADMIN_PASSWORD is missing or too short. Guestbook approval is disabled.');
  });
}

export { server };
