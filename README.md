# 김세송 ♥ 박나해 모바일 청첩장

2027년 2월 20일 오후 3시, 서울 서초구 반포대로 157 대검찰청 별관 4층 예그리나홀에서 열리는 결혼식의 모바일 청첩장입니다.

## 공개 주소

GitHub Pages 배포 후 [https://sesong.github.io/our-wedding/](https://sesong.github.io/our-wedding/)에서 볼 수 있습니다.

## 구성

- 예식 날짜와 장소, 지하철·주차 안내, 네이버 지도·카카오맵 링크
- `pictures/`의 사진 20장을 모바일용으로 줄인 갤러리와 확대 보기
- 축의금 계좌번호 복사, 청첩장 공유, 캘린더 일정 저장

방명록은 이번 공개본에 넣지 않았습니다.

## 수정하기

- 최종 인사말이 정해지면 [docs/index.html](docs/index.html)의 초대 문구를 수정하세요.
- 원본 사진은 로컬 `pictures/`에 두고 Git에서 제외했습니다. 공개용 사진은 `docs/images/`에 있습니다. 사진을 추가하거나 바꾸면 Windows PowerShell에서 `powershell -ExecutionPolicy Bypass -File scripts/prepare-images.ps1`을 실행하세요.
- GitHub Pages는 `main` 브랜치의 `/docs` 폴더에서 배포합니다. 정적 파일만으로 동작하며 별도 빌드가 필요하지 않습니다.
