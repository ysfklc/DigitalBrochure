import fs from "fs-extra";
import sharp from "sharp";
import { removeBackground } from "@imgly/background-removal-node";
import path from "path";

async function removeBg(inputPath: string) {
  const buffer = await fs.readFile(inputPath);
  const result = await removeBackground(buffer);
  const arrayBuffer = await result.arrayBuffer();
  return sharp(Buffer.from(arrayBuffer)).png();
}

async function canvas(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
}

async function softShadow(buffer: Buffer, opacity = 0.15, blur = 25) {
  const blurred = await sharp(buffer)
    .blur(blur)
    .modulate({ brightness: 0 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { width, height, channels } = blurred.info;
  const data = blurred.data;
  
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * opacity);
  }
  
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

async function clean_center(img: sharp.Sharp) {
  const meta = await img.metadata();
  const W = Math.round((meta.width || 100) * 1.6);
  const H = Math.round((meta.height || 100) * 1.4);

  const buf = await img.toBuffer();
  const shadow = await softShadow(buf);

  return (await canvas(W, H)).composite([
    {
      input: shadow,
      left: Math.round(W / 2 - (meta.width || 100) / 2 + 10),
      top: Math.round(H / 2 - (meta.height || 100) / 2 + 20),
    },
    {
      input: buf,
      left: Math.round(W / 2 - (meta.width || 100) / 2),
      top: Math.round(H / 2 - (meta.height || 100) / 2),
    },
  ]);
}

async function clean_offset(img: sharp.Sharp) {
  const meta = await img.metadata();
  const buf = await img.toBuffer();
  const W = Math.round((meta.width || 100) * 1.8);
  const H = Math.round((meta.height || 100) * 1.4);

  return (await canvas(W, H)).composite([
    {
      input: buf,
      left: Math.round(W * 0.15),
      top: Math.round(H / 2 - (meta.height || 100) / 2),
    },
  ]);
}

async function editorial_left(img: sharp.Sharp) {
  const meta = await img.metadata();
  const buf = await img.toBuffer();

  return (await canvas(Math.round((meta.width || 100) * 2), Math.round((meta.height || 100) * 1.4)))
    .composite([
      {
        input: buf,
        left: Math.round((meta.width || 100) * 0.15),
        top: Math.round((meta.height || 100) * 0.2),
      },
    ]);
}

async function editorial_right(img: sharp.Sharp) {
  const meta = await img.metadata();
  const buf = await img.toBuffer();

  return (await canvas(Math.round((meta.width || 100) * 2), Math.round((meta.height || 100) * 1.4)))
    .composite([
      {
        input: buf,
        left: Math.round((meta.width || 100) * 0.8),
        top: Math.round((meta.height || 100) * 0.2),
      },
    ]);
}

async function product_duo_depth(img: sharp.Sharp) {
  const meta = await img.metadata();
  const buf = await img.toBuffer();
  const small = await sharp(buf)
    .resize({ width: Math.round((meta.width || 100) * 0.92) })
    .toBuffer();

  return (await canvas(1200, 900)).composite([
    { input: small, left: 80, top: 120 },
    { input: buf, left: 140, top: 60 },
  ]);
}

async function minimal_motion(img: sharp.Sharp) {
  const buf = await img.toBuffer();
  const blurred = await sharp(buf).blur(2).modulate({ brightness: 0.5 }).toBuffer();
  return (await canvas(1200, 800)).composite([
    { input: blurred, left: 40, top: 40 },
    { input: buf, left: 120, top: 40 },
  ]);
}

async function side_by_side(img: sharp.Sharp) {
  const meta = await img.metadata();
  const buf = await img.toBuffer();

  return (await canvas((meta.width || 100) * 2, meta.height || 100)).composite([
    { input: buf, left: 0, top: 0 },
    { input: buf, left: meta.width || 100, top: 0 },
  ]);
}

async function overlap_left(img: sharp.Sharp) {
  const meta = await img.metadata();
  const buf = await img.toBuffer();

  return (await canvas((meta.width || 100) * 2, meta.height || 100)).composite([
    { input: buf, left: 0, top: 0 },
    { input: buf, left: Math.round((meta.width || 100) * 0.6), top: 0 },
  ]);
}

async function overlap_right(img: sharp.Sharp) {
  const meta = await img.metadata();
  const buf = await img.toBuffer();

  return (await canvas((meta.width || 100) * 2, meta.height || 100)).composite([
    { input: buf, left: 0, top: 0 },
    { input: buf, left: Math.round((meta.width || 100) * 0.4), top: 0 },
  ]);
}

const PRESETS: Record<string, (img: sharp.Sharp) => Promise<sharp.Sharp>> = {
  clean_center,
  clean_offset,
  editorial_left,
  editorial_right,
  product_duo_depth,
  minimal_motion,
  side_by_side,
  overlap_left,
  overlap_right,
};

export async function processImage({
  inputPath,
  outputDir,
  preset,
  removeBackgroundOnly = false,
}: {
  inputPath: string;
  outputDir: string;
  preset?: string;
  removeBackgroundOnly?: boolean;
}): Promise<string> {
  await fs.ensureDir(outputDir);

  const cleanImg = await removeBg(inputPath);
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);

  if (removeBackgroundOnly) {
    const outputPath = path.join(outputDir, `nobg_${timestamp}_${randomId}.png`);
    await cleanImg.png().toFile(outputPath);
    return outputPath;
  }

  if (preset && PRESETS[preset]) {
    const fn = PRESETS[preset];
    const composed = await fn(cleanImg);
    const outputPath = path.join(outputDir, `${preset}_${timestamp}_${randomId}.png`);
    await composed.png().toFile(outputPath);
    return outputPath;
  }

  throw new Error(`Unknown preset: ${preset}`);
}

