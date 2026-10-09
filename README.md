# 김세송 ♥ 박나해 모바일 청첩장

2027년 2월 20일 오후 3시, 서울 서초구 반포대로 157 대검찰청 별관 4층 예그리나홀에서 열리는 결혼식의 모바일 청첩장입니다.

## 공개 주소

GitHub Pages 배포 후 [https://sesong.github.io/our-wedding/](https://sesong.github.io/our-wedding/)에서 볼 수 있습니다.

## 구성

- 예식 날짜와 장소, 지하철·주차 안내, 네이버 지도·카카오맵 링크
- `pictures/`의 사진 20장을 모바일용으로 줄인 갤러리와 확대 보기
- 날짜 카운트다운, 축의금 계좌번호 복사, 청첩장 공유
- 하객 참석 여부 응답과 승인 후 공개되는 방명록
- 관리자 화면에서 참석 현황 확인 및 방명록 승인

## 참석 여부와 방명록 설정

- Supabase 프로젝트의 Project URL과 `sb_publishable_` 키는 `docs/config.js`에 설정합니다. 이 공개용 키는 웹페이지에서 사용하며, Secret key나 `service_role` 키는 여기에 넣지 마세요.
- `supabase/schema.sql`을 Supabase Dashboard의 SQL Editor에서 실행해 테이블과 접근 정책을 만듭니다. 실행 전에 Authentication의 Users에서 `kimsesong@gmail.com` 관리자 사용자를 먼저 생성해야 관리자 권한도 등록됩니다.
- 관리자 화면에서 응답이나 방명록을 삭제하려면 `supabase/migrations/20261009_admin_delete.sql`도 SQL Editor에서 실행하세요. 삭제 권한은 관리자 로그인 사용자에게만 부여됩니다.
- 관리자 화면은 `https://sesong.github.io/our-wedding/admin.html`입니다. 참석 응답은 로그인한 관리자만 조회할 수 있고, 방명록은 승인한 글만 공개됩니다.

## 수정하기

- 최종 인사말이 정해지면 [docs/index.html](docs/index.html)의 초대 문구를 수정하세요.
- 원본 사진은 로컬 `pictures/`에 두고 Git에서 제외했습니다. 공개용 사진은 `docs/images/`에 있습니다. 사진을 추가하거나 바꾸면 Windows PowerShell에서 `powershell -ExecutionPolicy Bypass -File scripts/prepare-images.ps1`을 실행하세요.
- GitHub Pages는 `main` 브랜치의 `/docs` 폴더에서 배포합니다. 정적 파일만으로 동작하며 별도 빌드가 필요하지 않습니다.
