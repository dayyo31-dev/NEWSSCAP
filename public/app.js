(() => {
  let currentQuery = '';
  let currentPage = 1;
  const LIMIT = 20;

  const searchInput  = document.getElementById('searchInput');
  const searchBtn    = document.getElementById('searchBtn');
  const articlesEl   = document.getElementById('articles');
  const paginationEl = document.getElementById('pagination');
  const resultInfo   = document.getElementById('resultInfo');
  const resultCount  = document.getElementById('resultCount');
  const crawlBtn     = document.getElementById('crawlBtn');
  const chipsEl      = document.getElementById('chips');
  const toastEl      = document.getElementById('toast');

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg, duration = 3000) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), duration);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  }

  function highlight(text, query) {
    if (!query || !text) return escHtml(text || '');
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escHtml(text).replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark>$1</mark>'
    );
  }

  function renderArticles(articles, query) {
    if (!articles.length) {
      articlesEl.innerHTML = `
        <div class="state-msg">
          <div class="icon">📭</div>
          <p>검색 결과가 없습니다.<br>다른 키워드로 검색하거나 최신 뉴스를 수집해보세요.</p>
        </div>`;
      return;
    }

    articlesEl.innerHTML = articles.map(a => {
      const title   = highlight(a.title || '', query);
      const content = highlight(a.content || '', query);
      const date    = formatDate(a.published_at);

      return `
        <div class="article-card">
          <div class="article-meta">
            ${a.source   ? `<span class="article-source">${escHtml(a.source)}</span>` : ''}
            ${a.keyword  ? `<span class="article-keyword"># ${escHtml(a.keyword)}</span>` : ''}
            ${date       ? `<span class="article-date">${date}</span>` : ''}
          </div>
          <div class="article-title">
            <a href="${escHtml(a.url)}" target="_blank" rel="noopener noreferrer">${title}</a>
          </div>
          ${content ? `<div class="article-content">${content}</div>` : ''}
        </div>`;
    }).join('');
  }

  function renderPagination(page, totalPages) {
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    const range = [];
    const delta = 2;
    const left  = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);

    if (left > 1)  { range.push(1); if (left > 2) range.push('…'); }
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages) { if (right < totalPages - 1) range.push('…'); range.push(totalPages); }

    paginationEl.innerHTML = `
      <button class="page-btn" id="prevBtn" ${page <= 1 ? 'disabled' : ''}>‹</button>
      ${range.map(r =>
        r === '…'
          ? `<span style="padding:0 4px;color:var(--text-muted)">…</span>`
          : `<button class="page-btn ${r === page ? 'active' : ''}" data-page="${r}">${r}</button>`
      ).join('')}
      <button class="page-btn" id="nextBtn" ${page >= totalPages ? 'disabled' : ''}>›</button>`;

    paginationEl.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => goToPage(parseInt(btn.dataset.page)));
    });
    document.getElementById('prevBtn')?.addEventListener('click', () => goToPage(page - 1));
    document.getElementById('nextBtn')?.addEventListener('click', () => goToPage(page + 1));
  }

  function goToPage(p) {
    currentPage = p;
    fetchArticles(currentQuery, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function fetchArticles(q, page = 1) {
    articlesEl.innerHTML = `<div class="state-msg"><div class="icon">⏳</div><p>검색 중...</p></div>`;
    paginationEl.innerHTML = '';

    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (q) params.set('q', q);

      const res  = await fetch(`/api/articles?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      resultInfo.style.display = 'flex';
      resultCount.innerHTML = q
        ? `<strong>"${escHtml(q)}"</strong> 검색 결과 <strong>${data.total.toLocaleString()}</strong>건`
        : `전체 뉴스 <strong>${data.total.toLocaleString()}</strong>건`;

      renderArticles(data.articles || [], q);
      renderPagination(data.page, data.totalPages);
    } catch (err) {
      articlesEl.innerHTML = `<div class="state-msg"><div class="icon">⚠️</div><p>데이터를 불러오지 못했습니다.</p></div>`;
      console.error(err);
    }
  }

  function pushState(q, page) {
    const url = new URL(window.location);
    q    ? url.searchParams.set('q', q)       : url.searchParams.delete('q');
    page > 1 ? url.searchParams.set('page', page) : url.searchParams.delete('page');
    history.pushState({}, '', url);
  }

  function updateChips(q) {
    chipsEl.querySelectorAll('.chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.kw === q);
    });
  }

  function doSearch() {
    const q = searchInput.value.trim();
    currentQuery = q;
    currentPage  = 1;
    updateChips(q);
    pushState(q, 1);
    fetchArticles(q, 1);
  }

  // Search button & Enter key
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  // Keyword chips
  chipsEl.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const kw = chip.dataset.kw;
    searchInput.value = kw;
    currentQuery = kw;
    currentPage  = 1;
    updateChips(kw);
    pushState(kw, 1);
    fetchArticles(kw, 1);
  });

  // Manual crawl
  crawlBtn.addEventListener('click', async () => {
    crawlBtn.disabled = true;
    crawlBtn.textContent = '수집 중...';
    try {
      const res  = await fetch('/api/crawl', { method: 'POST' });
      const data = await res.json();
      showToast(`✅ ${data.count}건의 새 기사를 수집했습니다.`);
      fetchArticles(currentQuery, currentPage);
    } catch {
      showToast('❌ 뉴스 수집에 실패했습니다.');
    } finally {
      crawlBtn.disabled = false;
      crawlBtn.textContent = '최신 뉴스 수집';
    }
  });

  // Init: restore state from URL
  const params = new URLSearchParams(window.location.search);
  const initQ  = params.get('q') || '';
  const initP  = parseInt(params.get('page') || '1');
  if (initQ) searchInput.value = initQ;
  currentQuery = initQ;
  currentPage  = initP;
  updateChips(initQ);
  fetchArticles(initQ, initP);
})();
