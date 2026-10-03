# Koyuki WebAR — Implementation Plan

---

# >>> AGENT HANDOFF / PROGRESS LOG (read this first, keep it updated) <<<

_Last updated: 2026-10-03 by the first agent session._

## Current status at a glance

| Phase | Status |
|---|---|
| 1. Repository reconnaissance | DONE |
| 2. Obtain/validate `Koyuki.glb` | DONE |
| 3. 3D preview (`<model-viewer>`) | DONE (desktop headless Chrome verified) |
| 4. AR entry point | CODE DONE, **not tested on a real device** |
| 5. GitHub Pages + HTTPS | **BLOCKED — needs the user** (see below) |
| 6. Local development | DONE |
| 7. Mobile UI | DONE in code (layout checked at 500px headless width only) |
| 8. First real-device Android test | **NOT DONE — needs user + deployed HTTPS URL** |
| 9-14. Scale, shadows, animation, interaction, perf | NOT STARTED (shadow attribute already set, untested in AR) |
| 13. Error handling | Mostly implemented in `app.js` (load error, AR unavailable, AR failed/camera). Untested on real device |
| 15-17. A11y, hygiene, final test | Partially (alt text, labels done); final deployment test NOT DONE |

## Next steps for the next agent

1. **Deployment (Phase 5) is the blocker.** `E:\Koyuki-AR` is NOT a git repository and has no remote, and it contained only `tasks.md` at the start. The user said to use their *existing* GitHub Pages project, but no such repo is present on disk. Ask the user for: the repo URL (or clone it) and whether Pages publishes from a branch/folder or from Actions. Then copy/integrate `index.html`, `style.css`, `app.js`, `models/Koyuki.glb` into it **without touching their existing files** (if the repo already has an `index.html`, put this feature under a subfolder such as `ar/`; all asset paths in the files are relative, so moving the whole set into a folder works unchanged). `tools/` is optional dev tooling and need not be deployed.
2. After deployment: verify no 404s on the Pages URL (HTML, CSS, JS, GLB), then ask the user to test on a real Android phone over HTTPS (Phase 8). Record results using the template in Task 8.2.
3. Only after AR placement works: Phase 9 (scale/orientation), Phase 10 (shadows), Phase 11-12 (animation) — see notes below.

## Phase reports

### Phase 1 — Repository reconnaissance (DONE)

```text
Phase: 1
Files changed: none
Findings:
  - Root E:\Koyuki-AR contained only tasks.md. Not a git repo (no .git, no remote), no package.json,
    no HTML/CSS/JS, no router, no Pages workflow.
  - Therefore there is no existing Pages config to preserve and no existing entry point.
  - Decision: minimal static site at the repo root (index.html + style.css + app.js + models/).
    No build system, no framework, no backend, no package.json.
  - If the user's real Pages repo turns out to already have content, relocate this set into a subfolder (see Next steps).
Next phase: 2
```

### Phase 2 — Koyuki.glb (DONE)

```text
Phase: 2
Files changed: models/Koyuki.glb (new, 6,938,676 bytes), tools/inspect-glb.mjs (new, dependency-free inspector)
What was implemented:
  - Downloaded from https://raw.githubusercontent.com/lihaohong6/BlueArchiveModels/main/Koyuki.glb
    (raw form of the blob URL in Task 2.1). The app only references the local relative copy.
Tests performed:
  - Magic bytes 'glTF', version 2, declared length == file size (valid GLB).
  - `node tools/inspect-glb.mjs models/Koyuki.glb` (re-runnable).
Verified GLB facts (do not re-guess these):
  - generator: blue-archive model_viewer/export_models.py; glTF 2.0; no extensions used/required
  - 147 nodes, 14 meshes, 4 skins, 17 materials, 15 textures/images (ALL embedded, no external files), 1 buffer (5,286,796 B)
  - Materials use OPAQUE and MASK alpha modes; all doubleSided
  - 24 animations (exact names, verified again at runtime via model-viewer `availableAnimations`):
      Cafe_Reaction, Cafe_Idle, Cafe_Walk, Formation_Idle, Formation_Pickup, Exs_Cutin, Exs,
      Victory_End, Victory_Start, Normal_Idle, Normal_Attack_Delay, Normal_Attack_End,
      Normal_Attack_Ing, Normal_Attack_Start, Normal_Callsign1, Normal_Callsign2, Normal_Reload,
      Move_End_Normal, Move_Ing, Vital_Death, Vital_Dying_ing, Vital_Panic, Vital_Retreat, Public01
  - Static bind-pose bbox from accessors (x,y,z): about 0.96 x 1.26 x 1.35 (glTF units = meters). It is
    inflated by the weapon mesh (`CH0198_Weapon`), which in the bind pose lies far to the character's side.
    model-viewer's own getDimensions() reported about 1.77 x 1.11 x 0.52 (x,y,z) at runtime.
    The character body itself is chibi-proportioned (roughly 0.5-0.6 m tall by eye) -> confirm in Phase 9.
Known limitations: dimensions are approximate (un-skinned/bind pose).
Next phase: 3
```

