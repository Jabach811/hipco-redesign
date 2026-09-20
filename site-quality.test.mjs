import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const htmlFiles = () => fs.readdirSync(root).filter(file => file.endsWith('.html'));

test('store search has filters, ranked results, and incremental rendering', () => {
  const search = read('search.html');
  assert.match(search, /id="category-filter"/);
  assert.match(search, /id="manufacturer-filter"/);
  assert.match(search, /const PAGE_SIZE=48/);
  assert.match(search, /Load more results/);
  assert.match(read('index.html'), /href="knowledge\.html">Knowledge<\/a>/);
});

test('catalog no longer exposes failed product pages as items for sale', () => {
  for (const file of [
    'item-00E9001-110.html',
    'item-0SP1-4.html',
    'item-1-24X8PVC.html',
    'item-EASMT4EP12R24-024-60-CP.html'
  ]) {
    assert.doesNotMatch(read(file), /<h1>Not Found<\/h1>/);
  }
});

test('static pages carry shareable SEO metadata and the site has crawl controls', () => {
  assert.ok(fs.existsSync(path.join(root, 'robots.txt')));
  assert.ok(fs.existsSync(path.join(root, 'sitemap.xml')));
  for (const file of htmlFiles()) {
    const html = read(file);
    assert.match(html, /<link rel="canonical" href="https:\/\/jabach811\.github\.io\/hipco-redesign\//);
    assert.match(html, /<meta property="og:title" content="/);
    assert.match(html, /<meta property="og:description" content="/);
  }
});

test('static image tags reserve layout space', () => {
  for (const file of htmlFiles()) {
    for (const tag of read(file).matchAll(/<img\b[^>]*>/gi)) {
      assert.match(tag[0], /\bwidth="\d+"/);
      assert.match(tag[0], /\bheight="\d+"/);
    }
  }
  assert.match(read('css/site.css'), /content-visibility:\s*auto/);
});
