/* Render the existing code-native Mín Fjármál mark using workspace sharp. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const sharp = require('sharp');

const images = path.resolve(path.dirname(require.resolve('../package.json')), 'assets/images');
const cobalt = '#2F4FE4';

async function main() {
  const source = await fs.readFile(path.join(images, 'min-fjarmal-mark.svg'), 'utf8');
  const mark = Buffer.from(source);
  const glyph = source.match(/<path[^>]*\/>/)[0];
  const glyphSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${glyph}</svg>`);
  const paddedMark = await sharp(mark).resize(768, 768).png().toBuffer();
  await Promise.all([
    sharp(mark).flatten({ background: cobalt }).removeAlpha().png().toFile(path.join(images, 'icon.png')),
    sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#00000000' } }).composite([{ input: paddedMark, left: 128, top: 128 }]).png().toFile(path.join(images, 'splash-icon.png')),
    sharp(mark).resize(48, 48).png().toFile(path.join(images, 'favicon.png')),
    sharp(glyphSvg).png().toFile(path.join(images, 'android-icon-foreground.png')),
    sharp(glyphSvg).png().toFile(path.join(images, 'android-icon-monochrome.png')),
    sharp({ create: { width: 1024, height: 1024, channels: 3, background: cobalt } }).png().toFile(path.join(images, 'android-icon-background.png')),
  ]);
  for (const file of ['icon.png', 'splash-icon.png', 'favicon.png', 'android-icon-foreground.png', 'android-icon-monochrome.png', 'android-icon-background.png']) {
    const metadata = await sharp(path.join(images, file)).metadata();
    console.log(`${file}: ${metadata.width} × ${metadata.height}, alpha=${metadata.hasAlpha}`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
