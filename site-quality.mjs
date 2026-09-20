import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baseUrl = 'https://jabach811.github.io/hipco-redesign/';
const htmlFiles = fs.readdirSync(root).filter(file => file.endsWith('.html')).sort();
const dimensions = new Map();

const productRepairs = new Map([
  ['item-00E9001-110.html', 'Niron Automatic Multifunction Welding Unit with Barcode Scanner, 110 Volts'],
  ['item-0SP1-4.html', '1/4 in Solid Block Die for Steel or Stainless Steel Pipe'],
  ['item-1-24X8PVC.html', "4 ft x 8 ft x 1/2 in Gray PVC Sheet"],
  ['item-EASMT4EP12R24-024-60-CP.html', 'Plast-O-Matic EASMT Series 1/2 in CPVC Solenoid Valve']
]);

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const text = value => String(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const match = (source, expression) => (source.match(expression) || [])[1] || '';
const clamp = (value, limit = 155) => value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;
const pageUrl = file => file === 'index.html' ? baseUrl : `${baseUrl}${file}`;

function pngSize(data) {
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

function jpegSize(data) {
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    offset += 2;
    if ([0xd8, 0xd9].includes(marker)) continue;
    const length = data.readUInt16BE(offset);
    if (marker >= 0xc0 && marker <= 0xc3) return [data.readUInt16BE(offset + 5), data.readUInt16BE(offset + 3)];
    offset += length;
  }
  return null;
}

function imageSize(src) {
  if (dimensions.has(src)) return dimensions.get(src);
  const file = path.join(root, src.replace(/\?.*$/, ''));
  let size = [600, 600];
  try {
    const data = fs.readFileSync(file);
    if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) size = pngSize(data);
    else if (data.subarray(0, 3).toString() === 'GIF') size = [data.readUInt16LE(6), data.readUInt16LE(8)];
    else if (data.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))) size = jpegSize(data) || size;
    else if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') {
      const kind = data.subarray(12, 16).toString();
      if (kind === 'VP8X') size = [1 + data.readUIntLE(24, 3), 1 + data.readUIntLE(27, 3)];
      else if (kind === 'VP8 ') size = [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
      else if (kind === 'VP8L') {
        const bits = data.readUInt32LE(21);
        size = [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
      }
    } else if (path.extname(file).toLowerCase() === '.svg') {
      const svg = data.toString('utf8');
      const width = Number(match(svg, /\bwidth="([\d.]+)/i));
      const height = Number(match(svg, /\bheight="([\d.]+)/i));
      const viewBox = svg.match(/\bviewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*"/i);
      size = width && height ? [width, height] : [Number(viewBox?.[1]) || 600, Number(viewBox?.[2]) || 600];
    }
  } catch {
    // Dynamic templates already carry dimensions. This only protects any unknown static image.
  }
  dimensions.set(src, size);
  return size;
}

function addImageDimensions(html) {
  return html.replace(/<img\b[^>]*>/gi, tag => {
    if (/\bwidth="\d+"/.test(tag) && /\bheight="\d+"/.test(tag)) return tag;
    const src = match(tag, /\bsrc=["']([^"']+)/i);
    if (!src) return tag;
    const [width, height] = imageSize(src);
    const attrs = `${/\bwidth="\d+"/.test(tag) ? '' : ` width="${width}"`}${/\bheight="\d+"/.test(tag) ? '' : ` height="${height}"`}`;
    return tag.replace(/\s*\/?\s*>$/, `${attrs}>`);
  });
}

function routeName(file) {
  return file.replace(/\.html$/, '').replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function uniqueDescription(page, duplicateDescriptions) {
  const current = match(page.html, /<meta name="description" content="([^"]*)"/i);
  if (!current || duplicateDescriptions.get(current) > 1) {
    const heading = text(match(page.html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)) || routeName(page.file);
    const itemNumber = text(match(page.html, /Item #\s*([^<·]+)/i));
    const detail = itemNumber && !heading.includes(itemNumber) ? `${heading} (item #${itemNumber})` : heading;
    return clamp(`${detail}. Product details, availability, and quote support from Harrington Process Solutions.`);
  }
  return clamp(current);
}

function applyHead(page, description) {
  const canonical = pageUrl(page.file);
  const title = match(page.html, /<title>([\s\S]*?)<\/title>/i) || 'Harrington Process Solutions';
  const noIndex = ['404.html', 'styleguide.html'].includes(page.file);
  let html = page.html
    .replace(/\s*<link rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<meta(?: property="og:(?:title|description|url|type|site_name)"| name="twitter:card")[^>]*>/gi, '')
    .replace(/\s*<meta name="robots"[^>]*>/gi, '');
  const metadata = [
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:title" content="${escapeHtml(text(title))}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Harrington Process Solutions">',
    '<meta name="twitter:card" content="summary">',
    noIndex ? '<meta name="robots" content="noindex,follow">' : ''
  ].filter(Boolean).join('\n');
  return html.replace(/<\/head>/i, `${metadata}\n</head>`);
}

let pages = htmlFiles.map(file => ({ file, html: fs.readFileSync(path.join(root, file), 'utf8') }));
for (const page of pages) {
  if (productRepairs.has(page.file)) page.html = page.html.replaceAll('Not Found', productRepairs.get(page.file));
  if (page.file === 'index.html') page.html = page.html.replace('href="#knowledge">Knowledge</a>', 'href="knowledge.html">Knowledge</a>');
}

const duplicateDescriptions = new Map();
for (const page of pages) {
  const description = match(page.html, /<meta name="description" content="([^"]*)"/i);
  duplicateDescriptions.set(description, (duplicateDescriptions.get(description) || 0) + 1);
}

for (const page of pages) {
  const description = uniqueDescription(page, duplicateDescriptions);
  page.html = page.html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeHtml(description)}">`);
  if (!/<meta name="description"/i.test(page.html)) page.html = page.html.replace(/<\/title>/i, `</title>\n<meta name="description" content="${escapeHtml(description)}">`);
  page.html = addImageDimensions(page.html);
  page.html = applyHead(page, description);
  fs.writeFileSync(path.join(root, page.file), page.html);
}

const sitemap = pages
  .filter(page => !['404.html', 'styleguide.html'].includes(page.file))
  .map(page => `  <url><loc>${pageUrl(page.file)}</loc></url>`)
  .join('\n');
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}sitemap.xml\n`);

console.log(`Updated ${pages.length} HTML pages, sitemap.xml, and robots.txt.`);
