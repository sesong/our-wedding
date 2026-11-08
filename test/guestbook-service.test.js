import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = await readFile(path.join(root, 'docs', 'guestbook-service.js'), 'utf8');

test('GitHub Pages guestbook sends public writes as pending and moderates with user token', async () => {
  const requests = [];
  const store = new Map();
  const context = {
    window: { WEDDING_CONFIG: { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_test' } },
    location: { hostname: 'example.github.io' },
    sessionStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) },
    Date,
    JSON,
    String,
    Number,
    encodeURIComponent,
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      if (url.includes('grant_type=password')) return new Response(JSON.stringify({ access_token: 'user-jwt', refresh_token: 'refresh-token', expires_in: 3600 }), { status: 200 });
      if (url.includes('guestbook_admins')) return new Response(JSON.stringify([{ user_id: 'admin-id' }]), { status: 200 });
      if (options.method === 'POST') return new Response('', { status: 201 });
      if (options.method === 'PATCH') return new Response(null, { status: 204 });
      return new Response(JSON.stringify([{ id: 'entry-id', name: '하객', message: '축하해요', created_at: '2026-10-07T00:00:00Z' }]), { status: 200 });
    }
  };
  vm.runInNewContext(source, context);
  const service = context.window.GuestbookService;
  assert.equal(service.mode(), 'supabase');

  const publicEntries = await service.listApproved();
  assert.equal(publicEntries[0].name, '하객');
  assert.equal(requests[0].options.headers.apikey, 'sb_publishable_test');
  assert.equal(requests[0].options.headers.Authorization, undefined);

  await service.createMessage({ name: ' 하객 ', message: ' 축하합니다 ', website: '' });
  const write = requests.at(-1);
  assert.deepEqual(JSON.parse(write.options.body), { name: '하객', message: '축하합니다' });
  assert.equal(write.options.headers.Authorization, undefined);

  await service.login('admin@example.com', 'example-password');
  const entries = await service.listAll();
  assert.equal(entries[0].id, 'entry-id');
  await service.setStatus('entry-id', 'approved');
  const approval = requests.at(-1);
  assert.equal(approval.options.headers.Authorization, 'Bearer user-jwt');
  assert.equal(JSON.parse(approval.options.body).status, 'approved');
});