### Phases 3, 4, 6, 7 (+ part of 13, 15) — Viewer, AR entry, local dev, mobile UI (CODE DONE)

```text
Phase: 3/4/6/7
Files changed: index.html, style.css, app.js (all new)
What was implemented:
  - <model-viewer id=koyuki src="models/Koyuki.glb"> with alt, camera-controls, touch-action="pan-y",
    shadow-intensity=1, ar, ar-modes="webxr scene-viewer quick-look", ar-placement="floor".
  - Pinned to model-viewer 4.0.0 from ajax.googleapis.com. (4.3.1 also exists on that CDN but spams
    '[$updateSource]' debug logs to the console, so 4.0.0 was chosen. Don't bump without re-checking.)
  - Slotted button "View Koyuki in AR" (slot=ar-button, 48px min height, floats at bottom of viewer);
    model-viewer hides it automatically when AR is unavailable.
  - Loading overlay "Loading Koyuki..." with progress bar; load-error overlay with the exact Task 13.1 text
    + Reload button; console.error logs the technical error. 15s guard if the CDN script never registers.
  - After `load`, app.js polls `viewer.canActivateAR` for up to 3s; if false it shows
    "AR is not available on this device/browser. You can still view Koyuki in 3D." and hides the AR steps.
  - `ar-status` 'failed' shows a camera-permission explanation (no automatic re-request).
  - The 4-step AR instructions (Task 7.2) are shown only when AR is available.
  - Mobile-first CSS: 100dvh column, safe-area insets, no horizontal overflow.
  - Favicon is an inline data URI to avoid a 404 on /favicon.ico.
  - All asset paths are relative (works under https://OWNER.github.io/REPO/).
Tests performed (all on desktop, headless Chrome with SwiftShader WebGL, http://127.0.0.1:8000):
  - Served with `python -m http.server 8000` (no file://). Run it from the project root.
  - GLB request 200, model rendered with textures; upright and front-facing in the default view.
  - Via Chrome DevTools Protocol: loaded=true, loading overlay hidden, error overlay hidden,
    canActivateAR=false -> unavailable notice shown (correct on desktop), 24 animations listed,
    no JS exceptions, no failed requests (after favicon fix), scrollWidth == innerWidth at 500px.
NOT tested: real touch interaction, real phone viewport/browser chrome, any AR session, camera permission flow.
Known limitations / observations:
  - In the static (no animation) pose, the weapon floats beside the character and widens the framing/bbox.
    This may look odd in AR. See Phase 11 notes.
  - The headless screenshot tool has a minimum window width, so a true 390px layout was not visually verified.
Next phase: 5 (blocked on user) then 8.
```

## Notes for Phase 9 / 11 (not yet implemented, deliberately)

- Phase 11 inspection is already done (names above). In a headless test, `autoplay animation-name="Normal_Idle"`
  played correctly and put the weapon in the character's hands, which looks far better than the bind pose.
  `Normal_Idle` and `Cafe_Idle` are the candidate idle animations (names contain 'Idle'; the "suitable" judgement
  still needs a visual check). It was NOT added to the page, because the plan says not to touch animation before
  AR placement works on a real device. When adding, also verify it does not shift the model off its anchor in AR
  (root-motion), and note that Scene Viewer / Quick Look may ignore or handle animations differently from WebXR.
- Phase 9: `ar-scale` is not set (default, 1:1 with glTF meters). Check real size in AR before tuning.

## Environment notes

