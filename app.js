const CATS = [
  { id: 'mechanics', label: '力学', en: 'MECHANICS' },
  { id: 'electro', label: '电磁学', en: 'ELECTROMAGNETISM' },
  { id: 'optics', label: '光学', en: 'OPTICS' },
];

const $ = (s) => document.querySelector(s);
let sites = [];
let lastFocus = null;
let refreshing = false;
const hadController = !!navigator.serviceWorker?.controller;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function setStatus(text, cls = '') {
  const node = $('#status');
  if (!node) return;
  node.textContent = text;
  node.className = 'status ' + cls;
}

function render() {
  const root = $('#grid');
  root.replaceChildren();
  let n = 0;
  let sectionNo = 0;

  for (const cat of CATS) {
    const items = sites.filter((site) => site.cat === cat.id);
    if (!items.length) continue;
    sectionNo += 1;

    const section = el('section', 'cat');
    const head = el('div', 'cat-head');
    head.append(
      el('span', 'num', String(sectionNo).padStart(2, '0')),
      el('h2', '', cat.label),
      el('span', 'en', cat.en),
      el('span', 'rule'),
    );
    const grid = el('div', 'grid');

    for (const site of items) {
      n += 1;
      const card = el('button', 'card');
      card.type = 'button';
      card.append(
        el('span', 'idx', String(n).padStart(2, '0')),
        el('h3', '', site.title),
        el('p', '', site.sub),
        el('span', 'tag', cat.label),
      );
      card.addEventListener('click', () => openViewer(site, card));
      grid.appendChild(card);
    }

    section.append(head, grid);
    root.appendChild(section);
  }

  if (!n) {
    root.appendChild(el('p', 'empty', '没有找到可用的动画。请联网刷新后再试。'));
  }
}

function openViewer(site, trigger) {
  lastFocus = trigger || null;
  $('#viewer-title').textContent = site.title;
  $('#stage').src = site.path;
  $('#viewer').hidden = false;
  document.body.classList.add('viewing');
  $('#back').focus({ preventScroll: true });
}

function closeViewer() {
  const stage = $('#stage');
  if (stage) stage.src = 'about:blank';
  $('#viewer').hidden = true;
  document.body.classList.remove('viewing');
  if (lastFocus) lastFocus.focus({ preventScroll: true });
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    setStatus('此浏览器不支持离线缓存', 'warn');
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    setStatus('离线已就绪 · 可断网使用', 'ready');
    const hint = $('#install-hint');
    if (hint) {
      hint.textContent = '已缓存全部动画。可以从 Safari 分享菜单「添加到主屏幕」，以后点图标直接上课。';
    }
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setStatus('有更新，正在切换…');
        }
      });
    });
  } catch (error) {
    setStatus('离线缓存未完成，请联网刷新', 'warn');
  }
}

async function boot() {
  try {
    const response = await fetch('./sites.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('sites.json ' + response.status);
    sites = await response.json();
  } catch (error) {
    sites = [];
  }
  render();
  registerSW();
}

$('#back').addEventListener('click', closeViewer);
$('#refresh').addEventListener('click', async () => {
  setStatus('正在检查更新…');
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.update();
  } catch (error) {}
  location.reload();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('#viewer').hidden) closeViewer();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    location.reload();
  });
}

if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
  const hint = $('#install-hint');
  if (hint) hint.remove();
}

boot();
