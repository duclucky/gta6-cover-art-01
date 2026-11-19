// Fixed scenes for screenshots. ?shot=cover shows the cover alone at full
// size; ?shot=editor shows the editor with sample photos loaded.
// Query params: photo, photo2, caption, subtitle, layout, grade, size.
// window.__shotReady is set once the scene has painted.
import { loadImage } from './main.js';

export async function runShot(shot, query, api) {
  const layout = query.get('layout') || 'cover';
  const grade = query.get('grade') || 'sunset';
  const size = query.get('size') || '1920x1080';
  api.setLayout(layout);
  api.setGrade(grade);
  api.setSize(size);
  api.setCaption(
    query.get('caption') || 'SUNSET HEIST',
    query.get('subtitle') || 'Palma Bay · Neon Coast',
  );
  const first = query.get('photo') || 'pier';
  const second = query.get('photo2') || 'boulevard';
  const img1 = await loadImage(`samples/${first}.jpg`);
  api.setPhoto(0, img1);
  if (layout !== 'solo') {
    const img2 = await loadImage(`samples/${second}.jpg`);
    api.setPhoto(1, img2);
    if (layout === 'cover') api.setPhoto(2, img1);
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (document.fonts) {
    try { await document.fonts.load('80px Anton'); await document.fonts.ready; } catch { /* fall back to system font */ }
  }
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
