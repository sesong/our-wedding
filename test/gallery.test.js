import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('the gallery follows the numbered pictures_new order', async () => {
  const home = await readFile(path.join(root, 'docs', 'index.html'), 'utf8');
  const fullGallery = await readFile(path.join(root, 'docs', 'gallery.html'), 'utf8');
  const homeGrid = home.match(/<div class="gallery-grid"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  const allGrid = fullGallery.match(/<div class="gallery-grid[^>]*>([\s\S]*?)<\/div>/)?.[1];
  assert.ok(homeGrid, 'home gallery exists');
  assert.ok(allGrid, 'full gallery page exists');
  const homeNames = [...homeGrid.matchAll(/<button class="gallery-item"[^>]*><img src="\.\/images\/([^"]+)"/g)].map(match => match[1]);
  const names = [...allGrid.matchAll(/<button class="gallery-item"[^>]*><img src="\.\/images\/([^"]+)"/g)].map(match => match[1]);
  const homeLightboxNames = [...home.matchAll(/<button class="gallery-item"[^>]*><img src="\.\/images\/([^"]+)"/g)].map(match => match[1]);
  const prepared = (await readdir(path.join(root, 'docs', 'images')))
    .filter(name => /^\d{3}\.jpe?g$/i.test(name))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  assert.equal(names.length, new Set(names).size, 'photos are not repeated');
  assert.deepEqual(names, prepared);
  assert.equal(names.length, 28);
  assert.deepEqual(homeNames, prepared.slice(0, 5));
  assert.equal((homeGrid.match(/class="gallery-item"/g) || []).length, 5);
  assert.deepEqual(homeLightboxNames, prepared, 'home lightbox includes all photos in the same order');
  assert.match(home, /<div class="gallery-lightbox-source" hidden aria-hidden="true">/);
  assert.match(home, /<a class="gallery-more" href="\.\/gallery\.html"[^>]*><img src="\.\/images\/006\.jpg"/);
});
