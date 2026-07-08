# video-intro-remotion

Remotion compositor for Athena intro/wrap-up videos. Consumes a manifest (see `../video-intro/reference/brief.schema.json`) and renders 1280×720 MP4. White-line-on-black aesthetic; captions and math overlays are KaTeX-rendered in code.

## Quick start

```bash
cd video-intro-remotion
npm install
npm run render:ex1          # → out/ex1.mp4 (uses manifests/ex1-stub.json)
npm run dev                 # Remotion Studio
```

QA gate (dead frames while audio is active):

```bash
python3 scripts/qa_gate.py out/ex1.mp4 --report out/ex1.qa.json
python3 scripts/qa_gate.py out/ex1.mp4 --verbose   # per-second table
```

Full pipeline (brief → TTS → manifest → render → QA): `agents/video_intro/` (`python -m video_intro generate …`).

## Layout

```
src/
  IntroVideo.tsx       beat router → primitives + overlays
  Root.tsx             default composition (ex1-stub manifest)
  primitives/          wireframe + AI-authored code-tier visuals
  overlays/            caption / math / label / callout layers
manifests/
  ex1-stub.json        canonical slope example (Remotion Studio default)
  algebra_linear.json  balance-scale intro sample
  linear_eq_two_var_wrapup.clean.json  wrap-up using linear_hill_story
scripts/
  brief_to_manifest.py brief → wrapped manifest JSON
  qa_gate.py           brightness + audio-alignment QA
public/                staged audio for staticFile()
out/                   rendered MP4s + .qa.json sidecars (gitignored)
```

## Regenerate ex1-stub

```bash
python3 scripts/brief_to_manifest.py \
  --brief ../video-intro/reference/ex1/brief/brief.json \
  --audio ../video-intro/reference/ex1/audio/ex1.mp3 \
  --out manifests/ex1-stub.json
```

Wrap-up manifests for in-app playback should use `--strip-captions` so the live TTS tutor is not duplicated on screen.
