# UI Handoff: Production Visual System v2
**Gened AI — April Orchestrator**
**Version**: 2.0 | **Status**: Handoff Ready | **Replaces**: Math Visualization UI Handoff v1

---

## 0. What Changed From v1

The entire rendering approach has changed. v1 used a backend SVG renderer (`svgwrite`) that only supported fixed primitive types (`rectangle`, `triangle`, etc.) with no ability to express pedagogical intent.

**v2 is a three-engine system:**

| Engine | What It Handles | Who Renders |
|---|---|---|
| **p5.js Sandbox** | All conceptual, narrative, CRA-model visuals | Frontend (sandboxed iframe) |
| **GeoGebra** | Geometric constructions, proofs, transformations | Frontend (GeoGebra embed API) |
| **Desmos** | Function graphs, algebra, equations | Frontend (Desmos API — unchanged from v1) |

**Backend no longer renders anything.** It sanitizes and dispatches. The frontend is now the rendering engine.

**Visuals are now proactive** — Aanya generates them whenever pedagogically helpful, not only when the student asks.

---

## 1. SSE Event Protocol

The frontend listens on `/text/april-query` (SSE). Events arrive interleaved with text `chunk` events.

### `type: "chunk"` — unchanged
```json
{ "type": "chunk", "text": "Let's look at this carefully..." }
```

---

### `type: "visual_block"` — CHANGED

The `visual_block` event now carries one of three payloads based on `meta.engine`.

#### Engine: `p5sketch`
```json
{
  "type": "visual_block",
  "engine": "p5sketch",
  "label": "Symmetry Fold Line",
  "code": "function setup(){createCanvas(400,300)}function draw(){...}",
  "anchor": "after_paragraph",
  "meta": {
    "engine": "p5sketch",
    "zpd_hint": "concrete",
    "chapter": "Symmetry",
    "grade": 5,
    "is_fallback": false
  }
}
```

**Frontend responsibility**: Execute `code` inside the p5.js sandboxed iframe (see Section 3).

#### Engine: `geogebra`
```json
{
  "type": "visual_block",
  "engine": "geogebra",
  "label": "Triangle SAS Congruence",
  "commands": ["A=(0,0)", "B=(4,0)", "C=(2,3)", "Polygon(A,B,C)", "alpha=Angle(A,B,C)"],
  "options": {
    "showToolBar": false,
    "showMenuBar": false,
    "showAlgebraInput": false,
    "enableRightClick": false,
    "showResetIcon": false
  },
  "anchor": "after_paragraph",
  "meta": {
    "engine": "geogebra",
    "chapter": "Triangles",
    "grade": 7,
    "is_fallback": false
  }
}
```

**Frontend responsibility**: Initialize GeoGebra AppletParameters with `commands` and `options` (see Section 4).

#### Engine: `show_figure` (RAG image — unchanged from v1)
```json
{
  "type": "visual_block",
  "engine": "show_figure",
  "image": "base64_string...",
  "label": "NCERT Fig 7.3",
  "anchor": "after_paragraph",
  "meta": {
    "engine": "show_figure",
    "figure_id": "ncert_fig_7_3",
    "page_num": 142,
    "is_fallback": false
  }
}
```

---

### `type: "math_widget"` — unchanged (Desmos)
```json
{
  "type": "math_widget",
  "expression": "y = x^2 + 2x + 1",
  "options": { "grid": true, "keypad": false },
  "anchor": "after_paragraph"
}
```

---

### `type: "visual_error"` — updated fallback structure
```json
{
  "type": "visual_error",
  "engine": "p5sketch",
  "label": "Symmetry Fold Line",
  "message": "Could not render p5sketch visual",
  "fallback_text": "[Visual: Symmetry Fold Line]",
  "anchor": "after_paragraph"
}
```

**Frontend responsibility**: Render `fallback_text` as a styled inline placeholder chip. Do not show a broken card.

---

### `type: "tool_status"` — unchanged
```json
{ "type": "tool_status", "status": "pending", "tool": "visual_renderer" }
{ "type": "tool_status", "status": "complete", "tool": "visual_renderer" }
```

---

## 2. Visual Card Component

All three engine types are wrapped in a single **Visual Card** component. Only the inner renderer changes.

### Anatomy