- Windows, default shell is sh (Git Bash). Node v24.14.0 and Python 3.12.6 are available.
- Chrome is at `C:\Program Files\Google\Chrome\Application\chrome.exe` (usable headless with
  `--use-angle=swiftshader --enable-unsafe-swiftshader` for WebGL).
- Background processes started in one terminal call are killed when the call ends; start the server and the
  test client in the same command.
- The `edit_file` tool failed to match a line in `index.html` once; `sed -i` worked as a fallback.

---

## 0. Project definition

### Goal

Build a zero-cost hobby WebAR application that:

1. Runs from the user's GitHub Pages project.
2. Loads `Koyuki.glb`.
3. Shows a browser-based 3D preview.
4. Lets a compatible Android phone enter AR.
5. Uses the phone's AR capabilities to detect a real-world surface.
6. Lets the user place Koyuki on that surface.
7. Keeps Koyuki anchored while the user moves the phone.
8. Provides a clean mobile UI.
9. Does **not** require Android Studio, Kotlin, Java, Gradle, an Android SDK, an APK, a backend, or a paid hosting service.

### Initial technical approach

Use:

- HTML
- CSS
- vanilla JavaScript
- `<model-viewer>`
- GLB
- GitHub Pages
- HTTPS

Do **not** start with three.js, A-Frame, Unity, or a native Android application.

`<model-viewer>` is specifically intended for displaying interactive 3D models on the web and entering AR. Its current documentation provides browser/AR support information and examples.

### Source model

Primary model:

```text
Koyuki.glb
```

Repository:

```text
https://github.com/lihaohong6/BlueArchiveModels
```

The exact model path is:

```text
Koyuki.glb
```

Do not substitute another Koyuki model.

### Hosting

Use the user's already-existing GitHub Pages project.

Do not create a second repository unless the existing project is proven unsuitable.

Do not change the existing repository's unrelated files or functionality.

GitHub Pages supports publishing a static site from an existing repository and supports HTTPS.

---

# 1. Agent operating rules

These rules apply to every task below.

## 1.1 Inspect before modifying

Before changing anything:

- inspect the repository structure;
- identify the existing GitHub Pages entry point;
- identify the current branch and publishing source if available;
- identify existing HTML/CSS/JS;
- identify whether the repository already has a build system;
- identify whether `package.json` exists;
- identify whether there are existing site routes/assets.

Do not assume the repository is empty.

## 1.2 Preserve existing functionality

The existing GitHub Pages project belongs to the user.

Therefore:

- do not delete existing pages;
- do not replace the existing application wholesale;
- do not rename unrelated files;
- do not introduce a framework unless necessary;
- do not remove existing dependencies;
- do not modify unrelated UI;
- do not rewrite configuration that is already working.

Prefer the smallest implementation that integrates with the existing project.

## 1.3 No invented model properties

Do not assume:

- animation names;
- skeleton names;
- material names;
- texture names;
- model dimensions;
- coordinate orientation;
- model scale;
- number of animations.

Inspect the actual GLB when possible.

If a property cannot be verified, do not invent it.

## 1.4 No invented AR capabilities

Do not claim that every browser/device supports every AR mode.

Detect supported functionality at runtime where possible.

The application must degrade gracefully if AR is unavailable.

## 1.5 Do not add a backend

There is no server-side component in MVP.

Do not add:

- Node backend;
- Express;
- database;
- API;
- authentication;
- server-side model processing.

The application is static.

## 1.6 Avoid unnecessary dependencies

For MVP, use:

- `<model-viewer>` from its official CDN;
- vanilla JS;
- vanilla CSS.

Do not install a JavaScript framework.

Do not install three.js unless a later task explicitly requires functionality that `<model-viewer>` cannot provide.

## 1.7 Do not use Android Studio

Android Studio is explicitly out of scope.

Do not add:

- Gradle;
- Android Manifest;
- Kotlin;
- Java;
- Android SDK;
- APK generation.

---

# 2. Target architecture

Expected MVP structure, adapted to the existing repository:

```text
existing-project/
├── existing files...
│
├── index.html                 # existing entry point, if applicable
├── ar/
│   ├── index.html             # AR page if integration is cleaner as a separate page
│   ├── style.css
│   └── app.js
│
└── models/
    └── Koyuki.glb
```

This is an example, not a mandatory structure.

The agent must first inspect the existing repository and choose the least disruptive structure.

