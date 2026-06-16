import type { ChatElement } from "../store/useStudentStore";

// -- SVG Helpers ---------------------------------------------------------------

const LEARNING_BLUEPRINT = `
<svg width="400" height="200" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="200" rx="12" fill="#F0F7FF"/>
  <path d="M0 20H400M0 40H400M0 60H400M0 80H400M0 100H400M0 120H400M0 140H400M0 160H400M0 180H400" stroke="#1A6BBF" stroke-opacity="0.04"/>
  <path d="M20 0V200M40 0V200M60 0V200M80 0V200M100 0V200M120 0V200M140 0V200M160 0V200M180 0V200M200 0V200M220 0V200M240 0V200M260 0V200M280 0V200M300 0V200M320 0V200M340 0V200M360 0V200M380 0V200" stroke="#1A6BBF" stroke-opacity="0.04"/>
  <rect x="100" y="50" width="200" height="100" rx="8" stroke="#1A6BBF" stroke-opacity="0.15" stroke-dasharray="4 4"/>
  <text x="200" y="105" text-anchor="middle" fill="#1A6BBF" fill-opacity="0.3" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="bold" style="text-transform: uppercase; letter-spacing: 0.1em;">Learning Blueprint</text>
  <text x="200" y="125" text-anchor="middle" fill="#1A6BBF" fill-opacity="0.2" font-family="Inter, Arial, sans-serif" font-size="10">Visualization Ready</text>
</svg>
`;

