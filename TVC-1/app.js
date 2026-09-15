/**
 * 바다앞에 (Badaape) - 반응형 웹 서비스 코어 애플리케이션 (app.js)
 * Vanilla JavaScript / No Frameworks / Strict Security (No raw innerHTML for user inputs)
 */

(function () {
  'use strict';

  // 1. 공통 상태 및 스토리지 키 관리
  const STORAGE_KEYS = {
    SAVED_PLACES: 'badaape_saved_places',
    COMPARE_PLACES: 'badaape_compare_places',
    PREFERENCES: 'badaape_user_preferences',
    NOTIFICATIONS: 'badaape_user_notifications',
    USER_REPORTS: 'badaape_user_reports',
    RECENT_PLACES: 'badaape_recent_places'
  };

  // 2. LocalStorage 안전 헬퍼
  const Storage = {
    get(key, defaultValue) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.warn(`LocalStorage read error for ${key}:`, e);
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn(`LocalStorage write error for ${key}:`, e);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`LocalStorage remove error for ${key}:`, e);
      }
    },
    clearAll() {
      try {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn('LocalStorage clear error:', e);
      }
    }
  };

  // 3. 데이터 조회 헬퍼
  function getAllPlaces() {
    return (window.BADA_DATA && window.BADA_DATA.places) ? window.BADA_DATA.places : [];
  }

  function getPlaceById(id) {
    if (!id) return null;
    return getAllPlaces().find(p => p.id === id) || null;
  }

  function getUrlParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  }

  // 4. 전역 토스트 피드백 알림 (aria-live="polite")
  function showToast(message, type = 'info') {
    let toast = document.getElementById('bada-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bada-toast';
      toast.className = 'toast-alert';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast-alert toast-alert--visible toast-alert--${type}`;

    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      toast.className = 'toast-alert';
    }, 3200);
  }

  // 5. 최근 확인한 장소 기록
  function recordRecentPlace(placeId) {
    if (!placeId) return;
    let recents = Storage.get(STORAGE_KEYS.RECENT_PLACES, []);
    recents = recents.filter(id => id !== placeId);
    recents.unshift(placeId);
    if (recents.length > 5) recents = recents.slice(0, 5);
    Storage.set(STORAGE_KEYS.RECENT_PLACES, recents);
  }

  // 6. 장소 저장 및 비교 토글 기능
  function isPlaceSaved(placeId) {
    const saved = Storage.get(STORAGE_KEYS.SAVED_PLACES, ['gujora', 'jangho']);
    return saved.includes(placeId);
  }

  function toggleSavePlace(placeId) {
    let saved = Storage.get(STORAGE_KEYS.SAVED_PLACES, ['gujora', 'jangho']);
    const place = getPlaceById(placeId);
    const placeName = place ? place.name : '장소';

    if (saved.includes(placeId)) {
      saved = saved.filter(id => id !== placeId);
      Storage.set(STORAGE_KEYS.SAVED_PLACES, saved);
      showToast(`‘${placeName}’ 장소 저장을 취소했습니다.`, 'info');
      return false;
    } else {
      saved.push(placeId);
      Storage.set(STORAGE_KEYS.SAVED_PLACES, saved);
      showToast(`‘${placeName}’을(를) 저장 목록에 담았습니다.`, 'success');
      return true;
    }
  }

  function isPlaceInCompare(placeId) {
    const compare = Storage.get(STORAGE_KEYS.COMPARE_PLACES, ['gujora', 'jangho']);
    return compare.includes(placeId);
  }

  function toggleComparePlace(placeId) {
    let compare = Storage.get(STORAGE_KEYS.COMPARE_PLACES, ['gujora', 'jangho']);
    const place = getPlaceById(placeId);
    const placeName = place ? place.name : '장소';

    if (compare.includes(placeId)) {
      compare = compare.filter(id => id !== placeId);
      Storage.set(STORAGE_KEYS.COMPARE_PLACES, compare);
      showToast(`‘${placeName}’을(를) 비교 목록에서 제외했습니다.`, 'info');
      return false;
    } else {
      if (compare.length >= 3) {
        showToast('장소는 최대 3개까지 비교할 수 있어요.', 'warning');
        return false;
      }
      compare.push(placeId);
      Storage.set(STORAGE_KEYS.COMPARE_PLACES, compare);
      showToast(`‘${placeName}’을(를) 비교 목록에 추가했습니다.`, 'success');
      return true;
    }
  }

  // 7. 공통 카드 DOM 렌더러 (보안: DOM 엘리먼트 생성 방식 사용)
  function createPlaceCard(place, options = {}) {
    const card = document.createElement('article');
    card.className = `place-card place-card--${place.entryStatus}`;
    card.setAttribute('data-id', place.id);

    // 상단 배지 행
    const topRow = document.createElement('div');
    topRow.className = 'place-card__top-row';

    const typeBadge = document.createElement('span');
    typeBadge.className = 'status-badge status-badge--analysis';
    typeBadge.textContent = place.typeName;
    topRow.appendChild(typeBadge);

    const statusBadge = document.createElement('span');
    let badgeClass = 'status-badge--official';
    if (place.entryStatus === 'warning') badgeClass = 'status-badge--warning';
    if (place.entryStatus === 'restricted') badgeClass = 'status-badge--danger';
    statusBadge.className = `status-badge ${badgeClass}`;
    statusBadge.textContent = `${place.operatingStatusLabel} · ${place.entryStatusLabel}`;
    topRow.appendChild(statusBadge);

    card.appendChild(topRow);

    // 제목 및 지역
    const header = document.createElement('div');
    header.className = 'place-card__header';

    const titleLink = document.createElement('a');
    titleLink.href = `field.html?place=${encodeURIComponent(place.id)}`;
    titleLink.className = 'place-card__name-link';

    const title = document.createElement('h3');
    title.className = 'place-card__name';
    title.textContent = place.name;
    titleLink.appendChild(title);
    header.appendChild(titleLink);

    const region = document.createElement('span');
    region.className = 'place-card__region';
    region.textContent = `${place.region} · 중심에서 ${place.distance}km`;
    header.appendChild(region);

    card.appendChild(header);

    // 핵심 지표 그리드
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'place-card__metrics';

    const m1 = document.createElement('div');
    m1.className = 'place-card__metric';
    m1.innerHTML = `<span class="place-card__metric-label">현재 파고</span><strong class="place-card__metric-value">${place.waveHeight}m</strong>`;
    metricsGrid.appendChild(m1);

    const m2 = document.createElement('div');
    m2.className = 'place-card__metric';
    m2.innerHTML = `<span class="place-card__metric-label">수온</span><strong class="place-card__metric-value">${place.waterTemperature}°C</strong>`;
    metricsGrid.appendChild(m2);

    const m3 = document.createElement('div');
    m3.className = 'place-card__metric';
    m3.innerHTML = `<span class="place-card__metric-label">초보 적합</span><strong class="place-card__metric-value">${place.beginnerLevelLabel}</strong>`;
    metricsGrid.appendChild(m3);

    const m4 = document.createElement('div');
    m4.className = 'place-card__metric';
    m4.innerHTML = `<span class="place-card__metric-label">안전요원</span><strong class="place-card__metric-value">${place.safetyPersonnel ? '배치 확인' : '미배치'}</strong>`;
    metricsGrid.appendChild(m4);

    card.appendChild(metricsGrid);

    // 편의시설 태그
    const facRow = document.createElement('div');
    facRow.className = 'place-card__facilities';
    const facList = [];
    if (place.facilities.parking) facList.push('주차');
    if (place.facilities.shower) facList.push('샤워장');
    if (place.facilities.rental) facList.push('장비대여');
    if (place.facilities.restroom) facList.push('화장실');
    if (place.cctvAvailable) facList.push('CCTV');

    facRow.innerHTML = `<span class="place-card__facilities-title">편의:</span> <span class="place-card__facilities-tags">${facList.join(' · ')}</span>`;
    card.appendChild(facRow);

    // 출처 안내 캡션
    const metaRow = document.createElement('div');
    metaRow.className = 'place-card__meta';
    metaRow.innerHTML = `<span>출처: ${place.sourceName}</span><span>${place.updatedAt}</span>`;
    card.appendChild(metaRow);

    // 액션 버튼 행 (저장, 비교 추가, 현장 보기)
    const actionRow = document.createElement('div');
    actionRow.className = 'place-card__actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    const saved = isPlaceSaved(place.id);
    saveBtn.className = `btn-action btn-action--save ${saved ? 'btn-action--active' : ''}`;
    saveBtn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    saveBtn.textContent = saved ? '★ 저장됨' : '☆ 저장';
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowSaved = toggleSavePlace(place.id);
      saveBtn.className = `btn-action btn-action--save ${nowSaved ? 'btn-action--active' : ''}`;
      saveBtn.setAttribute('aria-pressed', nowSaved ? 'true' : 'false');
      saveBtn.textContent = nowSaved ? '★ 저장됨' : '☆ 저장';
      if (options.onSaveChanged) options.onSaveChanged(place.id, nowSaved);
    });
    actionRow.appendChild(saveBtn);

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    const inCompare = isPlaceInCompare(place.id);
    compareBtn.className = `btn-action btn-action--compare ${inCompare ? 'btn-action--active' : ''}`;
    compareBtn.setAttribute('aria-pressed', inCompare ? 'true' : 'false');
    compareBtn.textContent = inCompare ? '✓ 비교 중' : '+ 비교';
    compareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowInCompare = toggleComparePlace(place.id);
      const isActuallyIn = isPlaceInCompare(place.id);
      compareBtn.className = `btn-action btn-action--compare ${isActuallyIn ? 'btn-action--active' : ''}`;
      compareBtn.setAttribute('aria-pressed', isActuallyIn ? 'true' : 'false');
      compareBtn.textContent = isActuallyIn ? '✓ 비교 중' : '+ 비교';
      if (options.onCompareChanged) options.onCompareChanged(place.id, isActuallyIn);
    });
    actionRow.appendChild(compareBtn);

    const fieldLink = document.createElement('a');
    fieldLink.href = `field.html?place=${encodeURIComponent(place.id)}`;
    fieldLink.className = 'btn-action btn-action--field';
    fieldLink.textContent = '현장 상태 ➔';
    actionRow.appendChild(fieldLink);

    card.appendChild(actionRow);

    return card;
  }

  // =========================================================================
  // 8. 페이지별 초기화 및 로직 분기
  // =========================================================================

  // A. [HOME] index.html 로직
  function initHomePage() {
    const searchInput = document.getElementById('home-search-input');
    const searchBtn = document.getElementById('home-search-btn');
    const clearBtn = document.getElementById('home-search-clear');
    const resetFilterBtn = document.getElementById('home-filter-reset');
    const filterBtns = document.querySelectorAll('.filter-chip');
    const cardGrid = document.getElementById('home-places-grid');
    const resultCountEl = document.getElementById('home-result-count');
    const emptyStateEl = document.getElementById('home-empty-state');
    const altSection = document.getElementById('home-alt-section');
    const altGrid = document.getElementById('home-alt-grid');

    if (!cardGrid) return;

    let activeFilters = new Set();
    let currentKeyword = '';

    function applyFilters() {
      const places = getAllPlaces();
      let filtered = places.filter(place => {
        // 검색어 매칭 (장소명, 지역명)
        if (currentKeyword) {
          const kw = currentKeyword.toLowerCase();
          const matchName = place.name.toLowerCase().includes(kw);
          const matchRegion = place.region.toLowerCase().includes(kw);
          if (!matchName && !matchRegion) return false;
        }

        // 빠른 다중 필터
        if (activeFilters.has('beginner') && place.beginnerLevel !== 'easy') return false;
        if (activeFilters.has('available') && place.entryStatus !== 'available') return false;
        if (activeFilters.has('safety') && !place.safetyPersonnel) return false;
        if (activeFilters.has('parking') && !place.facilities.parking) return false;
        if (activeFilters.has('shower') && !place.facilities.shower) return false;
        if (activeFilters.has('rental') && !place.facilities.rental) return false;
        if (activeFilters.has('cctv') && !place.cctvAvailable) return false;

        return true;
      });

      renderResults(filtered);
    }

    function renderResults(list) {
      cardGrid.innerHTML = '';
      if (resultCountEl) {
        resultCountEl.textContent = `검색 결과 ${list.length}곳`;
      }

      if (list.length === 0) {
        emptyStateEl.style.display = 'block';
        cardGrid.style.display = 'none';
      } else {
        emptyStateEl.style.display = 'none';
        cardGrid.style.display = 'grid';
        list.forEach(place => {
          const card = createPlaceCard(place, {
            onSaveChanged: () => {},
            onCompareChanged: () => {}
          });
          cardGrid.appendChild(card);
        });
      }

      // 상태가 좋지 않을 때(주의/통제)의 대안 장소 섹션 (파고 0.5m 이하, 이용 가능)
      if (altGrid) {
        altGrid.innerHTML = '';
        const altPlaces = getAllPlaces().filter(p => p.entryStatus === 'available' && p.waveHeight <= 0.5);
        altPlaces.slice(0, 3).forEach(place => {
          const altCard = createPlaceCard(place);
          altGrid.appendChild(altCard);
        });
      }
    }

    // 검색어 입력 이벤트
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentKeyword = searchInput.value.trim();
        if (clearBtn) clearBtn.style.display = currentKeyword ? 'inline-flex' : 'none';
        applyFilters();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyFilters();
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        if (searchInput) currentKeyword = searchInput.value.trim();
        applyFilters();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          currentKeyword = '';
          clearBtn.style.display = 'none';
          searchInput.focus();
          applyFilters();
        }
      });
    }

    // 필터 칩 토글 이벤트
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filterKey = btn.getAttribute('data-filter');
        if (!filterKey) return;

        if (activeFilters.has(filterKey)) {
          activeFilters.delete(filterKey);
          btn.classList.remove('filter-chip--active');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          activeFilters.add(filterKey);
          btn.classList.add('filter-chip--active');
          btn.setAttribute('aria-pressed', 'true');
        }
        applyFilters();
      });
    });

    // 필터 초기화
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        activeFilters.clear();
        filterBtns.forEach(b => {
          b.classList.remove('filter-chip--active');
          b.setAttribute('aria-pressed', 'false');
        });
        if (searchInput) {
          searchInput.value = '';
          currentKeyword = '';
          if (clearBtn) clearBtn.style.display = 'none';
        }
        applyFilters();
        showToast('검색어와 모든 필터를 초기화했습니다.', 'info');
      });
    }

    // 초기 렌더링
    applyFilters();
  }

  // B. [MAP] map.html 로직
  function initMapPage() {
    const mapContainer = document.getElementById('map-canvas');
    const detailPanel = document.getElementById('map-detail-panel');
    const listGrid = document.getElementById('map-list-grid');
    const searchInput = document.getElementById('map-search-input');
    const typeSelect = document.getElementById('map-filter-type');
    const statusSelect = document.getElementById('map-filter-status');
    const beginnerCheck = document.getElementById('map-filter-beginner');
    const cctvCheck = document.getElementById('map-filter-cctv');

    if (!mapContainer || !listGrid) return;

    let selectedPlaceId = getUrlParam('place') || 'gujora';

    function getFilteredMapPlaces() {
      const places = getAllPlaces();
      const kw = searchInput ? searchInput.value.trim().toLowerCase() : '';
      const type = typeSelect ? typeSelect.value : 'all';
      const status = statusSelect ? statusSelect.value : 'all';
      const beginnerOnly = beginnerCheck ? beginnerCheck.checked : false;
      const cctvOnly = cctvCheck ? cctvCheck.checked : false;

      return places.filter(p => {
        if (kw && !p.name.toLowerCase().includes(kw) && !p.region.toLowerCase().includes(kw)) return false;
        if (type !== 'all' && p.type !== type && p.type !== 'both') return false;
        if (status !== 'all' && p.entryStatus !== status) return false;
        if (beginnerOnly && p.beginnerLevel !== 'easy') return false;
        if (cctvOnly && !p.cctvAvailable) return false;
        return true;
      });
    }

    function renderMapMarkers(places) {
      mapContainer.innerHTML = '';

      // 한국 지도 데모 배경 레이아웃 요소 생성
      const mapBgLabel = document.createElement('div');
      mapBgLabel.className = 'map-demo-bg';
      mapBgLabel.textContent = '대한민국 연안 인터랙티브 지도 (샘플 데모)';
      mapContainer.appendChild(mapBgLabel);

      places.forEach(place => {
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = `map-marker map-marker--${place.entryStatus} ${place.id === selectedPlaceId ? 'map-marker--active' : ''}`;
        marker.style.left = `${place.mapCoord.x}%`;
        marker.style.top = `${place.mapCoord.y}%`;
        marker.setAttribute('aria-label', `${place.name} (${place.entryStatusLabel})`);

        const pin = document.createElement('span');
        pin.className = 'map-marker__pin';
        pin.textContent = place.entryStatus === 'available' ? '●' : (place.entryStatus === 'warning' ? '▲' : '■');
        marker.appendChild(pin);

        const nameLabel = document.createElement('span');
        nameLabel.className = 'map-marker__label';
        nameLabel.textContent = place.name;
        marker.appendChild(nameLabel);

        marker.addEventListener('click', () => {
          selectPlace(place.id);
        });

        mapContainer.appendChild(marker);
      });
    }

    function renderPlaceList(places) {
      listGrid.innerHTML = '';
      if (places.length === 0) {
        listGrid.innerHTML = '<p class="empty-text">조건에 맞는 장소가 없습니다.</p>';
        return;
      }

      places.forEach(place => {
        const item = document.createElement('div');
        item.className = `map-list-item ${place.id === selectedPlaceId ? 'map-list-item--active' : ''}`;
        item.innerHTML = `
          <div class="map-list-item__head">
            <strong class="map-list-item__name">${place.name}</strong>
            <span class="status-badge ${place.entryStatus === 'available' ? 'status-badge--official' : (place.entryStatus === 'warning' ? 'status-badge--warning' : 'status-badge--danger')}">${place.entryStatusLabel}</span>
          </div>
          <p class="map-list-item__sub">${place.region} · 파고 ${place.waveHeight}m · ${place.waterTemperature}°C</p>
        `;
        item.addEventListener('click', () => {
          selectPlace(place.id);
        });
        listGrid.appendChild(item);
      });
    }

    function selectPlace(placeId) {
      selectedPlaceId = placeId;
      recordRecentPlace(placeId);

      // URL 쿼리스트링 업데이트 (새로고침 없이 브라우저 히스토리 지원)
      const url = new URL(window.location);
      url.searchParams.set('place', placeId);
      window.history.replaceState({}, '', url);

      // 마커 활성화 상태 변경
      const markers = mapContainer.querySelectorAll('.map-marker');
      markers.forEach(m => {
        const isTarget = m.getAttribute('aria-label').includes(getPlaceById(placeId)?.name || 'NONE');
        m.classList.toggle('map-marker--active', isTarget);
      });

      // 리스트 활성화 상태 변경
      const listItems = listGrid.querySelectorAll('.map-list-item');
      listItems.forEach(item => {
        const isTarget = item.querySelector('.map-list-item__name')?.textContent === getPlaceById(placeId)?.name;
        item.classList.toggle('map-list-item--active', isTarget);
      });

      renderDetailPanel(getPlaceById(placeId));
    }

    function renderDetailPanel(place) {
      if (!detailPanel) return;
      if (!place) {
        detailPanel.innerHTML = '<div class="panel-empty"><p>선택된 장소가 없습니다. 지도 마커나 목록에서 장소를 선택해 주세요.</p></div>';
        return;
      }

      const isSaved = isPlaceSaved(place.id);
      const isCompare = isPlaceInCompare(place.id);

      detailPanel.innerHTML = `
        <div class="panel-card">
          <div class="panel-card__header">
            <span class="status-badge status-badge--analysis">${place.typeName}</span>
            <span class="status-badge ${place.entryStatus === 'available' ? 'status-badge--official' : (place.entryStatus === 'warning' ? 'status-badge--warning' : 'status-badge--danger')}">${place.operatingStatusLabel} · ${place.entryStatusLabel}</span>
          </div>
          <h2 class="panel-card__title">${place.name}</h2>
          <p class="panel-card__region">${place.region} · 중심거리 ${place.distance}km</p>
          <p class="panel-card__desc">${place.description}</p>

          <div class="panel-card__specs">
            <div class="panel-spec"><span class="panel-spec__label">날씨/물때</span><strong>${place.weather} · ${place.tide}</strong></div>
            <div class="panel-spec"><span class="panel-spec__label">유의 파고</span><strong>${place.waveHeight}m</strong></div>
            <div class="panel-spec"><span class="panel-spec__label">현재 수온</span><strong>${place.waterTemperature}°C</strong></div>
            <div class="panel-spec"><span class="panel-spec__label">조류/난이도</span><strong>${place.current} / ${place.beginnerLevelLabel}</strong></div>
            <div class="panel-spec"><span class="panel-spec__label">안전요원</span><strong>${place.safetyPersonnel ? '상주 배치' : '미배치'}</strong></div>
            <div class="panel-spec"><span class="panel-spec__label">CCTV 상태</span><strong>${place.cctvAvailable ? '영상 확인 가능' : '지원 안 함'}</strong></div>
          </div>

          <div class="panel-card__facilities">
            <span class="panel-card__fac-label">편의시설 지원:</span>
            <span>${place.facilities.parking ? '주차장' : '주차불가'} · ${place.facilities.shower ? '온수샤워' : '샤워없음'} · ${place.facilities.rental ? '장비대여' : '장비개인지참'} · 화장실</span>
          </div>

          <div class="panel-card__notice">
            <span class="panel-card__notice-icon">i</span>
            <p>${place.notice}</p>
          </div>

          <div class="panel-card__meta">
            <span>출처: ${place.sourceName}</span>
            <span>갱신: ${place.updatedAt}</span>
          </div>

          <div class="panel-card__actions">
            <button type="button" id="panel-btn-save" class="btn-action ${isSaved ? 'btn-action--active' : ''}" aria-pressed="${isSaved}">
              ${isSaved ? '★ 저장됨' : '☆ 저장하기'}
            </button>
            <button type="button" id="panel-btn-compare" class="btn-action ${isCompare ? 'btn-action--active' : ''}" aria-pressed="${isCompare}">
              ${isCompare ? '✓ 비교 중' : '+ 비교에 추가'}
            </button>
            <a href="field.html?place=${encodeURIComponent(place.id)}" class="btn-action btn-action--field">
              현장 실시간 상태 ➔
            </a>
          </div>
        </div>
      `;

      // 패널 버튼 리스너
      const saveBtn = document.getElementById('panel-btn-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const nowSaved = toggleSavePlace(place.id);
          saveBtn.classList.toggle('btn-action--active', nowSaved);
          saveBtn.setAttribute('aria-pressed', String(nowSaved));
          saveBtn.textContent = nowSaved ? '★ 저장됨' : '☆ 저장하기';
        });
      }

      const compareBtn = document.getElementById('panel-btn-compare');
      if (compareBtn) {
        compareBtn.addEventListener('click', () => {
          toggleComparePlace(place.id);
          const nowCompare = isPlaceInCompare(place.id);
          compareBtn.classList.toggle('btn-action--active', nowCompare);
          compareBtn.setAttribute('aria-pressed', String(nowCompare));
          compareBtn.textContent = nowCompare ? '✓ 비교 중' : '+ 비교에 추가';
        });
      }
    }

    function refreshMap() {
      const places = getFilteredMapPlaces();
      renderMapMarkers(places);
      renderPlaceList(places);

      // 선택된 장소가 필터링 목록에 있으면 유지, 없으면 첫 번째 선택
      if (!places.find(p => p.id === selectedPlaceId) && places.length > 0) {
        selectPlace(places[0].id);
      } else {
        renderDetailPanel(getPlaceById(selectedPlaceId));
      }
    }

    // 필터 변경 리스너
    if (searchInput) searchInput.addEventListener('input', refreshMap);
    if (typeSelect) typeSelect.addEventListener('change', refreshMap);
    if (statusSelect) statusSelect.addEventListener('change', refreshMap);
    if (beginnerCheck) beginnerCheck.addEventListener('change', refreshMap);
    if (cctvCheck) cctvCheck.addEventListener('change', refreshMap);

    refreshMap();
    if (selectedPlaceId) selectPlace(selectedPlaceId);
  }

  // C. [SAVED & COMPARE] saved.html 로직
  function initSavedPage() {
    const savedGrid = document.getElementById('saved-places-grid');
    const savedEmpty = document.getElementById('saved-empty-state');
    const compareTableWrap = document.getElementById('compare-table-wrapper');
    const compareEmpty = document.getElementById('compare-empty-state');
    const recommendationCard = document.getElementById('compare-recommendation');
    const compareCountBadge = document.getElementById('compare-count-badge');

    if (!savedGrid || !compareTableWrap) return;

    function renderSavedList() {
      const savedIds = Storage.get(STORAGE_KEYS.SAVED_PLACES, ['gujora', 'jangho']);
      const allPlaces = getAllPlaces();
      const savedPlaces = allPlaces.filter(p => savedIds.includes(p.id));

      savedGrid.innerHTML = '';
      if (savedPlaces.length === 0) {
        savedEmpty.style.display = 'block';
        savedGrid.style.display = 'none';
      } else {
        savedEmpty.style.display = 'none';
        savedGrid.style.display = 'grid';
        savedPlaces.forEach(place => {
          const card = createPlaceCard(place, {
            onSaveChanged: () => {
              renderSavedList();
              renderCompareSection();
            },
            onCompareChanged: () => {
              renderCompareSection();
            }
          });
          savedGrid.appendChild(card);
        });
      }
    }

    function renderCompareSection() {
      const compareIds = Storage.get(STORAGE_KEYS.COMPARE_PLACES, ['gujora', 'jangho']);
      const comparePlaces = getAllPlaces().filter(p => compareIds.includes(p.id));

      if (compareCountBadge) {
        compareCountBadge.textContent = `${comparePlaces.length} / 3`;
      }

      if (comparePlaces.length === 0) {
        compareEmpty.style.display = 'block';
        compareTableWrap.style.display = 'none';
        if (recommendationCard) recommendationCard.style.display = 'none';
        return;
      }

      compareEmpty.style.display = 'none';
      compareTableWrap.style.display = 'block';

      // 비교표 렌더링
      const table = document.createElement('table');
      table.className = 'compare-table';

      // 1. 헤더 (장소명 및 삭제 버튼)
      let headHtml = `
        <thead>
          <tr>
            <th scope="col" class="compare-table__th-label">비교 항목</th>
            ${comparePlaces.map(p => `
              <th scope="col" class="compare-table__th-item">
                <div class="compare-th-content">
                  <strong>${p.name}</strong>
                  <span class="compare-th-region">${p.region}</span>
                  <button type="button" class="btn-remove-compare" data-id="${p.id}" aria-label="${p.name} 비교 제거">✕ 제거</button>
                </div>
              </th>
            `).join('')}
          </tr>
        </thead>
      `;

      // 2. 바디 (행별 비교)
      let bodyHtml = `
        <tbody>
          <tr>
            <th scope="row">현재 이용 상태</th>
            ${comparePlaces.map(p => `<td><span class="status-badge ${p.entryStatus === 'available' ? 'status-badge--official' : (p.entryStatus === 'warning' ? 'status-badge--warning' : 'status-badge--danger')}">${p.entryStatusLabel}</span></td>`).join('')}
          </tr>
          <tr>
            <th scope="row">공식 운영 상태</th>
            ${comparePlaces.map(p => `<td>${p.operatingStatusLabel}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">예상 해양 환경</th>
            ${comparePlaces.map(p => `<td>파고 ${p.waveHeight}m · 수온 ${p.waterTemperature}°C (${p.weather})</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">초보자 난이도</th>
            ${comparePlaces.map(p => `<td><strong>${p.beginnerLevelLabel}</strong></td>`).join('')}
          </tr>
          <tr>
            <th scope="row">안전요원</th>
            ${comparePlaces.map(p => `<td>${p.safetyPersonnel ? '✔ 상주 확인' : '✖ 미배치'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">CCTV</th>
            ${comparePlaces.map(p => `<td>${p.cctvAvailable ? '✔ 확인 가능' : '✖ 미지원'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">주차장</th>
            ${comparePlaces.map(p => `<td>${p.facilities.parking ? '✔ 이용 가능' : '✖ 협소/불가'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">화장실</th>
            ${comparePlaces.map(p => `<td>${p.facilities.restroom ? '✔ 완비' : '✖ 없음'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">샤워장</th>
            ${comparePlaces.map(p => `<td>${p.facilities.shower ? '✔ 온수 샤워' : '✖ 없음'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">장비 대여</th>
            ${comparePlaces.map(p => `<td>${p.facilities.rental ? '✔ 현장 대여' : '✖ 개인지참'}</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">이동 거리</th>
            ${comparePlaces.map(p => `<td>${p.distance} km</td>`).join('')}
          </tr>
          <tr>
            <th scope="row">출처 / 시각</th>
            ${comparePlaces.map(p => `<td class="text-subtle">${p.sourceName}<br>${p.updatedAt}</td>`).join('')}
          </tr>
        </tbody>
      `;

      table.innerHTML = headHtml + bodyHtml;
      compareTableWrap.innerHTML = '';
      compareTableWrap.appendChild(table);

      // 비교 제거 버튼 리스너
      table.querySelectorAll('.btn-remove-compare').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          toggleComparePlace(id);
          renderCompareSection();
          renderSavedList();
        });
      });

      // 추천 알고리즘 및 결과 계산
      calculateRecommendation(comparePlaces);
    }

    function calculateRecommendation(places) {
      if (!recommendationCard || places.length === 0) return;

      // 점수 산정: 이용가능(50) + 초보적합(25) + 안전요원(20) + 편의시설(개당 5점) - 거리/10
      let bestPlace = null;
      let highestScore = -999;
      let reasons = [];

      places.forEach(p => {
        let score = 0;
        let pReasons = [];

        if (p.entryStatus === 'available') {
          score += 50;
          pReasons.push('현재 공식 이용 가능 상태');
        } else if (p.entryStatus === 'warning') {
          score += 20;
          pReasons.push('주의 필요 상태');
        } else {
          score -= 100; // 통제는 큰 감점
        }

        if (p.beginnerLevel === 'easy') {
          score += 25;
          pReasons.push('초보 동행자에게 완만한 수심');
        }

        if (p.safetyPersonnel) {
          score += 20;
          pReasons.push('안전요원 상주 확인');
        }

        let facCount = 0;
        if (p.facilities.parking) facCount++;
        if (p.facilities.shower) facCount++;
        if (p.facilities.rental) facCount++;
        if (p.facilities.restroom) facCount++;
        score += facCount * 5;
        if (facCount >= 3) pReasons.push(`다양한 편의시설(${facCount}종 완비)`);

        score -= p.distance * 0.5;

        if (score > highestScore) {
          highestScore = score;
          bestPlace = p;
          reasons = pReasons;
        }
      });

      if (bestPlace) {
        recommendationCard.style.display = 'block';
        recommendationCard.innerHTML = `
          <div class="recommendation-box">
            <span class="recommendation-box__badge">비교 분석 추천 결과</span>
            <h3 class="recommendation-box__title">오늘의 추천 장소: <strong>${bestPlace.name}</strong></h3>
            <p class="recommendation-box__summary">비교 중인 ${places.length}개 후보 중 안전성과 동행자 편의 점수가 가장 우수합니다.</p>
            <ul class="recommendation-box__reasons">
              ${reasons.map(r => `<li>✔ ${r}</li>`).join('')}
            </ul>
            <div class="recommendation-box__disclaimer">
              <span class="recommendation-box__icon">ℹ</span>
              <p>바다앞에의 추천은 현재 확인 가능한 정보를 바탕으로 한 참고 결과입니다. 현장 통제와 공식 안내를 우선해주세요.</p>
            </div>
            <div class="recommendation-box__action">
              <a href="field.html?place=${encodeURIComponent(bestPlace.id)}" class="button button--primary">‘${bestPlace.name}’ 현장 상태 자세히 보기</a>
            </div>
          </div>
        `;
      }
    }

    renderSavedList();
    renderCompareSection();
  }

  // D. [FIELD] field.html 로직
  function initFieldPage() {
    const placeSelect = document.getElementById('field-place-select');
    const refreshBtn = document.getElementById('field-refresh-btn');
    const refreshTimeEl = document.getElementById('field-refresh-time');
    const cctvScreen = document.getElementById('field-cctv-screen');
    const cctvStatusBadge = document.getElementById('field-cctv-status');
    const officialStatusBox = document.getElementById('field-official-box');
    const reportForm = document.getElementById('field-report-form');
    const reportList = document.getElementById('field-report-list');
    const reportTypeSelect = document.getElementById('field-report-type');
    const reportTextInput = document.getElementById('field-report-text');

    if (!placeSelect || !cctvScreen) return;

    // 장소 선택 드롭다운 채우기
    const places = getAllPlaces();
    placeSelect.innerHTML = '';
    places.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.region})`;
      placeSelect.appendChild(opt);
    });

    let currentPlaceId = getUrlParam('place') || 'gujora';
    if (!getPlaceById(currentPlaceId)) currentPlaceId = 'gujora';
    placeSelect.value = currentPlaceId;

    function renderFieldData(placeId) {
      const place = getPlaceById(placeId);
      if (!place) return;

      recordRecentPlace(placeId);

      // URL 갱신
      const url = new URL(window.location);
      url.searchParams.set('place', placeId);
      window.history.replaceState({}, '', url);

      // 마지막 확인 시각 갱신
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      if (refreshTimeEl) {
        refreshTimeEl.textContent = `확인 시각: ${timeStr} (데모 실시간 갱신)`;
      }

      // CCTV 영역 렌더링
      const cctvState = place.cctvStatus || 'live';
      const cctvLabelMap = {
        live: '● LIVE 실시간 영상 수신 중',
        recent: '◐ 최근 캡처 이미지 (10분 전)',
        delayed: '▲ 현장 네트워크 연결 지연',
        unavailable: '■ CCTV 미지원 해역'
      };

      if (cctvStatusBadge) {
        cctvStatusBadge.className = `cctv-badge cctv-badge--${cctvState}`;
        cctvStatusBadge.textContent = cctvLabelMap[cctvState];
      }

      cctvScreen.className = `cctv-screen cctv-screen--${cctvState}`;
      cctvScreen.innerHTML = `
        <div class="cctv-screen__overlay">
          <div class="cctv-screen__top">
            <span>[CAM-01] ${place.name} 전경</span>
            <span class="cctv-screen__time">${now.toISOString().slice(0, 10)} ${timeStr}</span>
          </div>
          <div class="cctv-screen__center">
            <span class="cctv-screen__icon">${cctvState === 'unavailable' ? '✖' : '▶'}</span>
            <p class="cctv-screen__state-msg">${cctvState === 'unavailable' ? '지자체 공공 CCTV 미설치 장소입니다.' : '해안 안전 모니터링 데모 스트림'}</p>
          </div>
          <div class="cctv-screen__bottom">
            <span>파고 ${place.waveHeight}m · 수온 ${place.waterTemperature}°C</span>
            <span>${place.sourceName}</span>
          </div>
        </div>
      `;

      // 공식 상태 박스 렌더링
      if (officialStatusBox) {
        officialStatusBox.innerHTML = `
          <div class="official-grid">
            <div class="official-item">
              <span class="official-item__label">공식 운영 상태</span>
              <strong class="official-item__val">${place.operatingStatusLabel}</strong>
            </div>
            <div class="official-item">
              <span class="official-item__label">입수 통제 여부</span>
              <strong class="official-item__val ${place.entryStatus === 'restricted' ? 'text-danger' : 'text-primary'}">${place.entryStatusLabel}</strong>
            </div>
            <div class="official-item">
              <span class="official-item__label">인명구조 안전요원</span>
              <strong class="official-item__val">${place.safetyPersonnel ? '상주 배치 확인' : '미배치 (개인주의)'}</strong>
            </div>
            <div class="official-item">
              <span class="official-item__label">공식 고시 시각</span>
              <strong class="official-item__val">${place.updatedAt}</strong>
            </div>
          </div>
        `;
      }

      // 현장 제보 렌더링
      renderReports(placeId);
    }

    function renderReports(placeId) {
      if (!reportList) return;
      const initialReports = (window.BADA_DATA && window.BADA_DATA.initialReports) ? window.BADA_DATA.initialReports : [];
      const userReports = Storage.get(STORAGE_KEYS.USER_REPORTS, []);

      // 해당 장소의 제보 필터링
      const combined = [...userReports, ...initialReports].filter(r => r.placeId === placeId);

      reportList.innerHTML = '';
      if (combined.length === 0) {
        reportList.innerHTML = '<p class="empty-text">아직 등록된 현장 제보가 없습니다. 첫 제보를 남겨주세요!</p>';
        return;
      }

      combined.forEach(rep => {
        const item = document.createElement('li');
        item.className = 'report-item';

        const head = document.createElement('div');
        head.className = 'report-item__head';

        const badge = document.createElement('span');
        badge.className = 'status-badge status-badge--analysis';
        badge.textContent = rep.typeName || '현장 제보';
        head.appendChild(badge);

        const time = document.createElement('span');
        time.className = 'report-item__time';
        time.textContent = rep.time;
        head.appendChild(time);

        item.appendChild(head);

        // 보안: 사용자 텍스트는 textContent로 안전하게 렌더링
        const p = document.createElement('p');
        p.className = 'report-item__content';
        p.textContent = rep.content;
        item.appendChild(p);

        const author = document.createElement('span');
        author.className = 'report-item__author';
        author.textContent = `작성자: ${rep.author || '방문자'}`;
        item.appendChild(author);

        reportList.appendChild(item);
      });
    }

    // 장소 선택 변경 리스너
    placeSelect.addEventListener('change', () => {
      currentPlaceId = placeSelect.value;
      renderFieldData(currentPlaceId);
    });

    // 새로고침 버튼 리스너
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        renderFieldData(currentPlaceId);
        showToast('최신 관측 및 공식 현장 상태를 새로고침했습니다.', 'info');
      });
    }

    // 제보 등록 폼 리스너 (XSS 방지: textContent 안전 처리)
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = reportTextInput ? reportTextInput.value.trim() : '';
        if (!text) {
          showToast('제보 내용을 입력해주세요.', 'warning');
          return;
        }

        const type = reportTypeSelect ? reportTypeSelect.value : '일반';
        const typeLabelMap = {
          wave: '파도 체감',
          parking: '주차 혼잡',
          facility: '편의시설',
          water: '수온/시야',
          safety: '안전 상황'
        };

        const newReport = {
          id: 'user-' + Date.now(),
          placeId: currentPlaceId,
          type: type,
          typeName: typeLabelMap[type] || '현장 제보',
          content: text,
          author: '나 (방문자)',
          time: '방문자 제보 · 방금 전'
        };

        const userReports = Storage.get(STORAGE_KEYS.USER_REPORTS, []);
        userReports.unshift(newReport);
        Storage.set(STORAGE_KEYS.USER_REPORTS, userReports);

        reportTextInput.value = '';
        renderReports(currentPlaceId);
        showToast('현장 제보가 등록되었습니다. 다른 방문자에게 큰 도움이 됩니다!', 'success');
      });
    }

    renderFieldData(currentPlaceId);
  }

  // E. [MY] my.html 로직
  function initMyPage() {
    const savedCountEl = document.getElementById('my-saved-count');
    const compareCountEl = document.getElementById('my-compare-count');
    const recentListEl = document.getElementById('my-recent-list');
    const prefForm = document.getElementById('my-preferences-form');
    const notiForm = document.getElementById('my-notifications-form');
    const clearAllBtn = document.getElementById('my-clear-all-btn');

    if (!prefForm) return;

    // 카운트 및 최근 기록 갱신
    function updateMyStats() {
      const saved = Storage.get(STORAGE_KEYS.SAVED_PLACES, ['gujora', 'jangho']);
      const compare = Storage.get(STORAGE_KEYS.COMPARE_PLACES, ['gujora', 'jangho']);
      const recents = Storage.get(STORAGE_KEYS.RECENT_PLACES, ['gujora']);

      if (savedCountEl) savedCountEl.textContent = `${saved.length}개`;
      if (compareCountEl) compareCountEl.textContent = `${compare.length}개`;

      if (recentListEl) {
        recentListEl.innerHTML = '';
        if (recents.length === 0) {
          recentListEl.innerHTML = '<li class="text-subtle">최근 확인한 장소가 없습니다.</li>';
        } else {
          recents.forEach(id => {
            const place = getPlaceById(id);
            if (!place) return;
            const li = document.createElement('li');
            li.className = 'recent-item';
            li.innerHTML = `
              <a href="field.html?place=${encodeURIComponent(place.id)}" class="recent-item__link">
                <strong>${place.name}</strong>
                <span>${place.region} · ${place.entryStatusLabel}</span>
              </a>
            `;
            recentListEl.appendChild(li);
          });
        }
      }
    }

    // 선호 조건 로드 및 저장
    const defaultPrefs = window.BADA_DATA.defaultPreferences;
    const currentPrefs = Storage.get(STORAGE_KEYS.PREFERENCES, defaultPrefs);

    Object.keys(defaultPrefs).forEach(key => {
      const input = prefForm.querySelector(`[name="${key}"]`);
      if (input) input.checked = Boolean(currentPrefs[key]);
    });

    prefForm.addEventListener('change', () => {
      const updated = {};
      Object.keys(defaultPrefs).forEach(key => {
        const input = prefForm.querySelector(`[name="${key}"]`);
        if (input) updated[key] = input.checked;
      });
      Storage.set(STORAGE_KEYS.PREFERENCES, updated);
      showToast('선호 조건이 저장되었습니다.', 'success');
    });

    // 알림 설정 로드 및 저장
    const defaultNotis = window.BADA_DATA.defaultNotifications;
    const currentNotis = Storage.get(STORAGE_KEYS.NOTIFICATIONS, defaultNotis);

    if (notiForm) {
      Object.keys(defaultNotis).forEach(key => {
        const input = notiForm.querySelector(`[name="${key}"]`);
        if (input) input.checked = Boolean(currentNotis[key]);
      });

      notiForm.addEventListener('change', () => {
        const updatedNotis = {};
        Object.keys(defaultNotis).forEach(key => {
          const input = notiForm.querySelector(`[name="${key}"]`);
          if (input) updatedNotis[key] = input.checked;
        });
        Storage.set(STORAGE_KEYS.NOTIFICATIONS, updatedNotis);
        showToast('알림 수신 설정이 업데이트되었습니다.', 'success');
      });
    }

    // 전체 데이터 초기화 버튼 (confirm 대화상자 사용)
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        const confirmed = window.confirm('저장한 장소, 비교 목록, 선호 조건, 현장 제보 기록을 모두 초기화할까요?');
        if (confirmed) {
          Storage.clearAll();
          updateMyStats();

          // 체크박스 기본값 재설정
          Object.keys(defaultPrefs).forEach(key => {
            const input = prefForm.querySelector(`[name="${key}"]`);
            if (input) input.checked = Boolean(defaultPrefs[key]);
          });
          if (notiForm) {
            Object.keys(defaultNotis).forEach(key => {
              const input = notiForm.querySelector(`[name="${key}"]`);
              if (input) input.checked = Boolean(defaultNotis[key]);
            });
          }

          showToast('모든 저장 데이터가 초기화되었습니다.', 'info');
        }
      });
    }

    updateMyStats();
  }

  // 9. DOM 준비 시 페이지 라우팅 실행
  document.addEventListener('DOMContentLoaded', () => {
    initHomePage();
    initMapPage();
    initSavedPage();
    initFieldPage();
    initMyPage();
  });
})();