If the current project is already a single-page app, integrate the AR feature into the existing architecture instead of creating an unnecessary second page.

---

# 3. Phase 1 — Repository reconnaissance

## Task 1.1 — Inspect repository

### Subtasks

- List the repository root.
- Inspect existing HTML files.
- Inspect CSS.
- Inspect JS/TS.
- Inspect `package.json`, if present.
- Inspect GitHub Pages configuration/workflows.
- Identify the current site entry point.
- Identify whether a router is already used.
- Identify existing asset directories.
- Identify existing styling conventions.

### Acceptance criteria

A short implementation note exists identifying:

- entry point;
- relevant existing files;
- build/deployment mechanism;
- appropriate location for the AR feature;
- appropriate location for `Koyuki.glb`.

### Do not

Do not modify source files during reconnaissance.

---

# 4. Phase 2 — Obtain and validate Koyuki.glb

## Task 2.1 — Add the exact model

Use:

```text
Koyuki.glb
```

from:

```text
https://github.com/lihaohong6/BlueArchiveModels/blob/main/Koyuki.glb
```

Place a local copy in the project's model/assets directory.

Do not hotlink the GitHub `blob` URL from the application.

Prefer a repository-local asset:

```text
models/Koyuki.glb
```

or the equivalent existing asset directory.

## Task 2.2 — Verify the file

Verify:

- file exists;
- filename matches the actual reference used by the application;
- path is case-correct;
- browser can request the file;
- file is not accidentally stored as an HTML GitHub page;
- file is a valid GLB.

If tooling is available, inspect:

- GLB metadata;
- mesh count;
- material count;
- animation list;
- approximate dimensions;
- embedded/external textures.

### Acceptance criteria

The local application can load the GLB from a relative URL.

No GitHub raw URL is required at runtime.

---

# 5. Phase 3 — Build the 3D preview

## Task 3.1 — Add `<model-viewer>`

Use the official `<model-viewer>` component.

Use a pinned CDN version rather than an unpinned URL.

The implementation must include:

- `src`;
- `alt`;
- `camera-controls`;
- `touch-action`;
- appropriate sizing;
- a visible loading state.

Example conceptual configuration:

```html
<model-viewer
    src="../models/Koyuki.glb"
    alt="Koyuki 3D model"
    camera-controls
    touch-action="pan-y">
</model-viewer>
```

The actual relative path must match the repository structure.

## Task 3.2 — Verify normal 3D rendering

Test on desktop first.

Verify:

- model appears;
- model is not invisible;
- textures/materials appear;
- camera controls work;
- no console error prevents rendering;
- model does not exceed the viewport;
- page remains usable on mobile dimensions.

### Acceptance criteria

The Koyuki model can be rotated/zoomed in the browser before AR is attempted.

---

# 6. Phase 4 — Add AR entry point

## Task 4.1 — Enable AR

Add the `<model-viewer>` AR functionality.

Use an AR configuration that supports the intended compatible Android paths.

The implementation should initially use:

```text
ar
```

and an appropriate `ar-modes` configuration.

Do not assume that WebXR is universally available.

## Task 4.2 — AR button

Provide a clear button such as:

```text
View Koyuki in AR
```

Do not rely on a hidden or unexplained icon.

The button must:

- be large enough for touch;
- remain visible over the model viewer;
- have adequate contrast;
- be disabled/hidden when AR is unavailable if the component can determine that state;
- not claim AR is supported when it is not.

## Task 4.3 — AR unavailable state

Provide a useful fallback:

```text
AR is not available on this device/browser.
You can still view Koyuki in 3D.
```

Do not show a broken AR button indefinitely.

### Acceptance criteria

On a compatible Android device, tapping the AR control enters the available AR flow.

On an incompatible browser/device, the 3D viewer remains usable.

---

# 7. Phase 5 — GitHub Pages and HTTPS

## Task 5.1 — Preserve existing Pages configuration

Inspect the existing GitHub Pages configuration.

Do not change it unless required.

Possible publishing mechanisms include:

- branch/folder publishing;
- GitHub Actions.

Use whichever the existing repository already uses.

## Task 5.2 — Verify HTTPS

The deployed URL must use HTTPS.

Do not create a custom domain.

Do not purchase anything.

Do not introduce a third-party hosting service.

