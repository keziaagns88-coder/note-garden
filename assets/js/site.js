/* =========================================================
   site.js：所有頁面共用的功能
   - 讀取 data/site.json、data/categories.json、data/notes.json
   - 產生頁首、頁尾
   - 建立元素、網址、分類標記等小工具
   每個頁面都要先載入這個檔案，再載入自己的 JS。
   ========================================================= */
(function () {
  'use strict';

  // 導覽列。新增頁面時在這裡加一筆（AGENTS.md 第 11 節）
  const NAV = [
    { href: 'index.html', label: '所有筆記' },
    { href: 'index.html#about', label: '關於這座花園' },
  ];

  const cache = new Map();

  function fetchOnce(path, type) {
    if (!cache.has(path)) {
      cache.set(path, fetch(path, { cache: 'no-cache' }).then((res) => {
        if (!res.ok) throw new Error(`${path} 回應 ${res.status}`);
        return type === 'json' ? res.json() : res.text();
      }));
    }
    return cache.get(path);
  }

  const getJSON = (path) => fetchOnce(path, 'json');
  const getText = (path) => fetchOnce(path, 'text');

  /** 讀取整座花園的資料，回傳查詢用的 Map。 */
  async function loadGarden() {
    const [site, categories, index] = await Promise.all([
      getJSON('data/site.json'),
      getJSON('data/categories.json'),
      getJSON('data/notes.json'),
    ]);
    return {
      site,
      categories,
      notes: index.notes,
      tags: index.tags,
      catById: new Map(categories.map((c) => [c.id, c])),
      statusById: new Map(site.statuses.map((s) => [s.id, s])),
      noteById: new Map(index.notes.map((n) => [n.id, n])),
    };
  }

  /** 建立元素：h('a', { href: '#', class: 'x' }, '文字', 子元素) */
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'style') Object.assign(node.style, value);
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[ch]);
  }

  const noteURL = (id) => 'note.html?id=' + encodeURIComponent(id);

  function homeURL(params) {
    const query = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v)).toString();
    return 'index.html' + (query ? '?' + query : '');
  }

  /** 分類標記：分類色小方塊 + 分類名稱。傳入 href 時會變成連結。 */
  function catMark(cat, href) {
    const node = h(href ? 'a' : 'span', { class: 'cat-mark', href: href || null }, cat ? cat.name : '未分類');
    node.style.setProperty('--cat', cat ? cat.color : 'var(--ink)');
    return node;
  }

  const statusText = (status) => (status ? `${status.icon} ${status.name}` : '');

  const hasRepo = (site) => Boolean(site && site.repo && !site.repo.includes('YOUR-USERNAME'));

  function renderChrome(site) {
    const title = (site && site.title) || 'Kezia 的筆記花園';
    const here = location.pathname.split('/').pop() || 'index.html';

    const header = document.getElementById('site-header');
    if (header) {
      const links = NAV.map((item) => {
        const current = !item.href.includes('#') && item.href === here;
        return h('li', {}, h('a', { href: item.href, 'aria-current': current ? 'page' : null }, item.label));
      });
      if (hasRepo(site)) links.push(h('li', {}, h('a', { href: site.repo }, 'GitHub')));
      header.replaceChildren(h('div', { class: 'site-header-inner' },
        h('a', { class: 'brand', href: 'index.html' }, title),
        h('nav', { class: 'site-nav', 'aria-label': '主要導覽' }, h('ul', {}, links)),
      ));
    }

    const footer = document.getElementById('site-footer');
    if (footer) {
      footer.replaceChildren(h('div', { class: 'site-footer-inner' },
        h('p', {}, `由 ${(site && site.author) || 'Kezia'} 照料。每篇筆記都依照專案裡的 AGENTS.md 規則新增。`),
        hasRepo(site) ? h('p', {}, h('a', { href: site.repo }, '在 GitHub 上查看原始碼')) : null,
      ));
    }
  }

  function showLoadError(container, error) {
    const local = location.protocol === 'file:';
    container.replaceChildren(h('div', { class: 'notice', role: 'alert' },
      h('p', {}, h('strong', {}, '筆記資料讀取失敗。')),
      h('p', {}, local
        ? '你是直接打開 HTML 檔案的，瀏覽器不允許這樣讀取資料。請在專案資料夾執行 python3 -m http.server 8000，再打開 http://localhost:8000。'
        : '請重新整理頁面。如果還是失敗，請確認 data/notes.json 存在，並重新執行 python3 scripts/build_notes.py。'),
      h('p', { class: 'notice-detail' }, String((error && error.message) || error)),
    ));
  }

  window.Garden = {
    loadGarden, getText, h, escapeHTML, noteURL, homeURL, catMark, statusText, hasRepo, renderChrome, showLoadError,
  };
})();
