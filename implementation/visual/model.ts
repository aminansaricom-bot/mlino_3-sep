import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Visual product search (D-91): the image embedding model, run inside MLINO on CPU. No external AI provider: the
 * weights are downloaded once (setup), checked by SHA-256, and loaded from a local directory.
 *
 * Model: DINOv2 small (Meta, Apache-2.0 — facebook/dinov2-small @ ed25f3a), ONNX export from
 * onnx-community/dinov2-small @ 8b1f705. ONNX is a data format: loading it runs no model-provided code.
 *
 * One preprocessing for catalog images and for search photos (the only function that makes pixels into a tensor):
 * EXIF orientation applied, flattened on white, shortest edge 256 (bicubic), centre 224×224, ImageNet mean/std;
 * the vector is the CLS token of the last hidden state, L2-normalised. Model id, preprocessing version and
 * dimensions are stored with every vector; vectors of other versions are never compared.
 */

export const MODEL_ID = 'dinov2-small@facebook-ed25f3a+onnx-community-8b1f705';
export const PREPROCESS_VERSION = 'exif-white-cubic256-center224-imagenet-cls-l2-v1';
export const DIMS = 384;
export const MODEL_FILE = 'model.onnx';
export const MODEL_SHA256 = 'f22797eabf810a75e41de68d378541ebea372122b25c4ce3ef25ff618250c20a';
export const MODEL_URL = 'https://huggingface.co/onnx-community/dinov2-small/resolve/8b1f705a3a7f6f062f6bdd21986c1583d3ef105d/onnx/model.onnx';

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const SIZE = 224;
const SHORT = 256;
/** Largest decoded image accepted anywhere in the pipeline (catalog or search). */
export const MAX_PIXELS = 16_777_216;

export interface EmbeddingModel {
  readonly id: string;
  readonly preprocess: string;
  readonly dims: number;
  embed(image: Buffer): Promise<Float32Array>;
}

type Sharp = typeof import('sharp').default;
let sharpLib: Sharp | null = null;
function sharp(): Sharp {
  // Loaded on first use so the API starts (and every other route works) on a server without the native module.
  if (!sharpLib) sharpLib = require('sharp') as Sharp; // eslint-disable-line @typescript-eslint/no-var-requires
  return sharpLib;
}

/** The single pixels → tensor step (NCHW float32, 1×3×224×224). */
export async function preprocess(image: Buffer): Promise<Float32Array> {
  const { data, info } = await sharp()(image, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
    .rotate()
    .flatten({ background: '#ffffff' })
    .toColourspace('srgb')
    .resize({ width: SHORT, height: SHORT, fit: 'outside', kernel: 'cubic' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const left = Math.floor((width - SIZE) / 2);
  const top = Math.floor((height - SIZE) / 2);
  const out = new Float32Array(3 * SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const src = ((top + y) * width + (left + x)) * channels;
      for (let c = 0; c < 3; c += 1) out[c * SIZE * SIZE + y * SIZE + x] = (data[src + c] / 255 - MEAN[c]) / STD[c];
    }
  }
  return out;
}

export function l2normalize(v: Float32Array): Float32Array {
  let s = 0;
  for (let i = 0; i < v.length; i += 1) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i += 1) out[i] = v[i] / n;
  return out;
}

export type ModelStatus = { state: 'missing' | 'loading' | 'ready' | 'error'; detail?: string };

/** DINOv2 small on onnxruntime (CPU). Created once per process; `embed` is safe to call concurrently. */
export class OnnxDinoV2Model implements EmbeddingModel {
  readonly id = MODEL_ID;
  readonly preprocess = PREPROCESS_VERSION;
  readonly dims = DIMS;

  private constructor(private readonly session: import('onnxruntime-node').InferenceSession, private readonly ort: typeof import('onnxruntime-node')) {}

  /** Loads from `dir`, refusing a file whose SHA-256 is not the pinned one. */
  static async load(dir: string, threads = 1): Promise<OnnxDinoV2Model> {
    const file = path.join(dir, MODEL_FILE);
    if (!fs.existsSync(file)) throw new Error(`VISUAL_MODEL_MISSING: ${file} (run the visual-model-fetch step)`);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (digest !== MODEL_SHA256) throw new Error('VISUAL_MODEL_CHECKSUM: the model file is not the pinned version');
    const ort = require('onnxruntime-node') as typeof import('onnxruntime-node'); // eslint-disable-line @typescript-eslint/no-var-requires
    const session = await ort.InferenceSession.create(file, { executionProviders: ['cpu'], intraOpNumThreads: threads, interOpNumThreads: 1 });
    return new OnnxDinoV2Model(session, ort);
  }

  async embed(image: Buffer): Promise<Float32Array> {
    const pixels = await preprocess(image);
    // onnxruntime checks `instanceof Float32Array` in its own realm (differs under test runners): build it there.
    const F32 = (this.ort.Tensor as unknown as { __f32?: Float32ArrayConstructor }).__f32 ?? realmFloat32(this.ort);
    const input = new this.ort.Tensor('float32', F32.from(pixels), [1, 3, SIZE, SIZE]);
    const out = await this.session.run({ [this.session.inputNames[0]]: input });
    const hidden = out.last_hidden_state ?? out[this.session.outputNames[0]];
    const cls = (hidden.data as Float32Array).slice(0, DIMS); // token 0 of [1, 257, 384]
    return l2normalize(cls);
  }
}

/** The Float32Array constructor onnxruntime accepts: the one it builds itself from a plain number array. */
function realmFloat32(ort: typeof import('onnxruntime-node')): Float32ArrayConstructor {
  const C = (new ort.Tensor('float32', [0], [1]).data as Float32Array).constructor as Float32ArrayConstructor;
  (ort.Tensor as unknown as { __f32?: Float32ArrayConstructor }).__f32 = C;
  return C;
}
