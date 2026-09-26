/**
 * Search-by-photo (D-91), on the phone: the chosen photo or a camera frame is turned upright (EXIF orientation),
 * cropped to what the person marked, made small (longest side 640) and re-encoded as JPEG. Re-encoding through a
 * canvas drops every EXIF field (place, device, time): only these pixels go to MLINO's server.
 */

export interface CropRect { x: number; y: number; w: number; h: number } // fractions of the image, 0..1
export const FULL: CropRect = { x: 0, y: 0, w: 1, h: 1 };
export const MAX_SIDE = 640;
/** Larger files are refused before decoding (a photo from a phone camera is a few MB). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(readonly code: 'PHOTO_TOO_LARGE' | 'PHOTO_UNREADABLE') { super(code); }
}

export interface Photo { width: number; height: number; draw: (ctx: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number) => void; close: () => void }

/** A photo from a file, upright as the camera held it. */
export async function photoFromFile(file: Blob): Promise<Photo> {
  if (file.size > MAX_FILE_BYTES) throw new PhotoError('PHOTO_TOO_LARGE');
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return fromBitmap(bmp);
  } catch {
    // Older WebViews: an <img> also applies the EXIF orientation (CSS image-orientation: from-image by default).
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (!img.naturalWidth) throw new Error('empty');
      return { width: img.naturalWidth, height: img.naturalHeight, draw: (ctx, sx, sy, sw, sh, dw, dh) => ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh), close: () => URL.revokeObjectURL(url) };
    } catch { URL.revokeObjectURL(url); throw new PhotoError('PHOTO_UNREADABLE'); }
  }
}

/** One frame of the live storefront's own camera stream (no second camera is opened). */
export async function photoFromVideo(video: HTMLVideoElement): Promise<Photo> {
  if (!video.videoWidth) throw new PhotoError('PHOTO_UNREADABLE');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  return { width: canvas.width, height: canvas.height, draw: (ctx, sx, sy, sw, sh, dw, dh) => ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, dw, dh), close: () => { canvas.width = 0; } };
}

function fromBitmap(bmp: ImageBitmap): Photo {
  return { width: bmp.width, height: bmp.height, draw: (ctx, sx, sy, sw, sh, dw, dh) => ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, dw, dh), close: () => bmp.close() };
}

/** Keeps a crop inside the photo and not smaller than 10 % of each side. */
export function clampCrop(r: CropRect): CropRect {
  const w = Math.min(1, Math.max(0.1, r.w)); const h = Math.min(1, Math.max(0.1, r.h));
  return { w, h, x: Math.min(1 - w, Math.max(0, r.x)), y: Math.min(1 - h, Math.max(0, r.y)) };
}

/** The cropped, downscaled, EXIF-free JPEG that is sent. */
export async function cropToJpeg(photo: Photo, crop: CropRect, maxSide = MAX_SIDE): Promise<Blob> {
  const c = clampCrop(crop);
  const sw = Math.max(1, Math.round(c.w * photo.width)); const sh = Math.max(1, Math.round(c.h * photo.height));
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(32, Math.round(sw * scale)); canvas.height = Math.max(32, Math.round(sh * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  photo.draw(ctx, Math.round(c.x * photo.width), Math.round(c.y * photo.height), sw, sh, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  canvas.width = 0;
  if (!blob) throw new PhotoError('PHOTO_UNREADABLE');
  return blob;
}
