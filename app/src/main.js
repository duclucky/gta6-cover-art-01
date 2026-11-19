// Vice Cover Studio wiring: photos, panels, layout, grade, caption and PNG
// export. Photos are read on this machine only, never uploaded anywhere.
import { drawCoverArt, renderCover, slotCount } from './cover.js';
import { runShot } from './shots.js';

const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };
const canvas = document.getElementById('preview');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const zoomEl = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomVal');
const sizeEl = document.getElementById('size');
const slotsEl = document.getElementById('slots');

const state = {
  layout: 'cover',
  grade: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'Palma Bay · Neon Coast',
  selected: 0,
  panels: [blankPanel(), blankPanel(), blankPanel(), blankPanel()],
};

function blankPanel() { return { img: null, zoom: 100, ox: 0, oy: 0, fit: false }; }
function selectedPanel() { return state.panels[state.selected]; }
function setStatus(text) { statusEl.textContent = text; }

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

function applySize() {
  const [w, h] = SIZES[sizeEl.value] || SIZES['1920x1080'];
  canvas.width = w; canvas.height = h;
}

function redraw() {
  applySize();
  drawCoverArt(canvas, { ...state, showSelection: true });
  refreshSlots();
  zoomEl.value = selectedPanel().zoom;
  zoomVal.textContent = `${selectedPanel().zoom}%`;
  document.getElementById('fitFill').textContent = selectedPanel().fit ? 'Fit' : 'Fill';
}

function refreshSlots() {
  const n = slotCount(state.layout);
  slotsEl.innerHTML = '';
  for (let i = 0; i < n; i += 1) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot' + (state.selected === i ? ' on' : '') + (state.panels[i].img ? ' full' : '');
    b.textContent = state.panels[i].img ? `Panel ${i + 1} · photo` : `Panel ${i + 1} · empty`;
    b.addEventListener('click', () => { state.selected = i; redraw(); });
    slotsEl.appendChild(b);
  }
}

function markGroup(container, attr, value) {
  container.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset[attr] === value));
}

document.getElementById('layouts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-layout]');
  if (!b) return;
  state.layout = b.dataset.layout;
  if (state.selected >= slotCount(state.layout)) state.selected = 0;
  markGroup(document.getElementById('layouts'), 'layout', state.layout);
  redraw();
});
document.getElementById('grades').addEventListener('click', (e) => {
  const b = e.target.closest('[data-grade]');
  if (!b) return;
  state.grade = b.dataset.grade;
  markGroup(document.getElementById('grades'), 'grade', state.grade);
  redraw();
});

async function putPhoto(img) {
  state.panels[state.selected] = { ...blankPanel(), img };
  const empty = state.panels.findIndex((p) => !p.img);
  if (empty !== -1 && empty < slotCount(state.layout)) state.selected = empty;
  setStatus('Photo loaded. Drag it in the preview, then export a PNG.');
  redraw();
}

document.getElementById('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try { await putPhoto(await loadImage(URL.createObjectURL(file))); }
  catch { setStatus('That file could not be read as a photo.'); }
  e.target.value = '';
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    try { await putPhoto(await loadImage(`samples/${b.dataset.sample}.jpg`)); }
    catch { setStatus('Sample photo failed to load.'); }
  });
});

zoomEl.addEventListener('input', () => {
  selectedPanel().zoom = Number(zoomEl.value);
  zoomVal.textContent = `${zoomEl.value}%`;
  redraw();
});
document.getElementById('fitFill').addEventListener('click', () => {
  const p = selectedPanel(); p.fit = !p.fit; redraw();
});
document.getElementById('centre').addEventListener('click', () => {
  const p = selectedPanel(); p.ox = 0; p.oy = 0; p.zoom = 100; redraw();
});
document.getElementById('clearPanel').addEventListener('click', () => {
  state.panels[state.selected] = blankPanel(); redraw();
});

titleEl.addEventListener('input', () => { state.title = titleEl.value; redraw(); });
subtitleEl.addEventListener('input', () => { state.subtitle = subtitleEl.value; redraw(); });
sizeEl.addEventListener('change', redraw);

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * canvas.width;
  const y = (e.clientY - r.top) / r.height * canvas.height;
  drag = { x, y, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * canvas.width;
  const y = (e.clientY - r.top) / r.height * canvas.height;
  const p = selectedPanel();
  if (p.img) {
    p.ox += (x - drag.x) / canvas.width;
    p.oy += (y - drag.y) / canvas.height;
    p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
    p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
    if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 4) drag.moved = true;
    redraw();
  }
  drag.x = x; drag.y = y;
});
canvas.addEventListener('pointerup', () => { drag = null; });

function download(canvasEl, name) {
  canvasEl.toBlob((blob) => {
    if (!blob) { setStatus('Export failed.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function exportOne(key) {
  const [w, h] = SIZES[key];
  const out = renderCover(state, w, h);
  download(out, `vice-cover-${w}x${h}.png`);
  setStatus(`Saved vice-cover-${w}x${h}.png`);
  return out;
}

document.getElementById('export').addEventListener('click', () => exportOne(sizeEl.value));
document.getElementById('exportAll').addEventListener('click', () => {
  Object.keys(SIZES).forEach((key, i) => setTimeout(() => exportOne(key), i * 350));
  setStatus('Exporting all 3 sizes: 1080x1080, 1080x1350, 1920x1080.');
});

// Playtest and screenshot hook: returns the exact export PNG as a data URL.
window.__exportPNG = (w, h) => renderCover(state, w, h).toDataURL('image/png');
window.__viceState = state;

const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  runShot(params.get('shot'), params, {
    setLayout: (v) => { state.layout = v; markGroup(document.getElementById('layouts'), 'layout', v); },
    setGrade: (v) => { state.grade = v; markGroup(document.getElementById('grades'), 'grade', v); },
    setSize: (v) => { sizeEl.value = v; },
    setCaption: (t, s) => {
      state.title = t; titleEl.value = t;
      if (s !== undefined) { state.subtitle = s; subtitleEl.value = s; }
    },
    setPhoto: (slot, img) => { state.panels[slot] = { ...blankPanel(), img }; },
    redraw,
  });
} else {
  redraw();
}

if (document.fonts && document.fonts.ready) {
  document.fonts.load('80px Anton').then(redraw).catch(() => {});
  document.fonts.ready.then(redraw);
}
