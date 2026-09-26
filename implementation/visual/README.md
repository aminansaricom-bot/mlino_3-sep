# Visual product search (D-91)

«جست‌وجو با عکس»: a person photographs or picks a photo, crops the product, and gets products from MLINO's
published catalog that look similar. Everything runs on MLINO's own server: no photo or query goes to an external
AI provider. The only external step is downloading the model once during setup.

## Model

| | |
|---|---|
| Model | DINOv2 small (ViT-S/14), image embedding for visual similarity. No chat or text model. |
| Weights | Meta, `facebook/dinov2-small` @ `ed25f3a31f01632728cabb09d1542f84ab7b0056` — **Apache-2.0** (commercial use allowed) |
| ONNX file | `onnx-community/dinov2-small` @ `8b1f705a3a7f6f062f6bdd21986c1583d3ef105d`, `onnx/model.onnx`, 88,532,934 bytes, SHA-256 `f22797eabf810a75e41de68d378541ebea372122b25c4ce3ef25ff618250c20a` (checked at every load; a different file is refused) |
| Runtime | `onnxruntime-node` 1.30.0 (MIT), CPU only, 1 thread by default. `sharp` 0.35.4 (Apache-2.0) decodes and resizes. |
| Code execution | ONNX is a data format. Loading it runs no model-provided code (no pickle, no `trust_remote_code`). |
| Id stored with every vector | `dinov2-small@facebook-ed25f3a+onnx-community-8b1f705` |
| Preprocessing (one function for catalog and search) | `exif-white-cubic256-center224-imagenet-cls-l2-v1`: EXIF orientation applied, flattened on white, shortest edge 256 (bicubic), centre 224×224, ImageNet mean/std; vector = CLS token of the last hidden state, L2-normalised |
| Dimensions | 384 |

Vectors of another model id, preprocessing version or dimension are never compared: the search reads only rows with
the current id, version and dimension (see `visual.spec.ts`: «never compares vectors of another model or
preprocessing version»).

## How it works

- **What is searchable:** only what the signed public catalog lists (published, visible items of published businesses).
  - The indexer reads catalog images only from the public export directory (`VISUAL_MEDIA_ROOT`), only paths of the form `media/sha256/xx/<sha>.<ext>`, and only if the bytes hash to that SHA-256.
- **Storage:** module tables in the module database (beside chat and ratings), created at startup.
  - `visual_image_embeddings` — one row per image content hash × model × preprocessing: `pending` / `ready` / `failed`, `error`, `attempts` (up to 3), `vector` (float32 bytes), `source_path`.
  - `visual_image_refs` — the current links organization ↔ catalog item ↔ image hash, rewritten from the catalog on every pass.
- **Indexing:**
  - A background task in the API process runs every 30 s: it embeds new images and refreshes the links. Saving a product never waits for the model.
  - The export already republishes the catalog each minute, so a new or changed product image is picked up within about 1.5 minutes.
  - `visual-index` is the same pass as a command, repeated until nothing is left. Running it again adds nothing (primary key per image × version).
