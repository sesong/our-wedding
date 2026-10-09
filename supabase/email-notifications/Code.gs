const DEFAULT_NOTIFY_EMAIL = 'kimsesong@gmail.com';
const ADMIN_PAGE_URL = 'https://sesong.github.io/our-wedding/admin.html';

/** Run once from the Apps Script editor, then copy the token from the log. */
function createWebhookToken() {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('WEBHOOK_TOKEN', token);
  console.log('Copy this token into the Supabase webhook URL: ' + token);
}

/** Run once from the Apps Script editor to grant permission to send email. */
function authorizeMail() {
  console.log('Remaining daily email recipients: ' + MailApp.getRemainingDailyQuota());
}

/** Receives Supabase Database Webhook POST requests. */
function doPost(e) {
  try {
    const expectedToken = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
    const suppliedToken = e && e.parameter ? e.parameter.token : '';
    if (!expectedToken || suppliedToken !== expectedToken) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }

    const payload = JSON.parse(e.postData.contents);
    if (payload.type !== 'INSERT' || payload.table !== 'guestbook_entries' || payload.schema !== 'public') {
      return jsonResponse({ ok: true, ignored: true });
    }

    const entry = payload.record || {};
    if (entry.status !== 'pending') {
      return jsonResponse({ ok: true, ignored: true });
    }

    const name = String(entry.name || '').replace(/\s+/g, ' ').trim().slice(0, 30) || '이름 없음';
    const message = String(entry.message || '').trim().slice(0, 500);
    const subjectName = Array.from(name).slice(0, 16).join('');
    const singleLineMessage = message.replace(/\s+/g, ' ');
    const messageCharacters = Array.from(singleLineMessage);
    const messagePreview = messageCharacters.slice(0, 36).join('') + (messageCharacters.length > 36 ? '…' : '');
    const body = [
      '새 방명록이 등록되었습니다. 승인 후 공개됩니다.',
      '',
      '작성자: ' + name,
      '내용: ' + message,
      '',
      '관리자 페이지에서 확인하고 승인해 주세요:',
      ADMIN_PAGE_URL,
    ].join('\n');

    MailApp.sendEmail({
      to: DEFAULT_NOTIFY_EMAIL,
      subject: '[방명록] ' + subjectName + ': ' + messagePreview,
      body: body,
      name: '모바일 청첩장',
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Guestbook notification failed: ' + error);
    return jsonResponse({ ok: false, error: 'notification_failed' });
  }
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
