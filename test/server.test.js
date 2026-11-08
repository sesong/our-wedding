import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const testDir = await mkdtemp(path.join(os.tmpdir(), 'wedding-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = testDir;
process.env.ADMIN_PASSWORD = 'temporary-test-password-12345';
const { server } = await import('../server.js');
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await rm(testDir, { recursive: true, force: true });
});

test('guestbook waits for approval before publishing and supports moderation', async () => {
  const create = await fetch(`${baseUrl}/api/guestbook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '축하객', message: '<script>행복하세요!</script>' })
  });
  assert.equal(create.status, 201);

  let publicResponse = await fetch(`${baseUrl}/api/guestbook`);
  assert.deepEqual((await publicResponse.json()).entries, []);

  const unauthorized = await fetch(`${baseUrl}/api/admin/guestbook`);
  assert.equal(unauthorized.status, 401);

  const headers = { 'X-Admin-Password': process.env.ADMIN_PASSWORD };
  const adminResponse = await fetch(`${baseUrl}/api/admin/guestbook`, { headers });
  const { entries } = await adminResponse.json();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].status, 'pending');

  const approve = await fetch(`${baseUrl}/api/admin/guestbook/${entries[0].id}`, {
    method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' })
  });
  assert.equal(approve.status, 200);
  publicResponse = await fetch(`${baseUrl}/api/guestbook`);
  assert.equal((await publicResponse.json()).entries[0].name, '축하객');

  const hide = await fetch(`${baseUrl}/api/admin/guestbook/${entries[0].id}`, {
    method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected' })
  });
  assert.equal(hide.status, 200);
  publicResponse = await fetch(`${baseUrl}/api/guestbook`);
  assert.deepEqual((await publicResponse.json()).entries, []);

  const saved = JSON.parse(await readFile(path.join(testDir, 'guestbook.json'), 'utf8'));
  assert.equal(saved[0].status, 'rejected');
});

test('serves the invitation and rejects invalid guestbook data', async () => {
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /김세송/);

  for (const icon of ['naver-map-app-icon.webp', 'kakao-map-app-icon.webp']) {
    const image = await fetch(`${baseUrl}/images/${icon}`);
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type'), /^image\/webp/);
  }

  const invalid = await fetch(`${baseUrl}/api/guestbook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '', message: 'x' })
  });
  assert.equal(invalid.status, 400);
});