export function getAvailablePresets() {
  return Object.keys(PRESETS);
}

export async function removeBackgroundFromUrl(imageSource: string, outputDir: string): Promise<string> {
  await fs.ensureDir(outputDir);
  
  let buffer: Buffer;
  const isLocalPath = !imageSource.startsWith('http://') && !imageSource.startsWith('https://');
  
  if (isLocalPath) {
    buffer = await fs.readFile(imageSource);
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(imageSource, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Image fetch timeout');
      }
      throw error;
    }
  }
  
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  try {
    const result = await removeBackground(buffer);
    const resultArrayBuffer = await result.arrayBuffer();
    const outputPath = path.join(outputDir, `nobg_${timestamp}_${randomId}.png`);
    await sharp(Buffer.from(resultArrayBuffer)).png().toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    throw error;
  }
}

export async function applyPresetFromUrl(imageSource: string, preset: string, outputDir: string): Promise<string> {
  await fs.ensureDir(outputDir);
  
  let buffer: Buffer;
  const isLocalPath = !imageSource.startsWith('http://') && !imageSource.startsWith('https://');
  
  if (isLocalPath) {
    buffer = await fs.readFile(imageSource);
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(imageSource, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Image fetch timeout');
      }
      throw error;
    }
  }
  
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const tempInputPath = path.join(outputDir, `temp_${timestamp}_${randomId}.png`);
  
  await fs.writeFile(tempInputPath, buffer);
  
  try {
    const cleanImg = await removeBg(tempInputPath);
    
    if (!PRESETS[preset]) {
      throw new Error(`Unknown preset: ${preset}`);
    }
    
    const fn = PRESETS[preset];
    const composed = await fn(cleanImg);
    const outputPath = path.join(outputDir, `${preset}_${timestamp}_${randomId}.png`);
    await composed.png().toFile(outputPath);
    
    await fs.remove(tempInputPath);
    
    return outputPath;
  } catch (error) {
    await fs.remove(tempInputPath);
    throw error;
  }
}