```
┌─────────────────────────────────────────────────────┐
│  [engine chip: e.g. "Interactive"]     [expand icon] │  ← Card Header
├─────────────────────────────────────────────────────┤
│                                                     │
│              [Renderer goes here]                   │  ← Card Body
│           (p5 iframe / GeoGebra / img)              │
│                                                     │
├─────────────────────────────────────────────────────┤
│  label: "Symmetry Fold Line"                        │  ← Card Footer
└─────────────────────────────────────────────────────┘
```

### Specs

| Property | Value |
|---|---|
| Card border radius | `12px` |
| Card border | `1px solid #E8E8E8` |
| Card background | `#FFFFFF` |
| Card shadow | `0 2px 8px rgba(0,0,0,0.06)` |
| Card max-width | `100%` of message bubble width |
| Card margin | `12px 0` (top and bottom, between paragraphs) |
| Body min-height | `260px` |
| Body max-height | `420px` |
| Footer font | `12px`, `#9E9E9E`, `letter-spacing: 0.08em`, `uppercase` |
| Engine chip (p5sketch) | `"Interactive"` — `#E8F4FF` bg, `#1A6BBF` text |
| Engine chip (geogebra) | `"Geometry"` — `#FFF3E0` bg, `#E65100` text |
| Engine chip (desmos) | `"Graph"` — `#E8F5E9` bg, `#2E7D32` text |
| Engine chip (show_figure) | `"Textbook"` — `#F3E5F5` bg, `#6A1B9A` text |

### Loading State

While the visual initializes, show a skeleton loader inside the card body:
- Animated shimmer (`background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)`)
- Same dimensions as expected visual
- Replace with rendered content once ready

### Error State

If `visual_error` arrives or the renderer throws:
- Replace card body with a centered inline chip: `📐 Visual unavailable — [label]`
- Chip style: `#FFF8E1` bg, `#F57F17` text, `8px 12px` padding, `8px` border-radius
- Never show an empty white card

---

## 3. p5.js Sandbox Implementation

### Architecture

The frontend maintains **one p5.js library instance** loaded at app boot. Individual sketch iframes receive the library injected as a blob URL — no external network calls per sketch.

```
App Boot
  └─► Fetch p5.min.js once from CDN (https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js)
  └─► Store as blob URL: URL.createObjectURL(new Blob([p5Source], {type: 'text/javascript'}))
  └─► Cache in module-level variable: window.__p5BlobUrl

Per Sketch Render (on visual_block with engine: "p5sketch")
  └─► Build iframe HTML string (see below)
  └─► Set iframe srcdoc
  └─► Iframe is sandboxed — no network, no parent access
```

### Iframe HTML Template

```html
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: transparent; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<script src="__P5_BLOB_URL__"></script>
<script>
// SANITIZED_SKETCH_CODE injected here
__SKETCH_CODE__
</script>
</body>
</html>
```

Replace `__P5_BLOB_URL__` with the cached blob URL. Replace `__SKETCH_CODE__` with the sanitized sketch code from the `visual_block` event.

### Iframe Element Props

```jsx
<iframe
  title={label}
  sandbox="allow-scripts"
  scrolling="no"
  style={{
    width: '100%',
    height: '320px',
    border: 'none',
    borderRadius: '0 0 12px 12px',
    background: 'transparent'
  }}
  srcdoc={iframeHtml}
/>
```

**Critical**: `sandbox="allow-scripts"` only. Do NOT add `allow-same-origin` — this would allow the iframe to access the parent window's DOM and localStorage.

### Client-Side Code Sanitization

Before injecting sketch code into the iframe, run a lightweight strip pass on the frontend:

```javascript
function sanitizeSketchCode(code) {
  const dangerous = [
    /\bfetch\s*\(/g,
    /\bXMLHttpRequest\b/g,
    /\bWebSocket\b/g,
    /\beval\s*\(/g,
    /\bdocument\.cookie\b/g,
    /\blocalStorage\b/g,
    /\bsessionStorage\b/g,
    /\bwindow\.parent\b/g,
    /\btop\b\s*\[/g,
  ];
  let sanitized = code;
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '/* blocked */');
  });
  return sanitized;
}
```

This is defense-in-depth. The backend already strips these server-side. The frontend check is an additional safety layer.

