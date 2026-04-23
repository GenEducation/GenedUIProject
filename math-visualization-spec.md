# Math Visualization UI Handoff Spec
# Synced with backend spec: 2026-04-23

## 1. SSE Event Types

### `chunk`
Normal streaming text. Render as markdown (unchanged from current behavior).

### `tool_status`
Show a small "Drawing..." indicator (spinner + text).
Dismiss on next `visual_block`, `visual_error`, or `math_widget_error`.

**Payload:**
```json
{ "type": "tool_status", "message": "Drawing..." }
```

### `visual_block`
Insert SVG inline at event position.
- Use `dangerouslySetInnerHTML` — safe because backend-generated and sanitized.
- Respect `anchor` field: `"after_paragraph"` = after preceding text block.
- SVG has explicit `viewBox`, scales to container width.
- Transparent background, adapts to any theme.

**Payload:**
```json
{
  "type": "visual_block",
  "svg": "<svg xmlns='...' viewBox='...' ...>...</svg>",
  "anchor": "after_paragraph",
  "meta": {
    "shape": "number_line",
    "source": "first_class"
  }
}
```

**Anchor Field Behavior:**

| Value | Meaning | Frontend Behavior |
|---|---|---|
| `after_paragraph` | After preceding text block | Insert visual below the last completed paragraph |
| `inline` | At exact stream position | Reserved for future use |
| Fallback | No preceding text exists | Render at current stream position |

### `visual_error`
When the backend fails to render the requested diagram, it will emit a `visual_error`. 
The backend now generates a beautiful **SVG Placeholder** for errors, containing a generic blueprint pattern and a text label indicating the missing shape.

**Action:** You should render `fallback.content` exactly as you would render the `svg` field of a `visual_block`. If `fallback.content` is missing, use `fallback_text`.

**Payload:**
```json
{
  "type": "visual_error",
  "message": "Could not render 'number_line' diagram",
  "fallback": {
    "type": "svg",
    "content": "<svg>...blueprint placeholder...</svg>"
  },
  "fallback_text": "[number_line diagram]",
  "anchor": "after_paragraph",
  "meta": {
    "shape": "number_line",
    "source": "placeholder",
    "is_fallback": true
  }
}
```

### `math_widget`
Render Desmos iframe for interactive function plots.
- URL: `https://www.desmos.com/calculator?expression=<expression>`
- Or use Desmos API for deeper integration (future).

**Payload:**
```json
{
  "type": "math_widget",
  "expression": "y=x^2",
  "options": {}
}
```

### `math_widget_error`
Show: "Interactive graph unavailable" + display expression as plain text fallback.

**Payload:**
```json
{
  "type": "math_widget_error",
  "message": "Invalid Desmos expression",
  "expression": "..."
}
```

### `planning`
Node transition status (existing, unchanged).

### `done`
Stream complete (existing, unchanged).

---

## 2. KaTeX Setup

**Packages:** `katex`, `remark-math`, `rehype-katex`

**Integration:** `react-markdown` with `rehype-katex` plugin.

**Behavior:** Accumulate math delimiters (`$...$`, `$$...$$`) and render on close.

---

## 3. Layout Rules

- `visual_block` events are **inline in the message flow**, not appended at the end.
- Use the `anchor` field to determine insertion point.
- If no preceding text exists, render at current stream position.
- SVG containers should have `max-width: 100%` and scale responsively.
- Consider adding a subtle border/shadow container for visual blocks.

---

## 4. Supported Directive Types

The backend supports rendering shapes through two engines: **First-Class Renderers** and **Generic Shape Builders**.

### First-Class Types (15)
These types have dedicated rendering logic for complex visuals:

| Type | Description |
|---|---|
| `number_line` | Horizontal number line with ticks, labels, highlights |
| `fraction_visual` | Pie chart or bar segments showing fractions |
| `bar_graph` | Vertical bar chart |
| `line_graph` | Point-and-line data visualization |
| `histogram` | Continuous data column chart |
| `coordinate_plane` | 2D Cartesian plane with points/lines |
| `triangle` | Triangle with side/angle labels |
| `circle` | Circle with radius/diameter annotations |
| `rectangle` | Rectangle with dimension labels |
| `parabola` | Geometric parabola curve |
| `venn_diagram` | Intersecting sets |
| `probability_tree` | Branching probability visualization |
| `pie_chart` | Data pie chart |
| `angle` | Angle visualization with ray/arc |
| `desmos` | Interactive iframe (handled by Frontend) |

### Generic Shape Builder Types
For any geometric shape not covered above, the backend uses a generic coordinate-based polygon builder (e.g., `polygon`, `hexagon`, `rhombus`, `parallel_lines`, `sector`). 

**Frontend Takeaway:** You do not need to hardcode a list of supported types. If the backend can render it, it returns a `visual_block` with an SVG. If it cannot, it returns a `visual_error` with a rendered SVG placeholder. All SVGs are safe to render.

---

## 5. Error Handling Strategy

| Scenario | Backend Behavior | Frontend Behavior |
|---|---|---|
| Invalid directive type | Emits `visual_error` | Render the `fallback.content` SVG placeholder |
| Malformed JSON params | Emits `visual_error` | Render the `fallback.content` SVG placeholder |
| SVG render failure | Emits `visual_error` | Render the `fallback.content` SVG placeholder |
| SVG > 50KB | Emits `visual_error` | Render the `fallback.content` SVG placeholder |
| Incomplete directive | Stream flushed as text | Rendered as raw text |
| Desmos empty | `math_widget_error` | Show `expression` as plain text |
