# UI Handoff: Math Visualization & Streaming System

This document provides the complete specification for the math visualization system used by the "April" AI tutor. It details how visual directives are generated, intercepted, rendered, and streamed to the frontend via Server-Sent Events (SSE).

## 1. System Architecture (The "How & Where")

The math visualization pipeline operates within the `core-service` as an interceptor layer on the LLM's streaming output.

1.  **LLM Output**: The Teacher Agent (Gemini) emits text that includes structured directives (e.g., `<<MATH_DRAW...>>`).
2.  **Stream Interception**: The `StreamInterceptor` state machine (`stream_interceptor.py`) monitors the SSE chunk stream. It detects the opening `<<` and buffers incoming chunks until it finds the closing `>>`.
3.  **Rendering**:
    *   **SVG Rendering**: First-class types (e.g., `triangle`, `circle`) are rendered to sanitized SVGs using `svgwrite` and `bleach` in `math_renderer.py`.
    *   **Interactive Widgets**: The `desmos` type is passed directly as a widget configuration.
    *   **Multimodal Images**: `show_figure` directives trigger an async fetch from the `rag-service` to retrieve stored images from the textbook.
4.  **SSE Emission**: Rendered visuals are injected into the SSE stream as discrete events between text `chunk` events.

---

## 2. SSE Event Protocol (The "What")

The frontend must handle the following event types arriving over the SSE connection (`/text/april-query`).

### `type: "chunk"`
Standard text stream for the tutor's response.
```json
{ "type": "chunk", "text": "Let's look at this triangle..." }
```

### `type: "visual_block"`
A rendered static visual (SVG or Image).
```json
{
  "type": "visual_block",
  "svg": "<svg ...>...</svg>", 
  "image": "base64_string...", // Only if meta.source == 'show_figure'
  "anchor": "after_paragraph",
  "meta": {
    "shape": "triangle",
    "source": "first_class", // 'first_class', 'generic', 'show_figure'
    "is_approximate": false,
    "is_fallback": false
  }
}
```

### `type: "math_widget"`
An interactive Desmos graph.
```json
{
  "type": "math_widget",
  "expression": "y = x^2 + 2x + 1",
  "options": { "grid": true, "keypad": false },
  "anchor": "after_paragraph"
}
```

### `type: "visual_error"`
A fallback placeholder if the backend failed to render.
```json
{
  "type": "visual_error",
  "message": "Could not render 'triangle' diagram",
  "fallback": { "type": "svg", "content": "<svg>...</svg>" },
  "fallback_text": "[triangle diagram]"
}
```

---

## 3. Visual Directives Catalog (The "When")

The LLM is instructed to use these directives when a visual aid would improve pedagogical clarity.

### First-Class Types (Dedicated Renderers)

| Type | Purpose | Key Parameters |
| :--- | :--- | :--- |
| `number_line` | Visualizing scales, fractions, or negative numbers. | `min`, `max`, `step`, `highlights` (list), `labels` (dict) |
| `fraction_visual` | Teaching parts of a whole (Pie or Bar). | `numerator`, `denominator`, `style` ("pie" or "bar") |
| `coordinate_plane` | Graphing points, lines, and shapes in 2D space. | `x_range`, `y_range`, `points`, `lines`, `polygons`, `circles`, `grid` (bool) |
| `triangle` | Geometry concepts, side/angle relationships. | `type` ("right", "equilateral", "isosceles"), `side_labels`, `angle_labels` |
| `circle` | Radius, diameter, circumference, and area. | `radius`, `center` ([x,y]), `show_radius`, `show_diameter`, `grid` |
| `rectangle` | Area, perimeter, and dimensions. | `width_val`, `height_val`, `show_dimensions`, `label` |
| `bar_graph` | Comparing discrete categories. | `labels` (list), `values` (list), `title`, `colors` |
| `line_graph` | Trends over time. | `labels`, `values`, `title` |
| `histogram` | Frequency distributions. | `bins`, `frequencies`, `title` |
| `venn_diagram` | Set logic and intersections. | `sets` (list), `intersection_label` |
| `probability_tree` | Outcome branching and probabilities. | `branches`, `probabilities` |
| `angle` | Degree measurement and arc marking. | `degrees`, `show_arc`, `label` |
| `parabola` | Quadratic function visualization. | `a`, `b`, `c`, `x_range` |

### Generic Shapes & Aliases
The system supports a `generic_shape` renderer for standard polygons:
- **Shapes**: `polygon`, `hexagon`, `pentagon`, `octagon`, `star`, `rhombus`, `trapezium`.
- **Aliases**: `diamond` -> `rhombus`, `square` -> `rectangle`, `semicircle` -> `arc`.

---

## 4. Design Tokens (The "Look & Feel")

All rendered SVGs follow a strict internal design system to ensure accessibility (WCAG AA) and brand consistency.

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Primary Blue** | `#1A6BBF` | Main strokes, axes, and primary shapes. |
| **Highlight Orange** | `#FF6B35` | Points of interest, markers, and radius lines. |
| **Grid Gray** | `#E8E8E8` | Subtle background grids and non-essential lines. |
| **Text Dark** | `#2C2C2C` | Labels, titles, and scale numbers. |
| **Fill Blue Light** | `#D6EAFF` | Default shape fill (usually at 0.3 opacity). |
| **Font Family** | `Inter, Arial` | All labels and text elements. |

---

## 5. Technical Constraints

- **SVG Sanitization**: All SVGs are sanitized using a whitelist of tags (`svg`, `path`, `circle`, `text`, etc.) and attributes. No script execution is possible.
- **Size Limit**: SVGs are capped at **50KB** to ensure fast streaming.
- **Timeout**: Renderers have a **2.0s** execution limit before falling back to a placeholder.
- **No Inline SVGs**: The frontend should never receive raw SVG strings inside the text stream; they always arrive as discrete `visual_block` events.

## 6. Implementation Checklist for Frontend

1. [ ] **Event Routing**: Implement a listener for `visual_block`, `math_widget`, and `visual_error`.
2. [ ] **Positioning**: Render these blocks as "Cards" that appear between paragraphs (using the `anchor` field).
3. [ ] **Desmos Loader**: Ensure the Desmos API is initialized to handle `math_widget` expressions.
4. [ ] **Image Handling**: If `type: "visual_block"` contains an `image` field instead of `svg`, render it as a standard `<img>` with the provided base64 source.
5. [ ] **Accessibility**: Ensure `fallback_text` or `meta.shape` is used for screen reader `alt` tags.
