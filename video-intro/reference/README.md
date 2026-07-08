# Video Intro — Reference

Ground-truth assets for the intro/wrap-up video pipeline. The Remotion renderer lives in `video-intro-remotion/`; the Python orchestrator is `agents/video_intro/`.

## Layout

```
reference/
├── brief.schema.json       Brief contract (v0.1.0) — mirrored in agents + Remotion types
└── ex1/
    ├── audio/ex1.mp3       Reference narration for the canonical slope example
    └── brief/brief.json    Hand-authored brief the pipeline must be able to render
```

## Canonical example (ex1)

Linear equations / slope — white linework on black, wireframe terrain. Math locked in `ex1/brief/brief.json` (`y = 1.75x`, `y = 0.65x`, `m = 0.65`). The rendered manifest stub is `video-intro-remotion/manifests/ex1-stub.json`.

Regenerate the stub:

```bash
cd video-intro-remotion
python3 scripts/brief_to_manifest.py \
  --brief ../video-intro/reference/ex1/brief/brief.json \
  --audio ../video-intro/reference/ex1/audio/ex1.mp3 \
  --out manifests/ex1-stub.json
```

## Pipeline outputs

Generated briefs, manifests, and MP4s are written by `python -m video_intro` into `--out` (typically `video-intro-remotion/out/`) and staged manifests under `video-intro-remotion/manifests/`. Do not commit transient `generated/` copies at the repo root.

## Downstream

- **Brief generator** (`agents/video_intro/brief_generator.py`) emits JSON conforming to `brief.schema.json`.
- **Remotion** (`video-intro-remotion/`) consumes brief → manifest → MP4. Captions and math overlays are compositor-rendered, never baked by a video model.
- **QA gate** (`video-intro-remotion/scripts/qa_gate.py`) enforces `qa_constraints` (dead frames, audio/visual alignment).
