(function () {
  const config = window.WEDDING_CONFIG || {};
  const supabaseUrl = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const sessionKey = 'wedding-supabase-admin-session';
  const localPasswordKey = 'wedding-local-admin-password';

  function mode() {
    if (/^https:\/\//.test(supabaseUrl) && publishableKey.startsWith('sb_publishable_')) return 'supabase';
    if (['localhost', '127.0.0.1'].includes(location.hostname)) return 'local';
    return 'unconfigured';
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    if (!response.ok) {
      const error = new Error(data?.error_description || data?.message || data?.error || '요청에 실패했습니다.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function supabaseHeaders(token, extra = {}) {
    return { apikey: publishableKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
  }

  function rowToEntry(row) {
    return { id: row.id, name: row.name, message: row.message, createdAt: row.created_at, status: row.status };
  }

  async function listApproved() {
    if (mode() === 'supabase') {
      // 공개 가능 여부는 데이터베이스의 RLS 정책이 결정합니다.
      const rows = await fetchJson(`${supabaseUrl}/rest/v1/guestbook_entries?select=id,name,message,created_at&order=created_at.desc&limit=100`, {
        headers: supabaseHeaders()
      });
      return rows.map(rowToEntry);
    }
    if (mode() === 'local') return (await fetchJson('/api/guestbook')).entries;
    throw new Error('방명록 연결 준비 중입니다.');
  }

  async function createMessage({ name, message, website }) {
    if (website) return;
    if (mode() === 'supabase') {
      await fetchJson(`${supabaseUrl}/rest/v1/guestbook_entries`, {
        method: 'POST',
        headers: supabaseHeaders(null, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ name: name.trim(), message: message.trim() })
      });
      return;
    }
    if (mode() === 'local') {
      await fetchJson('/api/guestbook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, message, website })
      });
      return;
    }
    throw new Error('방명록 연결 준비 중입니다.');
  }

  async function createRsvp({ name, attending, partySize, note, website }) {
    if (website) return;
    if (mode() !== 'supabase') throw new Error('참석 여부 연결을 준비하고 있습니다.');
    await fetchJson(`${supabaseUrl}/rest/v1/rsvp_responses`, {
      method: 'POST',
      headers: supabaseHeaders(null, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({
        name: name.trim(),
        attending,
        party_size: attending ? Number(partySize) : 0,
        note: note.trim() || null
      })
    });
  }

  function saveSession(data) {
    const session = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
    };
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    return session;
  }

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { return null; }
  }

  async function accessToken() {
    const session = readSession();
    if (!session?.accessToken) throw new Error('다시 로그인해 주세요.');
    if (Date.now() < session.expiresAt - 60000) return session.accessToken;
    try {
      const refreshed = await fetchJson(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: supabaseHeaders(null, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ refresh_token: session.refreshToken })
      });
      return saveSession(refreshed).accessToken;
    } catch {
      sessionStorage.removeItem(sessionKey);
      throw new Error('로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');
    }
  }

  async function verifyModerator(token) {
    const rows = await fetchJson(`${supabaseUrl}/rest/v1/guestbook_admins?select=user_id&limit=1`, {
      headers: supabaseHeaders(token)
    });
    if (!rows.length) throw new Error('방명록 관리자 권한이 없습니다.');
  }

  async function login(email, password) {
    if (mode() === 'supabase') {
      const data = await fetchJson(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: supabaseHeaders(null, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email, password })
      });
      try {
        await verifyModerator(data.access_token);
        saveSession(data);
      } catch (error) {
        sessionStorage.removeItem(sessionKey);
        throw error;
      }
      return;
    }
    if (mode() === 'local') {
      const response = await fetchJson('/api/admin/guestbook', { headers: { 'X-Admin-Password': password } });
      if (!Array.isArray(response.entries)) throw new Error('관리자 로그인을 확인하지 못했습니다.');
      sessionStorage.setItem(localPasswordKey, password);
      return;
    }
    throw new Error('방명록 연결 준비 중입니다.');
  }

  async function listAll() {
    if (mode() === 'supabase') {
      const token = await accessToken();
      await verifyModerator(token);
      const rows = await fetchJson(`${supabaseUrl}/rest/v1/guestbook_entries?select=id,name,message,status,created_at&order=created_at.desc`, {
        headers: supabaseHeaders(token)
      });
      return rows.map(rowToEntry);
    }
    if (mode() === 'local') {
      const password = sessionStorage.getItem(localPasswordKey);
      if (!password) throw new Error('다시 로그인해 주세요.');
      return (await fetchJson('/api/admin/guestbook', { headers: { 'X-Admin-Password': password } })).entries;
    }
    throw new Error('방명록 연결 준비 중입니다.');
  }

  async function listRsvps() {
    if (mode() !== 'supabase') throw new Error('참석 응답 연결을 준비하고 있습니다.');
    const token = await accessToken();
    await verifyModerator(token);
    return fetchJson(`${supabaseUrl}/rest/v1/rsvp_responses?select=id,name,attending,party_size,note,created_at&order=created_at.desc`, {
      headers: supabaseHeaders(token)
    });
  }

  async function setStatus(id, status) {
    if (!['approved', 'rejected'].includes(status)) throw new Error('올바른 상태가 아닙니다.');
    if (mode() === 'supabase') {
      await fetchJson(`${supabaseUrl}/rest/v1/guestbook_entries?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: supabaseHeaders(await accessToken(), { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ status, reviewed_at: new Date().toISOString() })
      });
      return;
    }
    if (mode() === 'local') {
      await fetchJson(`/api/admin/guestbook/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': sessionStorage.getItem(localPasswordKey) || '' },
        body: JSON.stringify({ status })
      });
      return;
    }
    throw new Error('방명록 연결 준비 중입니다.');
  }

  function hasStoredLogin() {
    return mode() === 'supabase' ? Boolean(readSession()?.accessToken) : Boolean(sessionStorage.getItem(localPasswordKey));
  }

  function logout() {
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(localPasswordKey);
  }

  window.GuestbookService = { mode, listApproved, createMessage, createRsvp, login, listAll, listRsvps, setStatus, hasStoredLogin, logout };
})();