### Canvas Size Convention

All p5.js sketches from Aanya use `createCanvas(400, 280)` as the standard size. The card body height is set to `320px` to accommodate this with padding. If Aanya outputs a different canvas size, the iframe scales via CSS `transform: scale()` to fit within the card.

```javascript
// Auto-scale logic (run after iframe loads)
iframe.onload = () => {
  const sketchWidth = 400; // known convention
  const containerWidth = iframe.parentElement.offsetWidth - 32; // 16px padding each side
  if (containerWidth < sketchWidth) {
    const scale = containerWidth / sketchWidth;
    iframe.style.transform = `scale(${scale})`;
    iframe.style.transformOrigin = 'top left';
    iframe.style.width = `${sketchWidth}px`;
    iframe.style.height = `${320 / scale}px`;
  }
};
```

---

## 4. GeoGebra Embed Integration

### Loading Strategy

GeoGebra is heavy (~2MB). Load it **lazily** — only when the first `geogebra` visual_block arrives in a session.

```javascript
let geogebraLoaded = false;

async function ensureGeoGebraLoaded() {
  if (geogebraLoaded) return;
  await loadScript('https://www.geogebra.org/apps/deployggb.js');
  geogebraLoaded = true;
}
```

Show the card skeleton loader while GeoGebra loads.

### Component Implementation

```javascript
async function renderGeoGebra(containerId, commands, options) {
  await ensureGeoGebraLoaded();

  const params = {
    appName: "geometry",
    width: "100%",
    height: 320,
    showToolBar: false,
    showMenuBar: false,
    showAlgebraInput: false,
    enableRightClick: false,
    showResetIcon: false,
    preventFocus: true,
    ...options,
    appletOnLoad: (api) => {
      commands.forEach(cmd => api.evalCommand(cmd));
    }
  };

  const applet = new GGBApplet(params, true);
  applet.inject(containerId);
}
```

Each GeoGebra card gets a unique `containerId` (e.g., `ggb-${messageId}-${visualIndex}`).

### GeoGebra Cleanup

When a message is removed from the DOM (e.g., session cleared), call `api.remove()` on the applet instance to avoid memory leaks. Store a map of `containerId → api` for this purpose.

---

## 5. Desmos Integration — Unchanged From v1

Handle `math_widget` events exactly as before. No changes required.

Reference the v1 spec for Desmos implementation details.

---

## 6. Visual Positioning Logic

Visuals arrive with `"anchor": "after_paragraph"`. This means:

- The visual card is inserted **after the paragraph that immediately precedes it in the text stream**
- Text chunks before the visual: render normally
- When `visual_block` arrives: close the current paragraph, insert the Visual Card component, open a new paragraph for subsequent text chunks

```
text chunk: "Let's look at this rectangle..."     → paragraph 1
text chunk: "The dashed line is the fold."        → paragraph 1 continues
visual_block arrives (p5sketch)                   → close para 1, insert Visual Card
text chunk: "What do you notice about the dots?"  → paragraph 2
```

**Do not interrupt a sentence.** If the visual arrives mid-sentence (mid-chunk-sequence), buffer the in-progress sentence until a natural break (`.`, `?`, `!`, `\n`), then insert the card.

---

## 7. History Re-Render

`/get-history` returns raw content strings with directives embedded. The frontend must parse and re-render.

### Storage Model

History stores the **directive source**, not rendered output:
```
"Let's look at this.\n<<VISUAL type=\"p5sketch\" label=\"Fold Line\">>function setup()....<</VISUAL>>"
```

### Re-Render Logic

```javascript
function parseHistoryContent(content) {
  const segments = [];
  // Regex for self-closing (Desmos)
  // Regex for block directives (p5sketch, geogebra)
  const blockRegex = /<<VISUAL type="([^"]+)" label="([^"]*)"(?:[^>]*)>>([\s\S]*?)<\/VISUAL>>/g;
  const selfClosingRegex = /<<VISUAL type="desmos" expression="([^"]+)"[^/]*\/>>/ g;

  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({
      type: 'visual',
      engine: match[1],
      label: match[2],
      payload: match[3].trim()  // code for p5sketch, JSON string for geogebra
    });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return segments;
}
```