GitHub Pages provides HTTPS for Pages sites, including `github.io` sites.

## Task 5.3 — Relative asset paths

GitHub Pages project sites commonly live under:

```text
https://OWNER.github.io/REPOSITORY/
```

Therefore, do not blindly use root-relative paths such as:

```text
/models/Koyuki.glb
```

unless the existing project architecture proves that this is correct.

Prefer paths compatible with the repository's actual base path.

Test the deployed URL rather than only testing `localhost`.

### Acceptance criteria

The deployed site successfully loads:

- HTML;
- CSS;
- JavaScript;
- `Koyuki.glb`.

No asset returns 404 on GitHub Pages.

---

# 8. Phase 6 — Local development

## Task 6.1 — Provide a local server

If the existing project has a development server, use it.

Otherwise use the simplest appropriate static server.

Possible options:

```bash
python -m http.server 8000
```

or the existing project's development command.

Do not add a new server dependency solely for this.

## Task 6.2 — Test locally

Verify:

- no file protocol (`file://`) is required;
- GLB loads;
- no CORS error;
- no JavaScript exception;
- no broken asset paths.

### Important

Local desktop rendering is not proof that phone AR works.

Phone AR must be tested on the deployed HTTPS site.

---

# 9. Phase 7 — Mobile UI

## Task 7.1 — Responsive layout

The AR interface must work primarily in portrait orientation.

Requirements:

- full-width model viewer;
- viewport-safe controls;
- touch-friendly controls;
- no horizontal scrolling;
- no tiny buttons;
- no important UI hidden behind browser chrome.

## Task 7.2 — AR instructions

Before entering AR, show concise instructions:

```text
1. Tap "View in AR".
2. Move your phone slowly to scan the floor.
3. Tap a detected surface to place Koyuki.
4. Move around her to view her from different angles.
```

Do not promise capabilities the selected AR mode does not expose.

## Task 7.3 — Loading state

Show:

```text
Loading Koyuki...
```

while the GLB is loading.

Do not freeze the entire page without feedback.

---

# 10. Phase 8 — First real-device test

## Task 8.1 — Android test

Use a compatible Android phone/browser.

Open the actual HTTPS GitHub Pages URL.

Test:

1. Page loads.
2. Koyuki loads.
3. AR button appears when supported.
4. AR session starts.
5. Camera permission is handled normally.
6. Environment scanning works.
7. A horizontal surface can be selected.
8. Koyuki appears.
9. Koyuki remains anchored while the phone moves.
10. User can exit AR.

## Task 8.2 — Record failures

For every failure record:

```text
Device:
OS:
Browser:
URL:
Expected:
Actual:
Console error:
Screenshot/video if useful:
```

Do not randomly change implementation after a failure.

First determine whether it is:

- asset problem;
- browser limitation;
- AR support limitation;
- deployment/path problem;
- JavaScript error;
- model scale/orientation problem;
- `<model-viewer>` configuration problem.

---

# 11. Phase 9 — Model scale and placement

Only perform this phase after basic AR placement works.

## Task 9.1 — Determine model scale

Do not guess the desired scale from the file.

Inspect the actual model dimensions if possible.

Establish a sensible human-character scale.

If the model's source scale is unsuitable, use the appropriate `<model-viewer>` scale/transform configuration.

## Task 9.2 — Prevent absurd initial scale

The initial AR experience should present Koyuki at a sensible size.

Avoid making her:

- microscopic;
- room-sized;
- underground;
- floating several meters above the surface.

## Task 9.3 — Verify orientation

Check:

- feet point toward the detected surface;
- character is upright;
- front/back orientation is sensible.

Do not rotate the model merely because it looks wrong in one desktop camera view; inspect the actual model coordinate orientation first.

---

# 12. Phase 10 — Shadows and visual grounding

After placement works:

## Task 10.1

Enable model shadows using `<model-viewer>`'s supported shadow settings.

## Task 10.2

Test:

- indoor floor;
- outdoor floor;
- bright room;
- dark room.

The goal is visual grounding, not photorealistic rendering.

Do not add complex custom lighting unless the default result is inadequate.

---

# 13. Phase 11 — Animation investigation

This phase must begin with inspection.

## Task 11.1 — Enumerate animations

Inspect the actual GLB.

Record the exact animation names.

For example:

