/* =========================================================
   home.js：首頁
   - 花園概況標籤
   - 搜尋、分類、成長狀態、標籤篩選（會同步到網址，例如 index.html?c=python&t=語法）
   - 筆記卡片清單
   ========================================================= */
(async function () {
  'use strict';
  const { h } = Garden;
  const $ = (id) => document.getElementById(id);

  let g;
  try {
    g = await Garden.loadGarden();
  } catch (error) {
    Garden.renderChrome(null);
    Garden.showLoadError($('note-grid').parentElement, error);
    return;
  }

  Garden.renderChrome(g.site);
  document.title = g.site.title;
  $('site-title').textContent = g.site.title;
  $('site-description').textContent = g.site.description;

  // ---------- 花園概況（右下角的標本標籤） ----------
  const latest = g.notes.reduce((max, n) => (n.updated > max ? n.updated : max), '');
  const countBy = (key, value) => g.notes.filter((n) => n[key] === value).length;
  const field = (name, ...value) => h('div', {}, h('dt', {}, name), h('dd', {}, ...value));

  $('garden-census').replaceChildren(
    h('p', { class: 'label-head' }, '花園概況'),
    h('dl', { class: 'fields' },
      field('收藏', `${g.notes.length} 篇筆記`),
      field('分類', `${g.categories.length} 個`),
      field('成長', g.site.statuses.map((s) => `${s.icon} ${countBy('status', s.id)}`).join(' ')),
      field('最近更新', latest ? h('time', { datetime: latest }, latest) : '尚無筆記'),
      field('照料者', g.site.author),
    ),
  );

  // ---------- 成長狀態說明（關於區塊） ----------
  $('status-list').replaceChildren(...g.site.statuses.map((s) =>
    h('div', {}, h('dt', {}, Garden.statusText(s)), h('dd', {}, s.description))));

  // ---------- 篩選狀態 ----------
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    c: g.catById.has(params.get('c')) ? params.get('c') : '',
    s: g.statusById.has(params.get('s')) ? params.get('s') : '',
    t: params.get('t') || '',
  };
  $('q').value = state.q;

  function chip(group, value, checked, ...content) {
    const input = h('input', { type: 'radio', name: group, value, checked: checked || null });
    return h('label', { class: 'chip' + (checked ? ' is-checked' : '') }, input, ...content);
  }

  function renderChips() {
    $('cat-filter').replaceChildren(
      chip('c', '', !state.c, '全部', h('span', { class: 'count' }, g.notes.length)),
      ...g.categories.map((c) => {
        const swatch = h('span', { class: 'swatch', 'aria-hidden': 'true' });
        swatch.style.setProperty('--cat', c.color);
        return chip('c', c.id, state.c === c.id, swatch, c.name, h('span', { class: 'count' }, countBy('category', c.id)));
      }),
    );
    $('status-filter').replaceChildren(
      chip('s', '', !state.s, '全部'),
      ...g.site.statuses.map((s) => chip('s', s.id, state.s === s.id, Garden.statusText(s), h('span', { class: 'count' }, countBy('status', s.id)))),
    );
    $('tag-row').hidden = !state.t;
    $('tag-filter').replaceChildren(state.t
      ? h('button', { type: 'button', class: 'chip is-checked', onclick: () => update({ t: '' }) }, `#${state.t}`, h('span', { class: 'visually-hidden' }, '，'), '移除')
      : '');
  }

  // ---------- 篩選邏輯 ----------
  function matches(note) {
    if (state.c && note.category !== state.c) return false;
    if (state.s && note.status !== state.s) return false;
    if (state.t && !note.tags.includes(state.t)) return false;
    const terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return true;
    const cat = g.catById.get(note.category);
    const haystack = [note.title, note.summary, note.id, cat ? cat.name : '', ...note.tags].join(' ').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  }

  function card(note) {
    const cat = g.catById.get(note.category);
    return h('li', { class: 'note-card specimen-label' },
      Garden.catMark(cat),
      h('h3', { class: 'note-card-title' }, h('a', { href: Garden.noteURL(note.id) }, note.title)),
      h('p', { class: 'note-card-summary' }, note.summary),
      h('dl', { class: 'fields' },
        field('狀態', Garden.statusText(g.statusById.get(note.status))),
        field('更新', h('time', { datetime: note.updated }, note.updated)),
      ),
      h('ul', { class: 'tag-list', 'aria-label': '標籤' },
        note.tags.map((t) => h('li', {}, h('a', { class: 'tag', href: Garden.homeURL({ t }), 'data-tag': t }, `#${t}`)))),
    );
  }

  function render() {
    const shown = g.notes.filter(matches);
    $('note-grid').replaceChildren(...shown.map(card));
    $('empty').hidden = shown.length > 0;
    $('result-count').textContent = shown.length === g.notes.length
      ? `共 ${g.notes.length} 篇筆記，依更新日期排列`
      : `顯示 ${shown.length} 篇筆記（共 ${g.notes.length} 篇）`;
    renderChips();
    history.replaceState(null, '', Garden.homeURL(state) + location.hash);
  }

  function update(patch) {
    Object.assign(state, patch);
    render();
  }

  // ---------- 事件 ----------
  $('q').addEventListener('input', (e) => update({ q: e.target.value }));
  $('filters').addEventListener('submit', (e) => e.preventDefault());
  $('filters').addEventListener('change', (e) => {
    if (e.target.name === 'c' || e.target.name === 's') {
      update({ [e.target.name]: e.target.value });
      document.querySelector(`input[name="${e.target.name}"][value="${e.target.value}"]`)?.focus();
    }
  });
  $('note-grid').addEventListener('click', (e) => {
    const link = e.target.closest('a[data-tag]');
    if (!link) return;
    e.preventDefault();
    update({ t: link.dataset.tag });
    $('browse-heading').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  $('clear-filters').addEventListener('click', () => {
    $('q').value = '';
    update({ q: '', c: '', s: '', t: '' });
  });

  render();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
})();
