// Usage: npm run qr -- https://your-domain.com
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import restaurants from '../restaurants.json' with { type: 'json' };

const base = process.argv[2]?.replace(/\/+$/, '');
if (!base) {
  console.error('Usage: npm run qr -- https://your-domain.com');
  process.exit(1);
}

const outDir = new URL('../qr/', import.meta.url);
await mkdir(outDir, { recursive: true });

for (const slug of Object.keys(restaurants)) {
  const url = `${base}/r/${slug}`;
  await QRCode.toFile(fileURLToPath(new URL(`${slug}.png`, outDir)), url, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: 'H',
  });
  console.log(`qr/${slug}.png  ->  ${url}`);
}
