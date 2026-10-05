import sharp from "sharp";

const CANVAS_W = 1536;
const CANVAS_H = 1024;

function colorDistance2(data: Uint8Array, a: number, b: number) {
  const dr = data[a] - data[b];
  const dg = data[a + 1] - data[b + 1];
  const db = data[a + 2] - data[b + 2];
  return dr * dr + dg * dg + db * db;
}

/** Background pixels connected to the photo corners, not the middle of each edge. */
function cornerBackgroundMask(data: Uint8Array, width: number, height: number) {
  const count = width * height;
  const mask = new Uint8Array(count);
  const stack: number[] = [];
  const limit = 34 * 34;
  const bandX = Math.max(2, Math.round(width * 0.12));
  const bandY = Math.max(2, Math.round(height * 0.12));

  const seed = (x: number, y: number) => {
    const p = y * width + x;
    if (mask[p]) return;
    mask[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < width; x += 1) {
    if (x < bandX || x >= width - bandX) {
      seed(x, 0);
      seed(x, height - 1);
    }
  }
  for (let y = 0; y < height; y += 1) {
    if (y < bandY || y >= height - bandY) {
      seed(0, y);
      seed(width - 1, y);
    }
  }

  while (stack.length) {
    const p = stack.pop() as number;
    const x = p % width;
    const y = (p - x) / width;
    const origin = p * 4;
    const visit = (nx: number, ny: number) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
      const np = ny * width + nx;
      if (mask[np]) return;
      if (colorDistance2(data, origin, np * 4) > limit) return;
      mask[np] = 1;
      stack.push(np);
    };
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }

  let removed = 0;
  for (let i = 0; i < count; i += 1) if (mask[i]) removed += 1;
  const center = mask[Math.floor(height / 2) * width + Math.floor(width / 2)] === 1;
  return { mask, removedRatio: removed / count, centerKept: !center };
}

/**
 * Turn one uploaded car photo into a white studio cover immediately.
 * The vehicle stays the uploaded car; the surrounding background is cleared
 * when it touches the corners, then the car is placed on a studio floor.
 */
export async function renderInstantStudioCover(bytes: Buffer): Promise<Buffer> {
  const resized = sharp(bytes, { failOn: "none" }).rotate().resize({
    width: 960,
    height: 960,
    fit: "inside",
    withoutEnlargement: false,
  });
  const { data, info } = await resized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const pixels = Buffer.from(data);
  const { mask, removedRatio, centerKept } = cornerBackgroundMask(pixels, width, height);
  const cutSucceeded = centerKept && removedRatio > 0.05 && removedRatio < 0.94;
  if (cutSucceeded) {
    for (let p = 0; p < mask.length; p += 1) {
      if (mask[p]) pixels[p * 4 + 3] = 0;
    }
  }

  let car = sharp(pixels, { raw: { width, height, channels: 4 } });
  if (cutSucceeded) car = car.trim({ threshold: 1 });
  const carved = await car.png().toBuffer();

  const maxW = Math.round(CANVAS_W * 0.84);
  const maxH = Math.round(CANVAS_H * 0.7);
  const fitted = await sharp(carved).resize({ width: maxW, height: maxH, fit: "inside" }).png().toBuffer();
  const fittedMeta = await sharp(fitted).metadata();
  const fw = fittedMeta.width || maxW;
  const fh = fittedMeta.height || maxH;
  const left = Math.max(0, Math.round((CANVAS_W - fw) / 2));
  const top = Math.max(36, Math.round(CANVAS_H * 0.76 - fh));
  const floorY = Math.min(CANVAS_H - 24, top + fh - 6);
  const shadow = Buffer.from(
    `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${Math.round(CANVAS_W / 2)}" cy="${floorY}" rx="${Math.round(fw * 0.42)}" ry="18" fill="rgba(15,23,42,0.16)"/>
      <ellipse cx="${Math.round(CANVAS_W / 2)}" cy="${floorY}" rx="${Math.round(fw * 0.46)}" ry="26" fill="none" stroke="#e2e8f0" stroke-width="3"/>
    </svg>`,
  );

  return sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: "#ffffff" },
  })
    .composite([
      { input: shadow, top: 0, left: 0 },
      { input: fitted, top, left },
    ])
    .png()
    .toBuffer();
}
