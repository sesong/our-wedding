(() => {
  const mapContainer = document.querySelector('#kakao-map');
  const status = document.querySelector('#kakao-map-status');
  if (!mapContainer || !status) return;

  const key = window.WEDDING_CONFIG?.kakaoMapJavascriptKey?.trim();
  if (!key) {
    status.textContent = '카카오 개발자 JavaScript 키를 등록하면 지도가 표시됩니다.';
    return;
  }

  const sdk = document.createElement('script');
  sdk.async = true;
  sdk.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;

  const failTimer = window.setTimeout(() => {
    status.textContent = '카카오 지도를 불러오지 못했습니다. 아래 카카오맵 버튼을 이용해 주세요.';
  }, 8000);

  sdk.onerror = () => {
    window.clearTimeout(failTimer);
    status.textContent = '카카오 지도를 불러오지 못했습니다. 아래 카카오맵 버튼을 이용해 주세요.';
  };

  sdk.onload = () => {
    if (!window.kakao?.maps) {
      window.clearTimeout(failTimer);
      status.textContent = '카카오 지도 연결에 실패했습니다. JavaScript 키와 등록 도메인을 확인해 주세요.';
      return;
    }

    window.kakao.maps.load(() => {
      const kakao = window.kakao;
      const fallbackPosition = new kakao.maps.LatLng(37.494383, 127.006115);
      const map = new kakao.maps.Map(mapContainer, { center: fallbackPosition, level: 3 });
      const marker = new kakao.maps.Marker({ map, position: fallbackPosition });
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
      const info = new kakao.maps.InfoWindow({
        content: '<div class="kakao-map-label">예그리나홀</div>'
      });
      info.open(map, marker);

      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch('서울특별시 서초구 반포대로 157', (results, resultStatus) => {
        if (resultStatus === kakao.maps.services.Status.OK && results[0]) {
          const position = new kakao.maps.LatLng(results[0].y, results[0].x);
          map.setCenter(position);
          marker.setPosition(position);
        }
      });

      window.clearTimeout(failTimer);
      status.remove();
    });
  };

  document.head.append(sdk);
})();