export function generateHistoricalSVG(type: string, params: any): string {
  const width = 400;
  const height = 280;

  type = type.replace(/[\\"]/g, '').toLowerCase().trim();

  if (type === "diamond") type = "rhombus";
  if (type === "square") type = "rectangle";
  if (type === "semicircle" || type === "arc") type = "semicircle";
  if (type === "trapezoid") type = "trapezium";

  let shapeMarkup = "";

  const primaryBlue = "#1A6BBF";
  const highlightOrange = "#FF6B35";
  const textDark = "#2C2C2C";
  const fillBlueLight = "#D6EAFF";
  const gridGray = "#E8E8E8";
  const brandGreen = primaryBlue;
  const darkInk = textDark;

  if (type === "rectangle") {
    const wVal = params.width || 5, hVal = params.height || 3;
    const w = Math.min(wVal * 40, width - 120), h = Math.min(hVal * 40, height - 120);
    const x = (width - w) / 2, y = (height - h) / 2;
    shapeMarkup = `
      <defs><linearGradient id="rectGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${primaryBlue}" stop-opacity="0.08" /><stop offset="100%" stop-color="${primaryBlue}" stop-opacity="0.15" /></linearGradient></defs>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#rectGrad)" stroke="${primaryBlue}" stroke-width="2.5" />
      ${params.label ? `<text x="${width/2}" y="${y + h + 25}" text-anchor="middle" fill="${textDark}" font-size="12" font-weight="800">${params.label}</text>` : ""}
    `;
  } else if (type === "circle") {
    const isClock = params.hour !== undefined || params.minute !== undefined;
    const rVal = params.radius || 3, actualR = isClock ? 100 : Math.min(rVal * 40, 100);
    const cx = width / 2, cy = height / 2;
    const base = `<defs><radialGradient id="circGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${primaryBlue}" stop-opacity="0.15" /><stop offset="100%" stop-color="${primaryBlue}" stop-opacity="0.05" /></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${actualR}" fill="url(#circGrad)" stroke="${primaryBlue}" stroke-width="2.5" />`;
    if (isClock) {
      const hA = (((params.hour || 0) % 12) * 30 + (params.minute || 0) * 0.5 - 90) * (Math.PI / 180);
      const mA = ((params.minute || 0) * 6 - 90) * (Math.PI / 180);
      shapeMarkup = base + `<line x1="${cx}" y1="${cy}" x2="${cx + actualR*0.5*Math.cos(hA)}" y2="${cy + actualR*0.5*Math.sin(hA)}" stroke="${textDark}" stroke-width="4" stroke-linecap="round" />` +
                    `<line x1="${cx}" y1="${cy}" x2="${cx + actualR*0.8*Math.cos(mA)}" y2="${cy + actualR*0.8*Math.sin(mA)}" stroke="${primaryBlue}" stroke-width="3" stroke-linecap="round" />` +
                    `<circle cx="${cx}" cy="${cy}" r="4" fill="${textDark}" />`;
    } else {
      shapeMarkup = base + `<line x1="${cx}" y1="${cy}" x2="${cx + actualR}" y2="${cy}" stroke="${highlightOrange}" stroke-width="1.5" stroke-dasharray="4 2" />` +
                    `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${highlightOrange}" /><text x="${cx + actualR / 2}" y="${cy - 12}" text-anchor="middle" fill="${textDark}" font-size="11" font-weight="700">R = ${rVal}</text>`;
    }
  } else if (type === "triangle") {
    const w = 150, h = 120, x = (width - w) / 2, y = (height + h) / 2;
    shapeMarkup = `<path d="M ${x} ${y} L ${x + w} ${y} L ${x + w / 2} ${y - h} Z" fill="${primaryBlue}" fill-opacity="0.1" stroke="${primaryBlue}" stroke-width="2.5" stroke-linejoin="round" />` +
                  (params.label ? `<text x="${width/2}" y="${y + 30}" text-anchor="middle" fill="${textDark}" font-size="12" font-weight="800">${params.label}</text>` : "");
  } else if (type === "line") {
    const x1 = 100, y1 = height/2, x2 = width - 100, y2 = height/2;
    shapeMarkup = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${primaryBlue}" stroke-width="3" stroke-linecap="round" />` +
                  `<circle cx="${x1}" cy="${y1}" r="5" fill="${highlightOrange}" stroke="white" stroke-width="2" /><circle cx="${x2}" cy="${y2}" r="5" fill="${highlightOrange}" stroke="white" stroke-width="2" />`;
  } else if (type === "angle") {
    const cx = width / 2, cy = height / 2 + 30, deg = params.degrees || 45, rad = deg * (Math.PI / 180), r = 40;
    shapeMarkup = `<path d="M ${cx + r} ${cy} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 0 ${cx + r * Math.cos(-rad)} ${cy + r * Math.sin(-rad)}" fill="${primaryBlue}" fill-opacity="0.1" stroke="${primaryBlue}" stroke-width="2" />` +
                  `<line x1="${cx}" y1="${cy}" x2="${cx + 120}" y2="${cy}" stroke="${textDark}" stroke-width="3" stroke-linecap="round" />` +
                  `<line x1="${cx}" y1="${cy}" x2="${cx + 120 * Math.cos(-rad)}" y2="${cy + 120 * Math.sin(-rad)}" stroke="${textDark}" stroke-width="3" stroke-linecap="round" />` +
                  `<text x="${cx + r + 20}" y="${cy - 15}" fill="${primaryBlue}" font-size="14" font-weight="bold">${deg}°</text>`;
  } else if (type === "parabola") {
    const a = params.a || 0.01, h = params.h || 0, k = params.k || 0, cx = width / 2, cy = height / 2;
    let pts = ""; for (let x = -150; x <= 150; x += 5) pts += `${cx + x},${cy - (a * Math.pow(x - h, 2) + k)} `;
    shapeMarkup = `<polyline points="${pts}" fill="none" stroke="${primaryBlue}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
  } else if (type === "fraction_visual") {
    const n = params.numerator || 3, d = params.denominator || 4, r = 80, cx = width/2, cy = height/2;
    let ws = ""; for (let i = 0; i < d; i++) {
      const s = (i * (360/d) - 90) * (Math.PI/180), e = ((i+1) * (360/d) - 90) * (Math.PI/180);
      ws += `<path d="M ${cx} ${cy} L ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 0 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)} Z" fill="${i < n ? primaryBlue : 'none'}" fill-opacity="0.2" stroke="${primaryBlue}" stroke-width="1.5" />`;
    }
    shapeMarkup = ws + `<text x="${cx}" y="${cy + r + 40}" text-anchor="middle" fill="${textDark}" font-size="18" font-weight="800">${n}/${d}</text>`;
  } else if (type === "bar_graph" || type === "line_graph") {
    const data = params.data || [10, 20, 15, 25], max = Math.max(...data, 1), chartW = width - 100, chartH = height - 100, sx = 50, sy = height - 50;
    let g = ""; data.forEach((v: number, i: number) => {
      const x = sx + i * (chartW / data.length) + (chartW / data.length) * 0.15, h = (v/max) * chartH, w = (chartW / data.length) * 0.7;
      if (type === "bar_graph") g += `<rect x="${x}" y="${sy-h}" width="${w}" height="${h}" rx="4" fill="${primaryBlue}" fill-opacity="0.2" stroke="${primaryBlue}" stroke-width="1.5" />`;
      else g += `<circle cx="${x + w/2}" cy="${sy-(v/max)*chartH}" r="5" fill="${highlightOrange}" stroke="white" stroke-width="2" />`;
    });
    shapeMarkup = `<line x1="${sx}" y1="${sy}" x2="${sx+chartW}" y2="${sy}" stroke="${textDark}" stroke-opacity="0.3" /><line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy-chartH}" stroke="${textDark}" stroke-opacity="0.3" />` + g;
  } else if (type === "number_line") {
    const start = params.start || 0, end = params.end || 10, margin = 50, lineY = height/2, lineW = width - 100, scale = lineW/(end-start);
    let ts = ""; for (let i = start; i <= end; i++) {
      const x = margin + (i-start)*scale;
      ts += `<line x1="${x}" y1="${lineY-5}" x2="${x}" y2="${lineY+5}" stroke="${textDark}" stroke-width="1.5" /><text x="${x}" y="${lineY+20}" text-anchor="middle" fill="${textDark}" font-size="10" font-weight="bold">${i}</text>`;
    }
    shapeMarkup = `<line x1="${margin-10}" y1="${lineY}" x2="${width-margin+10}" y2="${lineY}" stroke="${textDark}" stroke-width="2" />` + ts;
  } else if (type === "calendar") {
    const month = params.month || 1, year = params.year || 2024, days = new Date(year, month, 0).getDate(), first = new Date(year, month-1, 1).getDay();
    let cal = `<text x="${width/2}" y="50" text-anchor="middle" fill="${textDark}" font-size="16" font-weight="800">${month}/${year}</text>`;
    for (let i = 0; i < 42; i++) {
      const d = i - first + 1, x = 60 + (i%7)*40, y = 80 + Math.floor(i/7)*30;
      cal += `<rect x="${x}" y="${y}" width="40" height="30" stroke="${textDark}" stroke-opacity="0.1" fill="none" />`;
      if (d > 0 && d <= days) cal += `<text x="${x+20}" y="${y+15}" dominant-baseline="middle" text-anchor="middle" fill="${textDark}" font-size="12" font-weight="bold">${d}</text>`;
    }
    shapeMarkup = cal;
  } else if (type === "coordinate_plane") {
    const pts = params.points || [], lns = params.lines || [], margin = 50, plotW = width-100, plotH = height-100;
    const toX = (v: number) => margin + ((v + 5)/10) * plotW, toY = (v: number) => height - margin - ((v + 5)/10) * plotH;
    let g = ""; for (let i = -5; i <= 5; i++) {
      g += `<line x1="${toX(i)}" y1="${margin}" x2="${toX(i)}" y2="${height-margin}" stroke="${gridGray}" stroke-width="0.5" />`;
      g += `<line x1="${margin}" y1="${toY(i)}" x2="${width-margin}" y2="${toY(i)}" stroke="${gridGray}" stroke-width="0.5" />`;
    }
    const axes = `<line x1="${margin}" y1="${toY(0)}" x2="${width-margin}" y2="${toY(0)}" stroke="${textDark}" stroke-opacity="0.3" /><line x1="${toX(0)}" y1="${margin}" x2="${toX(0)}" y2="${height-margin}" stroke="${textDark}" stroke-opacity="0.3" />`;
    let m = ""; pts.forEach((p: any) => m += `<circle cx="${toX(p.x)}" cy="${toY(p.y)}" r="5" fill="${highlightOrange}" stroke="white" stroke-width="2" />`);
    lns.forEach((l: any) => m += `<line x1="${toX(l.p1[0])}" y1="${toY(l.p1[1])}" x2="${toX(l.p2[0])}" y2="${toY(l.p2[1])}" stroke="${primaryBlue}" stroke-width="2.5" />`);
    shapeMarkup = g + axes + m;
  } else if (type === "point" || type === "coordinate") {
    const x = width/2 + (params.x||0)*20, y = height/2 - (params.y||0)*20;
    shapeMarkup = `<circle cx="${x}" cy="${y}" r="6" fill="${highlightOrange}" stroke="white" stroke-width="2" /><circle cx="${x}" cy="${y}" r="12" fill="${highlightOrange}" fill-opacity="0.15" />`;
  } else if (type === "polygon") {
    const vs: any[] = params.vertices || [];
    if (vs.length >= 3) {
      const coords = vs.map((v: any) => ({
        x: Array.isArray(v) ? v[0] : (v.x ?? 0),
        y: Array.isArray(v) ? v[1] : (v.y ?? 0),
      }));
      const cx0 = coords.reduce((s, c) => s + c.x, 0) / coords.length;
      const cy0 = coords.reduce((s, c) => s + c.y, 0) / coords.length;
      const centered = coords.map(c => ({ x: c.x - cx0, y: c.y - cy0 }));
      const maxExtent = Math.max(...centered.map(c => Math.max(Math.abs(c.x), Math.abs(c.y))), 1);
      const scale = Math.min(20, (width - 120) / 2 / maxExtent, (height - 80) / 2 / maxExtent);
      const ps = centered.map(c => `${width/2 + c.x*scale},${height/2 - c.y*scale}`).join(" ");
      shapeMarkup = `<polygon points="${ps}" fill="${primaryBlue}" fill-opacity="0.1" stroke="${primaryBlue}" stroke-width="2.5" stroke-linejoin="round" />`;
    }
  } else if (["hexagon","pentagon","octagon"].includes(type)) {
    const sides = type === "hexagon" ? 6 : type === "pentagon" ? 5 : 8;
    const r = 100, cx = width/2, cy = height/2;
    const pts = Array.from({length: sides}, (_, i) => {
      const a = (i * 2 * Math.PI / sides) - Math.PI/2;
      return `${cx + r*Math.cos(a)},${cy + r*Math.sin(a)}`;
    }).join(" ");
    shapeMarkup = `<polygon points="${pts}" fill="${primaryBlue}" fill-opacity="0.1" stroke="${primaryBlue}" stroke-width="2.5" stroke-linejoin="round" />`;
  } else if (type === "star") {
    const outerR = 100, innerR = 42, cx = width/2, cy = height/2;
    const pts = Array.from({length: 10}, (_, i) => {
      const r2 = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI / 5) - Math.PI/2;
      return `${cx + r2*Math.cos(a)},${cy + r2*Math.sin(a)}`;
    }).join(" ");
    shapeMarkup = `<polygon points="${pts}" fill="${primaryBlue}" fill-opacity="0.1" stroke="${primaryBlue}" stroke-width="2.5" stroke-linejoin="round" />`;
  } else if (type === "rhombus") {
    const rw = params.width ? Math.min(params.width*30, 160) : 140;
    const rh = params.height ? Math.min(params.height*30, 120) : 100;
    const cx = width/2, cy = height/2;
    shapeMarkup = `<polygon points="${cx},${cy-rh/2} ${cx+rw/2},${cy} ${cx},${cy+rh/2} ${cx-rw/2},${cy}" fill="${primaryBlue}" fill-opacity="0.1" stroke="${primaryBlue}" stroke-width="2.5" stroke-linejoin="round" />`;
  } else if (type === "trapezium") {
    const topW = 100, botW = 160, h2 = 90, cx = width/2, cy = height/2;
    shapeMarkup = `<polygon points="${cx-topW/2},${cy-h2/2} ${cx+topW/2},${cy-h2/2} ${cx+botW/2},${cy+h2/2} ${cx-botW/2},${cy+h2/2}" fill="${primaryBlue}" fill-opacity="0.1" stroke="${primaryBlue}" stroke-width="2.5" stroke-linejoin="round" />`;
  } else if (type === "semicircle") {
    const sr = params.radius ? Math.min(params.radius*30, 100) : 100;
    const cx = width/2, cy = height/2 + 20;
    shapeMarkup = `<path d="M ${cx-sr} ${cy} A ${sr} ${sr} 0 0 1 ${cx+sr} ${cy} Z" fill="${primaryBlue}" fill-opacity="0.1" stroke="${primaryBlue}" stroke-width="2.5" />`;
  } else if (type === "histogram") {
    const bins: number[] = params.bins || [0,2,4,6,8,10];
    const freqs: number[] = params.frequencies || [3,7,5,9,4];
    const maxF = Math.max(...freqs, 1), chartH = height-90, sx = 50, sy = height-50;
    const binW = (width-100) / freqs.length;
    let g = "";
    freqs.forEach((f, i) => {
      const bh = (f/maxF)*chartH;
      g += `<rect x="${sx + i*binW}" y="${sy-bh}" width="${binW}" height="${bh}" fill="${primaryBlue}" fill-opacity="0.18" stroke="${primaryBlue}" stroke-width="1.5" />`;
      if (bins[i] !== undefined) g += `<text x="${sx+i*binW}" y="${sy+16}" fill="${textDark}" font-size="9" text-anchor="middle">${bins[i]}</text>`;
    });
    shapeMarkup = `<line x1="${sx}" y1="${sy}" x2="${sx+(width-100)}" y2="${sy}" stroke="${textDark}" stroke-opacity="0.3" /><line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy-chartH}" stroke="${textDark}" stroke-opacity="0.3" />` + g;
  } else if (type === "venn_diagram") {
    const sets: string[] = params.sets || ["A","B"];
    const cx = width/2, cy = height/2, r = 90, offset = 55;
    const x1 = cx-offset/2, x2 = cx+offset/2;
    shapeMarkup =
      `<circle cx="${x1}" cy="${cy}" r="${r}" fill="${primaryBlue}" fill-opacity="0.12" stroke="${primaryBlue}" stroke-width="2.5" />` +
      `<circle cx="${x2}" cy="${cy}" r="${r}" fill="${highlightOrange}" fill-opacity="0.12" stroke="${highlightOrange}" stroke-width="2.5" />` +
      `<text x="${x1-r/2}" y="${cy+5}" text-anchor="middle" fill="${primaryBlue}" font-size="18" font-weight="800">${sets[0]||"A"}</text>` +
      `<text x="${x2+r/2}" y="${cy+5}" text-anchor="middle" fill="${highlightOrange}" font-size="18" font-weight="800">${sets[1]||"B"}</text>` +
      (params.intersection_label ? `<text x="${cx}" y="${cy+5}" text-anchor="middle" fill="${textDark}" font-size="11" font-weight="700">${params.intersection_label}</text>` : "");
  } else if (type === "probability_tree") {
    const branches: string[] = params.branches || [["H","T"],["H","T"]];
    const probs: number[] = params.probabilities || [0.5,0.5];
    const startX = 60, startY = height/2;
    const level1X = 180, level2X = 320;
    let g = `<circle cx="${startX}" cy="${startY}" r="6" fill="${primaryBlue}" />`;
    const b1 = Array.isArray(branches[0]) ? branches[0] : (branches as any);
    const yPositions = b1.map((_:any, i:number) => startY - ((b1.length-1)/2 - i) * 80);
    yPositions.forEach((y1: number, i: number) => {
      g += `<line x1="${startX}" y1="${startY}" x2="${level1X}" y2="${y1}" stroke="${primaryBlue}" stroke-width="2" />`;
      g += `<circle cx="${level1X}" cy="${y1}" r="5" fill="${highlightOrange}" stroke="white" stroke-width="1.5" />`;
      g += `<text x="${(startX+level1X)/2}" y="${(startY+y1)/2-6}" text-anchor="middle" fill="${textDark}" font-size="10" font-weight="700">${probs[i]||""}</text>`;
      const b2 = Array.isArray(branches[1]) ? branches[1] : ["H","T"];
      const yPos2 = b2.map((_:any, j:number) => y1 - ((b2.length-1)/2 - j) * 40);
      yPos2.forEach((y2: number, j: number) => {
        g += `<line x1="${level1X}" y1="${y1}" x2="${level2X}" y2="${y2}" stroke="${textDark}" stroke-width="1.5" stroke-opacity="0.5" />`;
        g += `<circle cx="${level2X}" cy="${y2}" r="4" fill="${primaryBlue}" fill-opacity="0.4" />`;
        g += `<text x="${level2X+14}" y="${y2+4}" fill="${textDark}" font-size="10" font-weight="600">${b2[j]||""}</text>`;
      });
    });
    shapeMarkup = g;
  }

  if (!shapeMarkup) {
    return LEARNING_BLUEPRINT;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="24" fill="#F7FAFF"/>
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridGray}" stroke-width="0.5" stroke-opacity="0.08"/>
  </pattern>
  <rect width="100%" height="100%" fill="url(#grid)" rx="24" />
  ${shapeMarkup}
  ${params.label ? `<rect x="${width/2-60}" y="${height-35}" width="120" height="20" rx="10" fill="${textDark}" fill-opacity="0.03" /><text x="${width/2}" y="${height-21}" text-anchor="middle" fill="${textDark}" fill-opacity="0.4" font-family="Inter, sans-serif" font-size="10" font-weight="800" style="text-transform: uppercase; letter-spacing: 0.15em;">${params.label}</text>` : ""}
</svg>`;
}

export function normalizeSvg(svgString: string): string {
  let normalized = svgString
    .replace(/\bwidth="[^"]*px"/g, 'width="100%"')
    .replace(/\bheight="[^"]*px"/g, 'height="auto"')
    .replace(/\bwidth='[^']*px'/g, "width='100%'")
    .replace(/\bheight='[^']*px'/g, "height='auto'");

  if (!normalized.includes('viewBox')) {
    const wMatch = svgString.match(/\bwidth=["'](\d+)["']/);
    const hMatch = svgString.match(/\bheight=["'](\d+)["']/);
    if (wMatch && hMatch) {
      normalized = normalized.replace('<svg', `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`);
    }
  }

  normalized = normalized
    .replace(/(<svg[^>]*?)\bwidth="(\d+)"/, '$1width="100%"')
    .replace(/(<svg[^>]*?)\bheight="(\d+)"/, '$1height="auto"');

  return normalized;
}

// -- Main Parser ---------------------------------------------------------------

export function parseContent(content: string): ChatElement[] {
  if (!content) return [];
  const elements: ChatElement[] = [];

  const masterRegex = /(?:<<VISUAL\s+type="([^"]+)"\s+label="([^"]*)"(?:[^>]*)>>?([\s\S]*?)<<?\/VISUAL>>?)|(?:<<VISUAL\s+type="([^"]+)"((?:\s+\w+="[^"]*")*)\s*\/>>?)|(?:<<(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE|SPEAK_PARA|DIFFICULT_WORD|READ_ALOUD|LISTEN_COMPREHENSION|SHOW_FIGURE_DESCRIBE|KARAOKE|math_interactive)(?::|\s+)([\s\S]*?)(?:>>|>|$))|(<svg[\s\S]*?<\/svg>)/g;

  let elementCount = 0;
  let lastIndex = 0;
  let match;

  while ((match = masterRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      elements.push({
        id: `el-${elementCount++}`,
        type: "text",
        content: textBefore.trim(),
      });
    }

    if (match[1] && match[1] === "interactive") {
      // Interactive math block persisted in history as
      // <<VISUAL type="interactive" label="...">>{block json}<</VISUAL>>.
      // Live turns receive this as an `interactive_block` SSE event instead; here we
      // rehydrate the same ChatElement shape from the stored JSON body.
      const label = match[2];
      const payload = match[3].trim();
      let block: any = {};
      try { block = JSON.parse(payload); } catch (e) { block = {}; }
      elements.push({
        id: `interactive-${elementCount++}-${Date.now()}`,
        type: "interactive",
        content: block.interactive_type || "interactive",
        meta: {
          directive_id: block.directive_id,
          interactive_type: block.interactive_type,
          label: block.label || label,
          question: block.prompt,
          render: block.render,
          interaction: block.interaction,
          validation: block.validation,
          interaction_type: block.meta?.interaction_type || block.interaction_type,
        },
      });
    } else if (match[1]) {
      const engine = match[1];
      const label = match[2];
      const payload = match[3].trim();
      elements.push({
        id: `visual-${elementCount++}-${Date.now()}`,
        type: "visual",
        content: engine,
        meta: {
          engine,
          label,
          code: engine === "p5sketch" ? payload : undefined,
          commands: engine === "geogebra" ? (() => {
            try {
              const parsed = JSON.parse(payload);
              return Array.isArray(parsed.commands) ? parsed.commands : [];
            } catch(e) { return [payload]; }
          })() : undefined,
          options: engine === "geogebra" ? (() => {
            try {
              return JSON.parse(payload).options;
            } catch(e) { return undefined; }
          })() : undefined,
          image: engine === "show_figure" ? payload : undefined,
        }
      });
    } else if (match[4]) {
      // Self-closing VISUAL tag: <<VISUAL type="..." attr="..." />>
      const scEngine = match[4];
      const scAttrs = match[5] || "";
      const getAttr = (name: string) => {
        const m = scAttrs.match(new RegExp(`${name}="([^"]*)"`));
        return m ? m[1] : "";
      };

      if (scEngine === "desmos") {
        elements.push({
          id: `visual-${elementCount++}-${Date.now()}`,
          type: "visual",
          content: "desmos",
          meta: { engine: "desmos", label: getAttr("label") || "Graph", options: { expression: getAttr("expression") } }
        });
      } else if (scEngine === "show_figure" || scEngine === "image") {
        elements.push({
          id: `visual-${elementCount++}-${Date.now()}`,
          type: "visual",
          content: "show_figure",
          meta: { engine: "show_figure", label: getAttr("label") || "Textbook Figure", figure_id: getAttr("figure_id") }
        });
      } else {
        elements.push({
          id: `visual-${elementCount++}-${Date.now()}`,
          type: "visual",
          content: scEngine,
          meta: { engine: scEngine, label: getAttr("label") || "" }
        });
      }
    } else if (match[6]) {
      const type = match[6];
      let attrsRaw = match[7];

      if (type === "math_interactive") {
        // Raw interactive directive emitted as text (model wrote the tool call inline
        // instead of invoking it). Parse the attributes into an interactive element.
        // It carries no directive_id, so InteractiveBlock renders it read-only.
        // answer_key is intentionally never parsed or surfaced client-side.
        const getStr = (k: string) => {
          const m = attrsRaw.match(new RegExp(k + '="([^"]*)"'));
          return m ? m[1] : undefined;
        };
        const getObj = (k: string) => {
          const at = attrsRaw.indexOf(k + "=");
          if (at < 0) return undefined;
          const bs = attrsRaw.indexOf("{", at);
          if (bs < 0) return undefined;
          let depth = 0;
          let end = bs;
          for (let i = bs; i < attrsRaw.length; i++) {
            if (attrsRaw[i] === "{") depth++;
            else if (attrsRaw[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
          }
          const raw = attrsRaw.substring(bs, end);
          const tryParse = (s: string) => { try { return JSON.parse(s); } catch (e) { return undefined; } };
          let v = tryParse(raw);
          if (v === undefined && raw.startsWith("{{") && raw.endsWith("}}")) v = tryParse(raw.slice(1, -1));
          return v;
        };
        elements.push({
          id: `interactive-${elementCount++}-${Date.now()}`,
          type: "interactive",
          content: getStr("interactive_type") || "interactive",
          meta: {
            interactive_type: getStr("interactive_type"),
            label: getStr("label"),
            question: getStr("prompt"),
            render: getObj("render"),
            interaction: getObj("interaction"),
          },
        });
      } else if (type === "MATH_DRAW") {
        const typeMatch = attrsRaw.match(/type\s*=\s*[\\"]*([^\\"\s\>]+)[\\"]*/i);
        const paramsStart = attrsRaw.indexOf("params=");
        let params: any = {};
        if (paramsStart >= 0) {
          const jsonStart = attrsRaw.indexOf("{", paramsStart);
          if (jsonStart >= 0) {
            let depth = 0;
            let jsonEnd = jsonStart;
            for (let i = jsonStart; i < attrsRaw.length; i++) {
              if (attrsRaw[i] === "{") depth++;
              else if (attrsRaw[i] === "}") depth--;
              if (depth === 0) { jsonEnd = i + 1; break; }
            }
            try {
              let jsonStr = attrsRaw.substring(jsonStart, jsonEnd);
              if (jsonStr.includes('\\"')) jsonStr = jsonStr.replace(/\\"/g, '"');
              if (!jsonStr.includes('"') && jsonStr.includes("'")) jsonStr = jsonStr.replace(/'/g, '"');
              params = JSON.parse(jsonStr);
            } catch (e) {}
          }
        }
        const shapeType = typeMatch ? typeMatch[1] : "diagram";
        if (shapeType === "desmos") {
          elements.push({
            id: `el-${elementCount++}`,
            type: "widget",
            content: params.expression || "",
            meta: params
          });
        } else {
          elements.push({
            id: `el-${elementCount++}`,
            type: "svg",
            content: generateHistoricalSVG(shapeType, params),
            meta: { shape: shapeType, params, is_historical: true },
          });
        }
      } else if (type === "MATH_WIDGET") {
        const exprMatch = attrsRaw.match(/expression="([^"]+)"/);
        elements.push({
          id: `el-${elementCount++}`,
          type: "widget",
          content: exprMatch ? exprMatch[1] : "",
        });
      } else if (type === "SHOW_FIGURE") {
        const figureIdMatch = attrsRaw.match(/figure_id="([^"]+)"/) || attrsRaw.match(/\(([^)]+)\)/);
        elements.push({
          id: `el-${elementCount++}`,
          type: "visual",
          content: "show_figure",
          meta: {
            engine: "show_figure",
            label: "Textbook Figure",
            figure_id: figureIdMatch ? figureIdMatch[1] : "",
          },
        });
      } else if (["SPEAK_PARA", "DIFFICULT_WORD", "READ_ALOUD", "LISTEN_COMPREHENSION", "SHOW_FIGURE_DESCRIBE", "KARAOKE"].includes(type)) {
        try {
          const payload = JSON.parse(attrsRaw.trim());
          if (type === "DIFFICULT_WORD" && payload.word) {
            elements.push({
              id: `dw-${payload.directive_id || payload.word}-${Date.now()}`,
              type: "comprehension_widget",
              content: payload.word,
              meta: {
                widget_type: "difficult_word" as any,
                word: payload.word,
                syllables: payload.syllables,
                phonetic: payload.phonetic,
                slow_available: payload.slow_available,
                directive_id: payload.directive_id,
              },
            });
          } else if (type === "LISTEN_COMPREHENSION") {
            elements.push({
              id: `cw-${payload.directive_id || Date.now()}`,
              type: "comprehension_widget",
              content: payload.question || "",
              meta: {
                widget_type: "mcq",
                question: payload.question,
                choices: payload.options,
                directive_id: payload.directive_id,
              },
            });
          } else if (["SPEAK_PARA", "KARAOKE", "READ_ALOUD"].includes(type)) {
            elements.push({
              id: `sv-${payload.directive_id || Date.now()}`,
              type: "english_skill_view",
              content: payload.source_text || "",
              meta: { directive_id: payload.directive_id, mode: type }
            });
          }
        } catch (e) {
          console.error("Failed to parse English skill directive in history", e);
        }
      }
    } else if (match[8]) {
      elements.push({
        id: `svg-${elementCount++}-${Date.now()}`,
        type: "svg",
        content: normalizeSvg(match[8]),
        meta: { isRawBackendSvg: true },
      });
    }
    lastIndex = masterRegex.lastIndex;
  }

  const finalTrailing = content.substring(lastIndex);
  if (finalTrailing.trim()) {
    elements.push({
      id: `el-${elementCount++}-${Date.now()}`,
      type: "text",
      content: finalTrailing.trim(),
    });
  } else if (elements.length === 0 && content.trim()) {
    elements.push({
      id: `el-fallback-${Date.now()}`,
      type: "text",
      content: content.trim(),
    });
  }

  return elements;
}
