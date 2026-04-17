# common

Cross-cutting services used by both [faceIQ](../faceIQ/) and [visionIQ](../visionIQ/).

```
common/
├── vision-core/       # Python ML sidecar (FastAPI)       :4002
└── shared-storage/    # Shared filesystem mount for images, videos, thumbnails, trash
```

## vision-core — Python ML sidecar

FastAPI service exposing face detection, alignment, embeddings, and clustering over HTTP. Consumed by `faceIQ/node-backend-faceIQ` when an org picks `INSIGHTFACE` as the face recognition provider or asks for HDBSCAN clustering. The Prisma schema default is `COMPREFACE`, but InsightFace via vision-core is the zero-dependency path — no Java stack required.

### Models & detectors

| Model | File | Source |
|---|---|---|
| YuNet (fast frontal detection) | `face_detection_yunet_2023mar.onnx` | OpenCV Zoo |
| SCRFD (robust detection for hard angles) | `scrfd_10g_bnkps.onnx` | HuggingFace |
| InsightFace `buffalo_l` (ArcFace embeddings + age/gender/pose) | auto-downloaded on first use (~326 MB) | InsightFace |
| HDBSCAN | Python `hdbscan` + `sklearn.preprocessing.normalize` | lazy-imported |

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness + which detectors are loaded |
| POST | `/detect/yunet` | Fast face detection |
| POST | `/detect/scrfd` | Robust face detection |
| POST | `/align` | Face alignment via 5-point landmarks, 112×112 crop |
| POST | `/insightface/detect` | Detection only |
| POST | `/insightface/embed` | 512-dim embedding from an already-cropped face |
| POST | `/insightface/detect-and-embed` | All-in-one — detect, align, embed, estimate age / gender / pose |
| POST | `/cluster/hdbscan` | HDBSCAN on a batch of embeddings |

### Run it

```bash
cd vision-core
docker compose up -d        # → http://localhost:4002
# or natively
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 4002
```

Source: [vision-core/main.py](vision-core/main.py), detectors in [vision-core/detectors.py](vision-core/detectors.py), alignment in [vision-core/alignment.py](vision-core/alignment.py), InsightFace wrapper in [vision-core/insightface_service.py](vision-core/insightface_service.py). Models live under [vision-core/models/](vision-core/models/).

## shared-storage

A plain filesystem directory mounted into services that need access to the same images / videos / derived artifacts. No code, no API — just a path convention that each service prefixes with its own layout:

```
common/shared-storage/
├── _trash/                  # soft-deleted event directories (used by event-cleanup queue)
└── hello                    # (placeholder marker file)
```

Services that write here today:
- [photography/node-backend-photography](../photography/node-backend-photography/) — stores original uploads, thumbnails, and moves deleted events to `_trash/`
- [faceIQ/node-backend-faceIQ](../faceIQ/node-backend-faceIQ/) — reads images in `SHARED_STORAGE` image-source mode (configurable per org via `imageSourceMode`)

Keep this path consistent across dev + prod — mount it into containers at the same absolute path so the service configs (`UPLOAD_DIR`, `sharedStoragePath`) remain portable.
