// Generates public/icon-192.png and public/icon-512.png.
// Needs the `canvas` package. It isn't a dependency here, so borrow Rolling Home's:
//   NODE_PATH=../rolling-home/node_modules node scripts/generate-icons.cjs
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 100;

  // Background
  ctx.fillStyle = '#15181c';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.125);
  ctx.fill();

  // Map pin
  ctx.fillStyle = '#e8a33d';
  ctx.beginPath();
  ctx.arc(50 * s, 40 * s, 24 * s, Math.PI, 0);
  ctx.bezierCurveTo(74 * s, 58 * s, 58 * s, 70 * s, 50 * s, 86 * s);
  ctx.bezierCurveTo(42 * s, 70 * s, 26 * s, 58 * s, 26 * s, 40 * s);
  ctx.fill();

  // Pin hole
  ctx.fillStyle = '#15181c';
  ctx.beginPath();
  ctx.arc(50 * s, 40 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '..', 'public', `icon-${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
});
