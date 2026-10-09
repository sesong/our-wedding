# 방명록 이메일 알림 설정

Supabase에 새 방명록이 등록되면 Google Apps Script가 `kimsesong@gmail.com`으로 알림 메일을 보냅니다. 별도 도메인이나 서버는 필요하지 않습니다.

## 1. Apps Script 만들기

1. `kimsesong@gmail.com`으로 로그인한 뒤 [script.google.com](https://script.google.com/)에서 새 프로젝트를 만듭니다.
2. 기본 `Code.gs` 내용을 지우고 이 폴더의 `Code.gs` 내용을 붙여넣어 저장합니다.
3. 함수 선택 메뉴에서 `createWebhookToken`을 선택해 실행합니다. 최초 실행 시 권한을 요청하면 허용합니다.
4. 실행 로그에 나온 토큰을 복사합니다. 토큰은 Supabase Webhook URL에만 넣고 저장소에는 커밋하지 마세요.
5. `authorizeMail`을 선택해 실행하여 메일 발송 권한을 승인합니다.

## 2. 웹 앱 배포

1. 우측 상단 **배포 → 새 배포**를 선택합니다.
2. 유형에서 **웹 앱**을 선택합니다.
3. **다음 사용자로 실행**은 본인 계정, **액세스 권한이 있는 사용자**는 **모든 사용자**로 설정한 뒤 배포합니다.
4. 배포된 웹 앱 URL을 복사합니다. URL은 `https://script.google.com/macros/s/.../exec` 형태입니다.

웹 앱은 외부에서 호출 가능하므로, URL의 `exec` 뒤에 아래처럼 앞 단계에서 복사한 토큰을 붙입니다.

```text
https://script.google.com/macros/s/배포ID/exec?token=복사한토큰
```

토큰이 맞지 않는 요청은 메일을 보내지 않습니다. 토큰이 유출되면 `createWebhookToken`을 다시 실행해 교체하고 Supabase Webhook URL도 업데이트하세요.

## 3. Supabase Webhook 만들기

Supabase Dashboard에서 **Integrations → Database Webhooks → Webhooks 탭 → Create a new hook**으로 이동하고 다음과 같이 설정합니다.

- 이름: `guestbook-email-notification`
- 테이블: `public.guestbook_entries`
- 이벤트: `INSERT`만 선택
- 타입/메서드: `POST`
- URL: 토큰을 붙인 Apps Script 웹 앱 URL
- 헤더: `Content-Type: application/json`

저장한 뒤 청첩장 페이지에서 테스트 방명록을 작성해 보세요. `kimsesong@gmail.com`의 받은편지함과 스팸함에서 알림을 확인합니다. 메일 제목에 작성자와 메시지 앞부분(최대 36자)이 표시되고, 본문에는 전체 메시지가 들어갑니다. 알림 메일은 승인 대기 중인 글에만 발송됩니다.

## 참고

- 개인 Google 계정의 Apps Script 메일 발송 한도는 현재 하루 수신자 100명이며, Google이 변경할 수 있습니다.
- 각 방명록마다 한 통을 발송하므로 테스트 글도 알림이 옵니다.
- 이 코드는 방명록 이름과 내용을 알림 메일에 포함합니다. 이 메일은 관리자 계정으로만 발송됩니다.
