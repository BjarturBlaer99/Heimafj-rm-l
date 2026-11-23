const { Buffer } = require('node:buffer');
const fs = require('node:fs/promises');
const { createRequire } = require('node:module');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const address = process.argv[2];
  if (!address) throw new Error('Usage: node mobile/scripts/iphone-qr.cjs exp://your-expo-host');
  const url = new URL(address);
  if (!['exp:', 'exps:'].includes(url.protocol) || url.username || url.password) throw new Error('Supply an Expo Go URL.');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname === '[::1]' || /^127\./.test(url.hostname) || url.hostname === '0.0.0.0') {
    throw new Error('This address points to the phone itself. Wait for the Expo tunnel or use the computer\'s LAN address.');
  }
  const mobile = path.dirname(require.resolve('../package.json'));
  const expoRequire = createRequire(path.join(mobile, 'node_modules/expo/node_modules/@expo/cli/build/src/utils/qr.js'));
  const matrix = expoRequire('toqr').toQR(address);
  const extent = Math.sqrt(matrix.length);
  if (!Number.isInteger(extent)) throw new Error('Invalid QR matrix.');
  const size = 450;
  const moduleSize = Math.floor(size / (extent + 8));
  if (moduleSize < 2) throw new Error('The Expo URL is too long for this QR size.');
  const padding = Math.floor((size - extent * moduleSize) / 2);
  const rectangles = [];
  for (let row = 0; row < extent; row += 1) {
    for (let column = 0; column < extent; column += 1) {
      if (matrix[row * extent + column]) rectangles.push(`<rect x="${padding + column * moduleSize}" y="${padding + row * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/><g fill="black">${rectangles.join('')}</g></svg>`;
  const directory = path.join(mobile, '.expo');
  await fs.mkdir(directory, { recursive: true });
  const output = path.join(directory, 'iphone-qr.png');
  await sharp(Buffer.from(svg)).flatten({ background: '#FFFFFF' }).removeAlpha().png().toFile(output);
  console.log(`${address}\n${output}\n${extent} modules, ${size}px, quiet zone ${padding}px`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