- **Answering:**
  - The index is rebuilt from the current catalog × ready vectors whenever the catalog file or the vectors change, so withdrawn businesses, deleted items, items outside their availability window, and replaced images drop out at once.
  - One result per product (its best-matching image: maximum cosine similarity over the product's images).
  - Filters (business ids from the phone, price) apply before ranking.
  - Nothing under the threshold is returned. The similarity score is not sent to the client.
- **Vector search:** `VectorIndex` interface with `ExactCosineIndex` (exact dot product over normalised vectors).
  - pgvector was not installed on the servers checked (disposable test DB and the demo VPS).
  - Exact search is right for thousands of images: 384 multiply-adds per image. Around 100k images a real ANN index should replace that one class (pgvector HNSW, or an in-process HNSW); the API and the app do not change.

## API

- **`GET /api/visual/status`** (explore host only): `{ model, ready, images: { ready, pending, failed } }`.
- **`POST /api/visual/search?limit=1..24&offset=0..200[&orgs=id,id…][&minPrice=][&maxPrice=]`** (explore host only; `x-mlino-csrf: 1`).
  - **Body:** the image bytes (`image/jpeg|png|webp`), at most 3 MB. No URL is accepted, so the server never fetches a user-supplied address.
  - **Checks:** the real type is decided from the decoded file, not the name; at most 4096 px per side and 16.7 MP; at least 32 px.
  - **Limits:** 30 searches per 10 minutes per address; 2 at a time per process; 20 s timeout.
  - **Answer:** `{ results: [{ kind: 'visually_similar', organizationId, businessName, catalogItemId, name, priceAmount, priceCurrency, onRequest, imagePath, matchedImagePath }], total, scope: 'all'|'subset', indexed }`.
  - **Errors:** `IMAGE_TOO_LARGE` 413, `IMAGE_UNSUPPORTED` 415, `IMAGE_INVALID` / `IMAGE_TOO_SMALL` / `BAD_FILTER` 400, `MODEL_UNAVAILABLE` 503, `BUSY` / `RATE_LIMITED` 429, `TIMEOUT` 504.
  - **No position:** the phone never sends one. It sends business ids when its own filters (category, open, nearby) are on, and computes distance itself.
- **The photo:** kept in memory only; not written to disk, not logged, not stored, not added to any public place. The app sends a cropped copy, at most 640 px, re-encoded through a canvas, so no EXIF (place, device, time) leaves the phone.

## Setup and commands

Configuration (in the API's environment; see `visual.env.example`):

```text
VISUAL_MODEL_DIR=/opt/mlino/models/dinov2-small/8b1f705   # outside git; enables the feature
VISUAL_MEDIA_ROOT=/var/www/mlino-public-export            # holds media/sha256/…; default: the catalog file's directory
VISUAL_MIN_SIMILARITY=0.5                                 # see «Threshold»
VISUAL_THREADS=1                                          # CPU threads for the model
```

```text
# once (the only step that needs the internet): download, verify SHA-256, move into place
node dist/http/api/main.js visual-model-fetch /opt/mlino/models/dinov2-small/8b1f705
# backfill the published catalog (idempotent; safe to run again)
node dist/http/api/main.js visual-index
# quality evaluation (optional folder of extra photos: <catalog_item_id>__x.jpg or none__x.jpg)
node dist/http/api/main.js visual-eval [folder]
```

- **Offline:** after `visual-model-fetch` the server needs no internet: the model is read from `VISUAL_MODEL_DIR`.
- **Missing model:** without `VISUAL_MODEL_DIR` the routes answer 404. With the directory but no valid file, `/status` reports `missing` or `error` and search answers 503 `MODEL_UNAVAILABLE` (never made-up results).
- **Not in git:** weights and user photos are never in git.

**Rollback (safe):**

1. Remove `VISUAL_MODEL_DIR` from the environment and restart. The routes switch off, the app shows «جست‌وجو با عکس روی این نسخه فعال نیست» and everything else is untouched.
2. To remove the data too: `DROP TABLE visual_image_embeddings, visual_image_refs;` in the module database. These tables are only this module's; no Core or V1 table is changed.
3. The two npm packages can be removed from `package.json`.

## Threshold

`visual-eval` on the demo catalog, run on 2026-09-26 on the owner's Windows PC:

- **Catalog:** 25 images; 39 item-image links.
- **Queries:** each image in 5 altered views: 60 % centre crop, 15° rotation, small on a new background, darker/warmer/blurred, mirrored low-res.

| Measure | Result |
|---|---|
| Own product first | 125 / 125 (top-3: 125 / 125) |
| Own-product similarity | min 0.609 · p10 0.809 · median 0.935 |
| Best product of another item group | median 0.402 · p90 0.692 · max 0.887 (e.g. two coffee cups genuinely look alike) |
| Non-product images (flat colours, noise, checkerboard, gradient, and the project's own logo/icons/share image) | max 0.152 · median ≈ 0.10 |

Default **0.5**: in the gap between the highest non-product score (0.152) and the lowest own-product score (0.609). It keeps products of other groups that look alike, which is what «از نظر ظاهر مشابه» means.

**Limits of this evidence:**

- These are altered versions of the catalog photo itself. No real second photo (another day, angle or background) of the demo products exists, so real-world recall is not measured.
- Real unrelated photos (e.g. a shoe against a food catalog) were not available (no images from the internet). The project's own graphics are the only real non-product photos used.
- Re-run `visual-eval` with a folder of real photos when real businesses and products arrive, and tune `VISUAL_MIN_SIMILARITY`.

## Resources observed (only what was measured)

| Where | Measured |
|---|---|
| Owner's Windows PC (Node 24) | Model load ≈ 0.6 s; one inference ≈ 0.23 s after the first; full HTTP search (validate + embed + rank 39 entries) 0.62–0.85 s; backfill of 25 images a few seconds |
| Demo VPS (2 vCPU, 3.9 GB RAM, ~1.9 GB free, 14 GB disk free) | **Not run yet** (no deployment without the owner's request) |
| Disk | Model 88.5 MB; `onnxruntime-node` package ~300 MB unpacked (binaries for all platforms); `sharp` ~1 MB plus its libvips binary |
| Memory | Not measured on the VPS; measure `systemctl status mlino-api` memory after enabling |

**Cost:** no paid service. The model runs on the existing VPS CPU. The only cost is CPU time per search and the RAM of one loaded model.
