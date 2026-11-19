// Vice Cover Studio cover painter: multi-panel poster art from photos, a
// caption and a colour grade. Pure canvas, no network, no outside assets.
// State shape: { layout, grade, title, subtitle, panels } where each panel
// is { img, zoom, ox, oy, fit } and img may be null.

export const GRADES = {
  sunset: { filter: 'saturate(1.28) contrast(1.08)', top: '#ff9a3d', mid: '#ff2e88', low: '#5b2a86',
    title: ['#ffe259', '#ff7a3d', '#ff2e88'], sky: ['#2b1055', '#ff5e62', '#ff9966'] },
  neon: { filter: 'saturate(1.55) contrast(1.14)', top: '#00e5ff', mid: '#ff2e88', low: '#3b0f66',
    title: ['#7df9ff', '#ff2e88', '#b967ff'], sky: ['#0b1035', '#c026d3', '#00e5ff'] },
  golden: { filter: 'saturate(1.22) contrast(1.06)', top: '#ffd76a', mid: '#ff8c1a', low: '#7a2e0e',
    title: ['#fff3b0', '#ffb347', '#ff7a1a'], sky: ['#3a1c07', '#e07b39', '#ffd76a'] },
  noir: { filter: 'saturate(0.12) contrast(1.28) brightness(1.02)', top: '#e8e8e8', mid: '#9a9a9a', low: '#111111',
    title: ['#ffffff', '#d5d5d5', '#8f8f8f'], sky: ['#000000', '#2a2a2a', '#5a5a5a'] },
};

export const LAYOUTS = ['cover', 'grid', 'solo'];

/** Panel rectangles for a layout inside the panel area. */
export function panelRects(layout, w, h) {
  const m = Math.round(w * 0.016);
  const g = Math.round(w * 0.012);
  const area = { x: m, y: m, w: w - 2 * m, h: Math.round(h * 0.79) };
  if (layout === 'solo') return [{ ...area }];
  if (layout === 'grid') {
    const pw = (area.w - g) / 2, ph = (area.h - g) / 2;
    return [
      { x: area.x, y: area.y, w: pw, h: ph },
      { x: area.x + pw + g, y: area.y, w: pw, h: ph },
      { x: area.x, y: area.y + ph + g, w: pw, h: ph },
      { x: area.x + pw + g, y: area.y + ph + g, w: pw, h: ph },
    ];
  }
  const heroW = area.w * 0.62;
  const sideX = area.x + heroW + g;
  const sideW = area.w - heroW - g;
  const halfH = (area.h - g) / 2;
  return [
    { x: area.x, y: area.y, w: heroW, h: area.h },
    { x: sideX, y: area.y, w: sideW, h: halfH },
    { x: sideX, y: area.y + halfH + g, w: sideW, h: halfH },
  ];
}

/** How many panel slots a layout shows. */
export function slotCount(layout) {
  return layout === 'solo' ? 1 : layout === 'grid' ? 4 : 3;
}

function drawPhoto(ctx, img, rect, panel) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = panel.fit
    ? Math.min(rect.w / iw, rect.h / ih)
    : Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom / 100);
  const pw = iw * scale, ph = ih * scale;
  const cx = rect.x + rect.w / 2 + (panel.ox || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (panel.oy || 0) * rect.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

function emptyPanel(ctx, rect, grade, label) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, grade.low); g.addColorStop(1, grade.top);
  ctx.fillStyle = g; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 ${Math.max(14, rect.w * 0.045)}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textBaseline = 'alphabetic';
}

function gradeWash(ctx, rect, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, hexA(grade.top, 0.10));
  g.addColorStop(0.55, hexA(grade.mid, 0.05));
  g.addColorStop(1, hexA(grade.low, 0.34));
  ctx.fillStyle = g; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const v = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = v; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function fitTitle(ctx, text, w, h) {
  let size = Math.round(h * 0.115);
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > w * 0.94 && size > 16) {
    size -= 2; ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

function drawCaption(ctx, w, h, state, grade) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const bandY = Math.round(h * 0.79);
  const scrim = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  scrim.addColorStop(0, 'rgba(10,4,20,0)'); scrim.addColorStop(0.35, 'rgba(10,4,20,0.72)');
  scrim.addColorStop(1, 'rgba(10,4,20,0.92)');
  ctx.fillStyle = scrim; ctx.fillRect(0, bandY - h * 0.06, w, h - bandY + h * 0.06);
  if (title) {
    const size = fitTitle(ctx, title, w, h);
    const cx = w / 2, cy = bandY + (h - bandY) * 0.48;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-0.022); ctx.translate(-cx, -cy);
    const fill = ctx.createLinearGradient(0, cy - size * 0.7, 0, cy + size * 0.35);
    fill.addColorStop(0, grade.title[0]); fill.addColorStop(0.55, grade.title[1]); fill.addColorStop(1, grade.title[2]);
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160418'; ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = size * 0.22; ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(title, cx, cy);
    ctx.fillStyle = fill; ctx.fillText(title, cx, cy);
    ctx.restore();
  }
  if (sub) {
    const size = Math.max(13, Math.round(h * 0.024));
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6;
    const y = h - Math.max(18, h * 0.035);
    ctx.fillText(sub.toUpperCase(), w / 2, y);
    ctx.shadowBlur = 0;
  }
}

/** Paints the whole cover onto a canvas already sized to the export size. */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.sky[0]); sky.addColorStop(0.55, grade.sky[1]); sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  const first = (state.panels || []).find((p) => p && p.img);
  rects.forEach((rect, i) => {
    const panel = (state.panels || [])[i];
    const shown = panel && panel.img ? panel : first;
    ctx.save();
    ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    if (shown && shown.img) {
      ctx.filter = grade.filter;
      drawPhoto(ctx, shown.img, rect, shown);
      ctx.filter = 'none';
      gradeWash(ctx, rect, grade);
    } else {
      emptyPanel(ctx, rect, grade, `PANEL ${i + 1}`);
    }
    ctx.restore();
    ctx.lineWidth = Math.max(3, w * 0.005);
    ctx.strokeStyle = '#ffffff'; ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    if (state.showSelection && panel && panel.img && state.selected === i) {
      ctx.lineWidth = Math.max(3, w * 0.006);
      ctx.strokeStyle = '#ffb347'; ctx.strokeRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
    }
  });
  ctx.font = `700 ${Math.max(14, Math.round(h * 0.026))}px system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
  ctx.fillText('PALMA BAY', Math.round(w * 0.03), Math.round(h * 0.055));
  ctx.textAlign = 'right';
  ctx.fillText('NEON COAST', Math.round(w * 0.97), Math.round(h * 0.055));
  ctx.shadowBlur = 0;
  drawCaption(ctx, w, h, state, grade);
}

/** Renders the cover at full export size on a fresh canvas. */
export function renderCover(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  drawCoverArt(canvas, state);
  return canvas;
}