```text
Animations:
- <actual name>
- <actual name>
```

Do not invent names such as:

```text
Idle
Walk
Wave
```

unless the GLB actually contains them.

## Task 11.2 — Test an animation

If an animation exists:

- select one verified animation;
- test it in the browser;
- verify it does not break AR;
- verify it does not cause the model to move away from its anchor unexpectedly.

## Task 11.3 — Idle animation

If the model contains a suitable idle animation, use it.

If it does not, leave the character static.

Do not fabricate or procedurally create an animation in MVP.

---

# 14. Phase 12 — Interaction

This is optional after the core AR MVP is stable.

## Task 12.1 — Basic interaction

Possible interaction:

```text
Tap Koyuki
    ↓
play verified animation
```

Only implement this if the GLB contains an appropriate animation.

## Task 12.2 — UI controls

If animations exist, controls may be added:

```text
[ Idle ] [ Animation 1 ] [ Animation 2 ]
```

Generate the buttons from the verified animation list rather than hardcoding nonexistent names.

---

# 15. Phase 13 — Error handling

## Task 13.1 — Model loading error

If the GLB fails:

Show:

```text
Koyuki could not be loaded.
Please check your connection and reload the page.
```

Log the technical error to the console.

## Task 13.2 — AR unavailable

Show:

```text
AR is not available on this device/browser.
```

Keep 3D preview available.

## Task 13.3 — Camera permission denial

Do not repeatedly request permission.

Give a clear explanation that camera permission is required for AR.

## Task 13.4 — Deployment failure

If assets fail on GitHub Pages:

- inspect Network tab;
- inspect exact requested URL;
- check capitalization;
- check repository base path;
- check whether the file was actually committed;
- check Pages deployment status.

Do not "fix" the issue by copying the model to random directories without understanding the path problem.

---

# 16. Phase 14 — Performance

Only optimize after functionality works.

## Task 14.1 — Measure before optimizing

Record:

- GLB file size;
- approximate load time;
- whether the phone drops frames;
- whether AR startup is slow.

Do not optimize based solely on assumptions.

## Task 14.2 — First optimization

If performance is poor:

1. inspect model geometry;
2. inspect texture sizes;
3. determine whether the model contains unnecessary data;
4. consider GLB compression/optimization.

Do not modify the source model destructively without retaining the original.

## Task 14.3 — Keep original asset

Maintain:

```text
Koyuki.glb
```

as the original source asset.

If an optimized copy is created, use a clearly named derived asset, for example:

```text
Koyuki.optimized.glb
```

Only switch the application to it after validating visual correctness.

---

# 17. Phase 15 — Accessibility and basic UX

## Task 15.1

Ensure:

- buttons have readable labels;
- buttons have sufficient touch area;
- model has meaningful `alt` text;
- loading/error messages are readable;
- UI does not rely exclusively on color;
- page remains usable without AR.

## Task 15.2

Do not make AR the only way to access the model.

The 3D viewer is the fallback.

---

# 18. Phase 16 — Security and repository hygiene

## Task 16.1

Do not commit:

- API keys;
- secrets;
- credentials;
- local machine paths;
- private tokens.

There should be no secrets in this static project.

## Task 16.2

Remember that GitHub Pages content is publicly accessible.

Do not place private information in the repository.

## Task 16.3

Do not create unnecessary GitHub Actions.

For a static site, use the repository's existing Pages publishing mechanism unless a build step is genuinely required.

---

# 19. Phase 17 — Final deployment test

Test the deployed URL, not only localhost.

## Desktop

Verify:

- page loads;
- model loads;
- camera controls work;
- no console errors;
- responsive layout works.

## Android

Verify:

- HTTPS works;
- model loads;
- AR button appears when supported;
- camera starts;
- surface detection works;
- placement works;
- anchor remains stable;
- exiting AR works;
- 3D fallback works.

## GitHub Pages

Verify:

- deployment succeeds;
- no 404 for model;
- no 404 for CSS/JS;
- no mixed-content errors;
- latest commit is deployed.

---

# 20. MVP definition of done

The project is considered MVP-complete only when all of the following are true:

