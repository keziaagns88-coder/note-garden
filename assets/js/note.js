/* =========================================================
   note.js：單篇筆記頁（note.html?id=<筆記ID>）
   1. 從 data/notes.json 找到筆記資料
   2. 讀取 notes/<筆記ID>.md，去掉 front matter
   3. 把 [[筆記ID]]、[[筆記ID|文字]] 換成連結（程式碼裡的不換）
   4. 用 marked 轉成 HTML，畫出標本標籤與側欄
   ========================================================= */
(async function () {
  'use strict';
  const { h } = Garden;
  const $ = (id) => document.getElementById(id);
  const id = (new URLSearchParams(location.search).get('id') || '').trim();
  const body = $('note-body');

  let g;
  try {
    g = await Garden.loadGarden();
  } catch (error) {
    Garden.renderChrome(null);
    Garden.showLoadError(body, error);
    return;
  }
  Garden.renderChrome(g.site);

  const note = g.noteById.get(id);
  if (!note) {
    renderNotFound();
    return;
  }

  let markdown;
  try {
    markdown = await Garden.getText(`notes/${id}.md`);
  } catch (error) {
    Garden.showLoadError(body, error);
    return;
  }

  const cat = g.catById.get(note.category);
  document.title = `${note.title}｜${g.site.title}`;
  renderBreadcrumb(cat);
  renderLabel(cat);
  body.innerHTML = marked.parse(linkify(stripFrontMatter(markdown)), { gfm: true });
  enhance(body);
  renderAside();

  // ---------- Markdown 前處理 ----------
  function stripFrontMatter(text) {
    const src = text.replace(/\r\n/g, '\n').replace(/^﻿/, '');
    if (!src.startsWith('---\n')) return src;
    const end = src.indexOf('\n---', 4);
    if (end === -1) return src;
    const after = src.indexOf('\n', end + 4);
    return after === -1 ? '' : src.slice(after + 1);
  }

  function linkify(text) {
    const WIKILINK = /\[\[([^[\]|]+?)(?:\|([^[\]]+))?\]\]/g;
    let inFence = false;
    let fence = '';
    return text.split('\n').map((line) => {
      const m = line.match(/^\s*(```|~~~)/);
      if (m) {
        if (!inFence) { inFence = true; fence = m[1]; } else if (line.trim().startsWith(fence)) { inFence = false; }
        return line;
      }
      if (inFence) return line;
      // 奇數位置是行內程式碼，保持原樣
      return line.split(/(`[^`]*`)/).map((part, i) => (i % 2 ? part : part.replace(WIKILINK, (_, rawId, label) => {
        const targetId = rawId.trim();
        const target = g.noteById.get(targetId);
        const text = Garden.escapeHTML((label || '').trim() || (target ? target.title : targetId));
        return target
          ? `<a class="wikilink" href="${Garden.noteURL(targetId)}">${text}</a>`
          : `<span class="wikilink is-broken" title="找不到筆記：${Garden.escapeHTML(targetId)}">${text}</span>`;
      }))).join('');
    }).join('\n');
  }

  function enhance(root) {
    root.querySelectorAll('h2, h3').forEach((heading, i) => { heading.id = `section-${i + 1}`; });
    root.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
    root.querySelectorAll('pre').forEach((pre) => { pre.tabIndex = 0; }); // 讓鍵盤可以捲動長程式碼
    root.querySelectorAll('table').forEach((table) => {
      const wrap = h('div', { class: 'table-wrap' });
      table.replaceWith(wrap);
      wrap.append(table);
    });
  }

  // ---------- 畫面 ----------
  function field(name, ...value) {
    return h('div', {}, h('dt', {}, name), h('dd', {}, ...value));
  }

  function renderBreadcrumb(category) {
    $('breadcrumb').replaceChildren(h('ol', {},
      h('li', {}, h('a', { href: 'index.html' }, '所有筆記')),
      category ? h('li', {}, h('a', { href: Garden.homeURL({ c: category.id }) }, category.name)) : null,
      h('li', { 'aria-current': 'page' }, note.title),
    ));
  }

  function renderLabel(category) {
    const label = $('note-label');
    label.replaceChildren(
      h('div', { class: 'label-top' },
        Garden.catMark(category, Garden.homeURL({ c: note.category })),
        h('span', { class: 'label-id' }, '編號 ', h('code', {}, note.id))),
      h('h1', { class: 'note-title' }, note.title),
      h('p', { class: 'note-summary' }, note.summary),
      h('dl', { class: 'fields fields-row' },
        field('狀態', Garden.statusText(g.statusById.get(note.status))),
        field('建立', h('time', { datetime: note.created }, note.created)),
        field('更新', h('time', { datetime: note.updated }, note.updated)),
        field('閱讀', `約 ${note.minutes} 分鐘`)),
      h('ul', { class: 'tag-list', 'aria-label': '標籤' },
        note.tags.map((t) => h('li', {}, h('a', { class: 'tag', href: Garden.homeURL({ t }) }, `#${t}`)))),
    );
    label.hidden = false;
  }

  function noteList(ids, emptyText) {
    const items = ids.map((nid) => g.noteById.get(nid)).filter(Boolean);
    if (!items.length) return h('p', { class: 'aside-empty' }, emptyText);
    return h('ul', { class: 'aside-list' }, items.map((n) => h('li', {},
      Garden.catMark(g.catById.get(n.category)),
      h('a', { class: 'aside-title', href: Garden.noteURL(n.id) }, n.title))));
  }

  function renderAside() {
    // 已經列在「提到這篇的筆記」的，不再重複列出
    const sameCategory = g.notes
      .filter((n) => n.category === note.category && n.id !== note.id && !note.backlinks.includes(n.id))
      .slice(0, 5).map((n) => n.id);
    const othersInCategory = g.notes.some((n) => n.category === note.category && n.id !== note.id);
    $('note-aside').replaceChildren(
      h('section', { class: 'aside-block' },
        h('h2', {}, '提到這篇的筆記'),
        noteList(note.backlinks, '還沒有其他筆記連到這篇。')),
      h('section', { class: 'aside-block' },
        h('h2', {}, `其他「${cat ? cat.name : ''}」筆記`),
        noteList(sameCategory, othersInCategory ? '同分類的其他筆記都已經列在上面。' : '這個分類目前只有這一篇。')),
    );
  }

  function renderNotFound() {
    document.title = `找不到這篇筆記｜${g.site.title}`;
    $('breadcrumb').replaceChildren(h('ol', {}, h('li', {}, h('a', { href: 'index.html' }, '所有筆記'))));
    body.replaceChildren(
      h('h1', { class: 'note-title' }, '找不到這篇筆記'),
      h('p', {}, id
        ? `網址裡的筆記編號「${id}」不存在。它可能被改名了，或網址打錯了。`
        : '網址裡沒有筆記編號。正確的格式是 note.html?id=筆記編號。'),
      h('p', {}, h('a', { href: 'index.html' }, '回到所有筆記')),
    );
  }
})();