Each `visual` segment is rendered using the same Visual Card component as the live stream — the rendering logic is identical, ensuring idempotency.

### p5.js History Re-Execution

p5.js sketches re-execute from the stored `code` string. Since sketches are deterministic (no random seeds unless explicitly coded), the visual is identical on reload.

---

## 8. Responsive Behavior

| Viewport | Visual Card Behavior |
|---|---|
| Desktop (>768px) | Full width of message bubble, max 680px |
| Tablet (480–768px) | Full width, auto-scale canvas via transform |
| Mobile (<480px) | Full width, canvas scales down; GeoGebra applet min-height 260px |

GeoGebra and p5.js canvases both respect CSS `width: 100%` on their containers. The auto-scale logic in Section 3 applies for p5.js. GeoGebra handles its own responsive scaling.

---

## 9. Performance Constraints

| Metric | Target |
|---|---|
| p5 sketch first paint | < 200ms after `visual_block` received |
| GeoGebra first paint | < 1.5s after `visual_block` received (includes lazy load on first use) |
| GeoGebra subsequent | < 300ms (script already loaded) |
| Desmos | < 200ms (unchanged) |
| Skeleton loader shown | Immediately on `visual_block` received |
| Max concurrent iframes | 3 active p5 iframes per session; older ones paused via `srcdoc=""` |

---

## 10. Implementation Checklist

### Event Handling
- [ ] Route `visual_block` by `meta.engine` field (`p5sketch`, `geogebra`, `show_figure`)
- [ ] Handle `math_widget` for Desmos (unchanged)
- [ ] Handle `visual_error` with fallback chip (no broken cards)
- [ ] Handle `tool_status` pending/complete for loading indicator

### Visual Card Component
- [ ] Single `VisualCard` component accepts `engine`, `label`, `payload`, `meta`
- [ ] Engine chip renders correct label and color per engine type
- [ ] Skeleton loader shown while renderer initializes
- [ ] Error state renders fallback chip
- [ ] Expand icon opens visual full-screen (nice to have for v2)

### p5.js Sandbox
- [ ] Fetch p5 library once at app boot, store as blob URL
- [ ] Build iframe srcdoc from template (p5 blob URL + sanitized code)
- [ ] `sandbox="allow-scripts"` only — NO `allow-same-origin`
- [ ] Client-side sanitization strip pass before injection
- [ ] Auto-scale canvas if container narrower than 400px
- [ ] Cap concurrent active iframes at 3; pause older ones

### GeoGebra
- [ ] Lazy load `deployggb.js` on first `geogebra` visual_block
- [ ] Unique `containerId` per visual card
- [ ] `appletOnLoad` callback executes all `commands` via `api.evalCommand()`
- [ ] Cleanup: call `api.remove()` on session clear / component unmount
- [ ] Store `containerId → api` map for cleanup

### History Re-Render
- [ ] `parseHistoryContent()` splits content into text + visual segments
- [ ] Block directive regex extracts `engine`, `label`, `payload`
- [ ] Visual segments render via same `VisualCard` component
- [ ] p5.js sketches re-execute from stored code string (idempotent)

### Responsive
- [ ] Visual card full width of message bubble on all viewports
- [ ] p5 canvas auto-scales via CSS transform on mobile
- [ ] GeoGebra min-height 260px on mobile

---

## 11. Design Tokens (Unchanged From v1)

| Token | Value | Usage |
|---|---|---|
| Primary Blue | `#1A6BBF` | Axes, strokes, primary shapes |
| Highlight Orange | `#FF6B35` | Points, markers, radius lines |
| Grid Gray | `#E8E8E8` | Grids, borders, separators |
| Text Dark | `#2C2C2C` | Labels, titles |
| Fill Blue Light | `#D6EAFF` | Shape fills (0.3 opacity) |
| Font (labels) | `Inter, Arial` | All text in p5 sketches |

These tokens are injected into Aanya's system prompt so p5.js sketches use consistent colors. The frontend does not need to enforce these — they are embedded in the generated sketch code.

---

## 12. Open Questions for Frontend Team

1. **p5 library version**: Using p5 v1.9.0. If the project already bundles a different version, confirm compatibility before switching to blob URL strategy.
2. **GeoGebra API key**: GeoGebra's `deployggb.js` may require an API key for