- [ ] Existing GitHub Pages project remains functional.
- [x] `Koyuki.glb` is stored locally in the repository.
- [x] Browser can render Koyuki as a 3D model. (desktop headless Chrome only)
- [ ] User can rotate/zoom the model.
- [ ] Mobile layout works.
- [ ] AR entry point is available on a compatible Android device.
- [ ] Camera permission flow works.
- [ ] User can scan a surface.
- [ ] User can place Koyuki.
- [ ] Koyuki remains anchored while the user moves.
- [ ] User can exit AR.
- [x] AR-unavailable devices still receive a usable 3D viewer. (verified on desktop where AR is unavailable)
- [ ] Site works over HTTPS on GitHub Pages.
- [x] No Android Studio is required.
- [x] No paid service is required.
- [x] No backend is required.
- [x] No invented animation/model properties are used.
- [ ] No unrelated existing project functionality has been removed.

---

# 21. Explicit out-of-scope items for MVP

Do NOT implement these unless explicitly requested later:

- native Android application;
- APK;
- Android Studio;
- Unity;
- Unreal Engine;
- backend;
- user accounts;
- database;
- multiplayer;
- AI/chatbot;
- voice interaction;
- GPS;
- persistent world anchors;
- occlusion;
- advanced environmental meshing;
- physics;
- multiple characters;
- custom shaders;
- facial tracking;
- body tracking;
- hand tracking;
- automatic character navigation;
- complex animation authoring;
- payment systems;
- analytics.

---

# 22. Upgrade path after MVP

Only after MVP works:

## Upgrade A — animations

Use the actual animations contained in `Koyuki.glb`.

## Upgrade B — interaction

Tap Koyuki to trigger an existing animation.

## Upgrade C — better visual grounding

Improve:

- shadows;
- lighting;
- environment;
- exposure.

## Upgrade D — custom WebXR

If `<model-viewer>` becomes limiting, evaluate three.js + WebXR.

Reasons that could justify moving away from `<model-viewer>`:

- custom hit-testing behavior;
- custom placement UI;
- multiple objects;
- custom animation systems;
- custom rendering;
- advanced interaction;
- custom occlusion/scene effects.

Do not migrate merely because three.js is more powerful.

---

# 23. Required implementation order

The coding agent must follow this order unless a concrete repository constraint requires otherwise:

```text
1. Inspect repository
        ↓
2. Identify existing Pages/deployment structure
        ↓
3. Add Koyuki.glb
        ↓
4. Validate GLB
        ↓
5. Add model-viewer
        ↓
6. Make desktop 3D preview work
        ↓
7. Add AR entry point
        ↓
8. Deploy through existing GitHub Pages
        ↓
9. Test on real Android device
        ↓
10. Fix deployment/device issues
        ↓
11. Tune scale/orientation
        ↓
12. Add shadows
        ↓
13. Inspect actual GLB animations
        ↓
14. Add animation controls only if supported
        ↓
15. Final regression test
```

Do not jump directly to animation or custom WebXR before basic placement works.

---

# 24. Agent reporting requirements

After each major phase, report:

```text
Phase:
Files changed:
What was implemented:
Tests performed:
Result:
Known limitations:
Next phase:
```

For failures:

```text
Failure:
Observed behavior:
Expected behavior:
Evidence:
Likely cause:
Change attempted:
Result:
```

Do not report "working" merely because the code compiles.

For AR specifically, "working" requires real-device testing or an explicitly documented reason why real-device testing could not be performed.

---

# 25. Final expected user experience

The finished MVP should behave approximately as follows:

```text
Open GitHub Pages URL
        ↓
┌───────────────────────────┐
│       Koyuki 3D           │
│                           │
│       [model]             │
│                           │
│    [ View in AR ]         │
└───────────────────────────┘
        ↓
Tap View in AR
        ↓
Camera/AR starts
        ↓
"Move your phone slowly"
        ↓
Surface detected
        ↓
Tap floor
        ↓
        Koyuki
          │
         / \
        /   \
────────────────────
      real floor
        ↓
Move around with phone
        ↓
Koyuki remains anchored
```

This is the MVP. Everything else is secondary.

---

# 26. Technical reference points

Use official documentation when verifying behavior:

- GitHub Pages:
  https://docs.github.com/en/pages/getting-started-with-github-pages

- GitHub Pages publishing:
  https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

- GitHub Pages HTTPS:
  https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https

- `<model-viewer>`:
  https://modelviewer.dev/

Do not rely on old tutorials when current official documentation can answer the question.
