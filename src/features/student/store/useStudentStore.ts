import { create } from "zustand";
import { studentService } from "../services/studentService";
import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

// -- Types --------------------------------------------------------------------

export interface StudentProfile {
  user_id: string;
  username: string;
  email?: string;
  role: string;
  age?: number;
  grade?: number;
  school_board?: string;
}

export interface ChatElement {
  id: string;
  type: "text" | "svg" | "widget" | "image";
  content: string;
  meta?: any;
}

export interface ChatMessage {
  id: string;
  text: string;
  elements?: ChatElement[];
  sender: "user" | "ai";
  timestamp: string;
  isPlanning?: boolean;
  options?: string[];
  statusText?: string;
  toolStatus?: string;
}

export interface ChatSession {
  id: string;
  session_id?: string;
  title: string;
  agentType: string;
  agentIcon: string;
  lastActive: string;
  lastTopic: string;
  grade?: string;
  agent_id?: string;
  isFocused?: boolean;
  document_title?: string;
  subject?: string;
  chatMode?: "text" | "voice";
}

export interface SubjectItem {
  id: string;
  name: string;
  grade: string;
  icon: string;
  chaptersCount: number;
}

export interface AgentItem {
  agent_id: string;
  name: string;
  subject: string;
  grade: number;
}

export interface PartnerItem {
  id: string;
  partner_id?: string;
  organization: string;
}

export const AVAILABLE_SUBJECTS: SubjectItem[] = [
  {
    id: "sub-1",
    name: "Quantum Physics",
    grade: "Grade 12",
    icon: "⚛",
    chaptersCount: 12,
  },
  {
    id: "sub-2",
    name: "Medieval History",
    grade: "Grade 10",
    icon: "🏰",
    chaptersCount: 8,
  },
  {
    id: "sub-3",
    name: "Advanced Calculus",
    grade: "Grade 12",
    icon: "∑",
    chaptersCount: 15,
  },
  {
    id: "sub-4",
    name: "Essay Writing",
    grade: "Grade 9–12",
    icon: "✍️",
    chaptersCount: 6,
  },
  {
    id: "sub-5",
    name: "Research Methods",
    grade: "Grade 11",
    icon: "🔍",
    chaptersCount: 5,
  },
  {
    id: "sub-6",
    name: "Computer Science",
    grade: "Grade 10",
    icon: "💻",
    chaptersCount: 10,
  },
  {
    id: "sub-7",
    name: "Biology",
    grade: "Grade 11",
    icon: "🧬",
    chaptersCount: 14,
  },
  {
    id: "sub-8",
    name: "Economics",
    grade: "Grade 12",
    icon: "📊",
    chaptersCount: 9,
  },
  {
    id: "sub-9",
    name: "Chemistry",
    grade: "Grade 11",
    icon: "⚗️",
    chaptersCount: 11,
  },
  {
    id: "sub-10",
    name: "Literature",
    grade: "Grade 10",
    icon: "📖",
    chaptersCount: 7,
  },
];

// -- Visual Tag Parser --------------------------------------------------------

const SCHOLARLY_BLUEPRINT = `
<svg width="400" height="200" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="200" rx="12" fill="#F8FBF9"/>
  <path d="M0 20H400M0 40H400M0 60H400M0 80H400M0 100H400M0 120H400M0 140H400M0 160H400M0 180H400" stroke="#1A3A2A" stroke-opacity="0.03"/>
  <path d="M20 0V200M40 0V200M60 0V200M80 0V200M100 0V200M120 0V200M140 0V200M160 0V200M180 0V200M200 0V200M220 0V200M240 0V200M260 0V200M280 0V200M300 0V200M320 0V200M340 0V200M360 0V200M380 0V200" stroke="#1A3A2A" stroke-opacity="0.03"/>
  <rect x="100" y="50" width="200" height="100" rx="8" stroke="#1A3A2A" stroke-opacity="0.1" stroke-dasharray="4 4"/>
  <text x="200" y="105" text-anchor="middle" fill="#1A3A2A" fill-opacity="0.3" font-family="sans-serif" font-size="12" font-weight="bold" style="text-transform: uppercase; letter-spacing: 0.1em;">Scholarly Blueprint</text>
  <text x="200" y="125" text-anchor="middle" fill="#1A3A2A" fill-opacity="0.2" font-family="sans-serif" font-size="10">Visualization Ready</text>
</svg>
`;

function generateHistoricalSVG(type: string, params: any): string {
  const width = 400;
  const height = 280;

  // Normalize type: remove quotes, backslashes, and lowercase it
  type = type.replace(/[\\"]/g, '').toLowerCase().trim();

  let shapeMarkup = "";

  // Design Constants
  const brandGreen = "#059669";
  const darkInk = "#1A3A2A";
  const gridColor = "#1A3A2A";

  if (type === "rectangle") {
    const wVal = params.width || 5;
    const hVal = params.height || 3;
    const w = Math.min(wVal * 40, width - 120);
    const h = Math.min(hVal * 40, height - 120);
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    shapeMarkup = `
      <!-- Gradient Definition -->
      <defs>
        <linearGradient id="shapeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${brandGreen}" stop-opacity="0.08" />
          <stop offset="100%" stop-color="${brandGreen}" stop-opacity="0.15" />
        </linearGradient>
      </defs>

      <!-- Main Shape -->
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#shapeGradient)" stroke="${brandGreen}" stroke-width="2" />

      <!-- Width Dimension Line -->
      <g opacity="0.6">
        <line x1="${x}" y1="${y - 20}" x2="${x + w}" y2="${y - 20}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x}" y1="${y - 25}" x2="${x}" y2="${y - 15}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x + w}" y1="${y - 25}" x2="${x + w}" y2="${y - 15}" stroke="${darkInk}" stroke-width="1" />
        <text x="${x + w / 2}" y="${y - 32}" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="0.05em">${wVal} UNITS</text>
      </g>

      <!-- Height Dimension Line -->
      <g opacity="0.6">
        <line x1="${x + w + 20}" y1="${y}" x2="${x + w + 20}" y2="${y + h}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x + w + 15}" y1="${y}" x2="${x + w + 25}" y2="${y}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x + w + 15}" y1="${y + h}" x2="${x + w + 25}" y2="${y + h}" stroke="${darkInk}" stroke-width="1" />
        <text x="${x + w + 35}" y="${y + h / 2}" dominant-baseline="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="0.05em" transform="rotate(90, ${x + w + 35}, ${y + h / 2})">${hVal} UNITS</text>
      </g>
    `;
  } else if (type === "circle") {
    const isClock = params.highlight || params.showStepsBetween || (params.labels && params.labels.length > 0) || params.hour !== undefined || params.minute !== undefined;
    const rVal = params.radius || (isClock ? 5 : 2);
    const actualR = isClock ? 100 : Math.min(rVal * 40, 100);
    const cx = width / 2;
    const cy = height / 2;

    const baseCircle = `
      <defs>
        <radialGradient id="circleGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="${brandGreen}" stop-opacity="0.15" />
          <stop offset="100%" stop-color="${brandGreen}" stop-opacity="0.05" />
        </radialGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${actualR}" fill="url(#circleGradient)" stroke="${brandGreen}" stroke-width="2" />
    `;

    if (isClock) {
      let clockElements = "";
      
      if (params.highlight) {
        const { from, to, color, steps } = params.highlight;
        const startAngle = (from * 30 - 90);
        const endAngle = (from > to ? (to + 12) * 30 - 90 : to * 30 - 90);
        
        const startRad = startAngle * (Math.PI / 180);
        const endRad = endAngle * (Math.PI / 180);
        
        const arcX1 = cx + actualR * Math.cos(startRad);
        const arcY1 = cy + actualR * Math.sin(startRad);
        const arcX2 = cx + actualR * Math.cos(endRad);
        const arcY2 = cy + actualR * Math.sin(endRad);
        
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        
        clockElements += `
        <path d="M ${cx} ${cy} L ${arcX1} ${arcY1} A ${actualR} ${actualR} 0 ${largeArcFlag} 1 ${arcX2} ${arcY2} Z" fill="${color || '#F59E0B'}" fill-opacity="0.3" />`;
        
        if (steps) {
          for (let i = 1; i < steps; i++) {
            const angle = (startAngle + (endAngle - startAngle) * (i / steps)) * (Math.PI / 180);
            const x1 = cx + (actualR - 8) * Math.cos(angle);
            const y1 = cy + (actualR - 8) * Math.sin(angle);
            const x2 = cx + actualR * Math.cos(angle);
            const y2 = cy + actualR * Math.sin(angle);
            clockElements += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color || '#F59E0B'}" stroke-width="2" />`;
          }
        }
      }

      if (params.showStepsBetween) {
        params.showStepsBetween.forEach((pair: [number, number]) => {
          const [start, end] = pair;
          const startAngle = (start * 30 - 90);
          const endAngle = (start > end ? (end + 12) * 30 - 90 : end * 30 - 90);
          const steps = params.highlight?.steps || 5;
          for (let i = 1; i < steps; i++) {
            const angle = (startAngle + (endAngle - startAngle) * (i / steps)) * (Math.PI / 180);
            const x1 = cx + (actualR - 5) * Math.cos(angle);
            const y1 = cy + (actualR - 5) * Math.sin(angle);
            const x2 = cx + actualR * Math.cos(angle);
            const y2 = cy + actualR * Math.sin(angle);
            clockElements += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${darkInk}" stroke-width="1" opacity="0.5" />`;
          }
        });
      }

      if (params.labels && Array.isArray(params.labels)) {
        params.labels.forEach((label: any) => {
          const lx = cx + (label.x * actualR * 0.85); // Adjust offset for labels
          const ly = cy - (label.y * actualR * 0.85);
          clockElements += `<text x="${lx}" y="${ly}" dominant-baseline="middle" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="12" font-weight="bold">${label.text}</text>`;
        });
      } else {
        for (let i = 1; i <= 12; i++) {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = cx + (actualR - 10) * Math.cos(angle);
          const y1 = cy + (actualR - 10) * Math.sin(angle);
          const x2 = cx + actualR * Math.cos(angle);
          const y2 = cy + actualR * Math.sin(angle);
          clockElements += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${darkInk}" stroke-width="2" />`;
          
          const tx = cx + (actualR - 25) * Math.cos(angle);
          const ty = cy + (actualR - 25) * Math.sin(angle);
          clockElements += `<text x="${tx}" y="${ty}" dominant-baseline="middle" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="12" font-weight="bold">${i}</text>`;
        }
      }

      // Render Hands
      if (params.hour !== undefined) {
        const hAngle = ((params.hour % 12) * 30 + (params.minute || 0) * 0.5 - 90) * (Math.PI / 180);
        const hx = cx + (actualR * 0.5) * Math.cos(hAngle);
        const hy = cy + (actualR * 0.5) * Math.sin(hAngle);
        clockElements += `<line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" stroke="${darkInk}" stroke-width="4" stroke-linecap="round" />`;
      }
      
      if (params.minute !== undefined) {
        const mAngle = (params.minute * 6 - 90) * (Math.PI / 180);
        const mx = cx + (actualR * 0.8) * Math.cos(mAngle);
        const my = cy + (actualR * 0.8) * Math.sin(mAngle);
        clockElements += `<line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="${brandGreen}" stroke-width="3" stroke-linecap="round" />`;
      }

      if (params.hour !== undefined || params.minute !== undefined) {
        clockElements += `<circle cx="${cx}" cy="${cy}" r="4" fill="${darkInk}" />`;
      }

      shapeMarkup = baseCircle + clockElements;
    } else {
      shapeMarkup = baseCircle + `
        <!-- Radius Line -->
        <g opacity="0.6">
          <line x1="${cx}" y1="${cy}" x2="${cx + actualR}" y2="${cy}" stroke="${darkInk}" stroke-width="1.5" stroke-dasharray="4 2" />
          <circle cx="${cx}" cy="${cy}" r="2.5" fill="${darkInk}" />
          <text x="${cx + actualR / 2}" y="${cy - 12}" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="0.05em">R = ${rVal}</text>
        </g>
      `;
    }
  } else if (type === "triangle") {
    const base = params.base || 4;
    const heightVal = params.height || 3;
    const isRight = params.type === "right";
    
    const w = Math.min(base * 30, width - 120);
    const h = Math.min(heightVal * 30, height - 120);
    const x = (width - w) / 2;
    const y = (height + h) / 2;
    
    let pathD = "";
    if (isRight) {
      pathD = `M ${x} ${y} L ${x + w} ${y} L ${x} ${y - h} Z`;
    } else {
      pathD = `M ${x} ${y} L ${x + w} ${y} L ${x + w / 2} ${y - h} Z`;
    }

    shapeMarkup = `
      <defs>
        <linearGradient id="triGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${brandGreen}" stop-opacity="0.08" />
          <stop offset="100%" stop-color="${brandGreen}" stop-opacity="0.15" />
        </linearGradient>
      </defs>
      <path d="${pathD}" fill="url(#triGradient)" stroke="${brandGreen}" stroke-width="2" />
      
      <!-- Base Dimension -->
      <g opacity="0.6">
        <line x1="${x}" y1="${y + 15}" x2="${x + w}" y2="${y + 15}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x}" y1="${y + 10}" x2="${x}" y2="${y + 20}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x + w}" y1="${y + 10}" x2="${x + w}" y2="${y + 20}" stroke="${darkInk}" stroke-width="1" />
        <text x="${x + w / 2}" y="${y + 30}" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="0.05em">BASE = ${base}</text>
      </g>
      
      <!-- Height Dimension -->
      <g opacity="0.6">
        <line x1="${isRight ? x - 15 : x + w / 2}" y1="${y}" x2="${isRight ? x - 15 : x + w / 2}" y2="${y - h}" stroke="${darkInk}" stroke-width="1" stroke-dasharray="4 2" />
        <text x="${isRight ? x - 20 : x + w / 2 + 5}" y="${y - h / 2}" dominant-baseline="middle" text-anchor="${isRight ? 'end' : 'start'}" fill="${darkInk}" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="0.05em">H = ${heightVal}</text>
      </g>
    `;
  } else if (type === "line" || type === "number_line") {
    const length = params.length || 10;
    const start = params.start || 0;
    const end = params.end || length;
    const step = params.step || 1;
    
    const margin = 40;
    const lineY = height / 2;
    const lineW = width - (margin * 2);
    const scale = lineW / (end - start);
    
    let ticks = "";
    for (let i = start; i <= end; i += step) {
      const tx = margin + (i - start) * scale;
      ticks += `
        <line x1="${tx}" y1="${lineY - 5}" x2="${tx}" y2="${lineY + 5}" stroke="${darkInk}" stroke-width="2" />
        <text x="${tx}" y="${lineY + 20}" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="10" font-weight="bold">${i}</text>
      `;
    }
    
    let highlightMarkup = "";
    if (params.highlight && params.highlight.start !== undefined && params.highlight.end !== undefined) {
      const hx = margin + (params.highlight.start - start) * scale;
      const hw = (params.highlight.end - params.highlight.start) * scale;
      highlightMarkup = `
        <rect x="${hx}" y="${lineY - 10}" width="${hw}" height="20" rx="4" fill="${brandGreen}" fill-opacity="0.3" />
        <line x1="${hx}" y1="${lineY}" x2="${hx + hw}" y2="${lineY}" stroke="${brandGreen}" stroke-width="4" />
      `;
    }
    
    shapeMarkup = `
      <!-- Main Line -->
      <line x1="${margin - 10}" y1="${lineY}" x2="${width - margin + 10}" y2="${lineY}" stroke="${darkInk}" stroke-width="2" />
      
      <!-- Arrows -->
      <path d="M ${margin - 10} ${lineY} L ${margin - 5} ${lineY - 5} L ${margin - 5} ${lineY + 5} Z" fill="${darkInk}" />
      <path d="M ${width - margin + 10} ${lineY} L ${width - margin + 5} ${lineY - 5} L ${width - margin + 5} ${lineY + 5} Z" fill="${darkInk}" />
      
      ${highlightMarkup}
      ${ticks}
    `;
  } else if (type === "calendar") {
    const month = params.month || 1; // 1-12
    const year = params.year || 2024;
    const startDay = params.startDay || "Sunday"; // Sunday, Monday, etc.
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
    
    // Simple logic for days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(startDay);
    
    const cellW = 40;
    const cellH = 30;
    const gridW = cellW * 7;
    const startX = (width - gridW) / 2;
    const startY = 80;
    
    let calendarMarkup = `
      <text x="${width / 2}" y="50" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="16" font-weight="800">${monthNames[month - 1]} ${year}</text>
    `;
    
    // Day headers
    for (let i = 0; i < 7; i++) {
      calendarMarkup += `
        <text x="${startX + i * cellW + cellW / 2}" y="${startY - 10}" text-anchor="middle" fill="${darkInk}" fill-opacity="0.4" font-family="Inter, sans-serif" font-size="10" font-weight="bold">${dayLabels[i]}</text>
      `;
    }
    
    // Grid and days
    for (let i = 0; i < 42; i++) {
      const row = Math.floor(i / 7);
      const col = i % 7;
      const x = startX + col * cellW;
      const y = startY + row * cellH;
      const dayNum = i - firstDayIndex + 1;
      
      calendarMarkup += `
        <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" stroke="${darkInk}" stroke-opacity="0.05" fill="none" />
      `;
      
      if (dayNum > 0 && dayNum <= daysInMonth) {
        calendarMarkup += `
          <text x="${x + cellW / 2}" y="${y + cellH / 2}" dominant-baseline="middle" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="12" font-weight="bold">${dayNum}</text>
        `;
      }
    }
    
    shapeMarkup = calendarMarkup;
  } else if (type === "coordinate_plane") {
    const points: Array<{ x: number; y: number; label?: string }> = params.points || [];
    const lines: Array<{ p1: [number, number]; p2: [number, number]; label?: string }> = params.lines || [];

    // Determine the range from points, default to [-1, 5] with safety filters
    const allX = points.map((p) => p.x).filter(v => typeof v === 'number' && !isNaN(v))
      .concat(lines.flatMap((l) => [l.p1?.[0], l.p2?.[0]]).filter(v => typeof v === 'number' && !isNaN(v)));
    const allY = points.map((p) => p.y).filter(v => typeof v === 'number' && !isNaN(v))
      .concat(lines.flatMap((l) => [l.p1?.[1], l.p2?.[1]]).filter(v => typeof v === 'number' && !isNaN(v)));
    const minX = Math.min(0, ...allX) - 1;
    const maxX = Math.max(1, ...allX) + 1;
    const minY = Math.min(0, ...allY) - 1;
    const maxY = Math.max(1, ...allY) + 1;

    const margin = 48;
    const plotW = width - margin * 2;
    const plotH = height - margin * 2;

    // Mapping functions: data coords → SVG px
    const toSvgX = (x: number) => margin + ((x - minX) / (maxX - minX)) * plotW;
    const toSvgY = (y: number) => margin + height - margin * 2 - ((y - minY) / (maxY - minY)) * plotH;

    // Grid
    let gridLines = "";
    for (let gx = Math.ceil(minX); gx <= Math.floor(maxX); gx++) {
      const sx = toSvgX(gx);
      gridLines += `<line x1="${sx}" y1="${margin}" x2="${sx}" y2="${height - margin}" stroke="${gridColor}" stroke-width="0.5" stroke-opacity="0.08"/>`;
      if (gx !== 0) {
        gridLines += `<text x="${sx}" y="${toSvgY(0) + 14}" text-anchor="middle" fill="${darkInk}" font-family="Inter,sans-serif" font-size="9" fill-opacity="0.4">${gx}</text>`;
      }
    }
    for (let gy = Math.ceil(minY); gy <= Math.floor(maxY); gy++) {
      const sy = toSvgY(gy);
      gridLines += `<line x1="${margin}" y1="${sy}" x2="${width - margin}" y2="${sy}" stroke="${gridColor}" stroke-width="0.5" stroke-opacity="0.08"/>`;
      if (gy !== 0) {
        gridLines += `<text x="${toSvgX(0) - 10}" y="${sy + 4}" text-anchor="end" fill="${darkInk}" font-family="Inter,sans-serif" font-size="9" fill-opacity="0.4">${gy}</text>`;
      }
    }

    // Axes
    const ox = toSvgX(0);
    const oy = toSvgY(0);
    const axes = `
      <line x1="${margin}" y1="${oy}" x2="${width - margin}" y2="${oy}" stroke="${darkInk}" stroke-width="1.5" stroke-opacity="0.3"/>
      <line x1="${ox}" y1="${margin}" x2="${ox}" y2="${height - margin}" stroke="${darkInk}" stroke-width="1.5" stroke-opacity="0.3"/>
      <text x="${width - margin + 6}" y="${oy + 4}" fill="${darkInk}" font-family="Inter,sans-serif" font-size="10" font-weight="bold" fill-opacity="0.4">x</text>
      <text x="${ox + 4}" y="${margin - 4}" fill="${darkInk}" font-family="Inter,sans-serif" font-size="10" font-weight="bold" fill-opacity="0.4">y</text>
      <text x="${ox - 10}" y="${oy + 14}" text-anchor="middle" fill="${darkInk}" font-family="Inter,sans-serif" font-size="9" fill-opacity="0.4">0</text>
    `;

    // Lines between points
    let lineMarkup = "";
    lines.forEach((l) => {
      const x1 = toSvgX(l.p1[0]);
      const y1 = toSvgY(l.p1[1]);
      const x2 = toSvgX(l.p2[0]);
      const y2 = toSvgY(l.p2[1]);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      lineMarkup += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${brandGreen}" stroke-width="2" stroke-linecap="round"/>`;
      if (l.label) {
        lineMarkup += `<text x="${midX + 5}" y="${midY - 5}" fill="${brandGreen}" font-family="Inter,sans-serif" font-size="10" font-weight="700">${l.label}</text>`;
      }
    });

    // Points
    let pointMarkup = "";
    points.forEach((p) => {
      const sx = toSvgX(p.x);
      const sy = toSvgY(p.y);
      pointMarkup += `<circle cx="${sx}" cy="${sy}" r="4.5" fill="${brandGreen}" stroke="white" stroke-width="1.5"/>`;
      if (p.label) {
        pointMarkup += `<text x="${sx + 8}" y="${sy - 6}" fill="${darkInk}" font-family="Inter,sans-serif" font-size="11" font-weight="700">${p.label}</text>`;
      }
    });

    shapeMarkup = gridLines + axes + lineMarkup + pointMarkup;
  } else if (type === "point" || type === "coordinate") {
    // Treat (0,0) as center if they are small relative numbers, or use as absolute if large
    // AI usually sends 0,0 for center
    const rawX = typeof params.x === 'number' ? params.x : 0;
    const rawY = typeof params.y === 'number' ? params.y : 0;
    
    // Simple heuristic: if coords are small (e.g. < 50), treat them as relative to center
    const x = Math.abs(rawX) < 100 ? (width / 2) + rawX * 20 : rawX;
    const y = Math.abs(rawY) < 100 ? (height / 2) - rawY * 20 : rawY;
    
    const label = params.label || "";
    const color = params.color || "#FF6B35";
    
    shapeMarkup = `
      <circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="white" stroke-width="2" />
      <circle cx="${x}" cy="${y}" r="12" fill="${color}" fill-opacity="0.15" />
      ${label ? `
        <text x="${x}" y="${y + 25}" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="12" font-weight="800">${label}</text>
      ` : ""}
    `;
  } else {
    return SCHOLARLY_BLUEPRINT;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="24" fill="#FBFBFA"/>

  <!-- Subtle Blueprint Grid -->
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridColor}" stroke-width="0.5" stroke-opacity="0.04"/>
  </pattern>
  <rect width="100%" height="100%" fill="url(#grid)" rx="24" />

  ${shapeMarkup}

  ${
    params.label
      ? `
    <rect x="${width / 2 - 60}" y="${height - 35}" width="120" height="20" rx="10" fill="${darkInk}" fill-opacity="0.03" />
    <text x="${width / 2}" y="${height - 21}" text-anchor="middle" fill="${darkInk}" fill-opacity="0.4" font-family="Inter, sans-serif" font-size="10" font-weight="800" style="text-transform: uppercase; letter-spacing: 0.15em;">${params.label}</text>
  `
      : ""
  }
</svg>`;
}

function parseContent(content: string): ChatElement[] {
  if (!content) return [];
  const elements: ChatElement[] = [];
  // Detect special visual tags AND raw SVG blocks
  const visualTagRegex = /(?:<<|<)(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE)\s+([\s\S]*?)(?:>>|>|$)/g;
  const rawSvgRegex = /<svg[\s\S]*?<\/svg>/g;
  let elementCount = 0;

  let lastIndex = 0;
  let match;

  while ((match = visualTagRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      elements.push({
        id: `el-${elementCount++}`,
        type: "text",
        content: textBefore.trim(),
      });
    }

    const type = match[1];
    let attrsRaw = match[2];

    if (type === "MATH_DRAW") {
      // More robust type extraction handling escaped quotes, single quotes, or no quotes
      const typeMatch = attrsRaw.match(/type\s*=\s*[\\"]*([^\\"\s\>]+)[\\"]*/i);
      // Handle nested JSON by finding balanced braces
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
            // Robust unescaping for historical JSON strings
            if (jsonStr.includes('\\"')) {
              jsonStr = jsonStr.replace(/\\"/g, '"');
            }
            // Fix single quotes for AI-generated JSON
            if (!jsonStr.includes('"') && jsonStr.includes("'")) {
              jsonStr = jsonStr.replace(/'/g, '"');
            }
            params = JSON.parse(jsonStr);
          } catch (e) {
            console.warn("[Parser] Failed to parse params for", type, attrsRaw.substring(jsonStart, jsonEnd), e);
          }
        }
      }

      const shapeType = typeMatch ? typeMatch[1] : "diagram";

      if (shapeType === "desmos") {
        elements.push({
          id: `el-${elementCount++}`,
          type: "widget",
          content: params.expression || "",
          meta: {
            ...params
          }
        });
      } else {
        elements.push({
          id: `el-${elementCount++}`,
          type: "svg",
          content: generateHistoricalSVG(shapeType, params),
          meta: {
            shape: shapeType,
            params,
            is_historical: true,
          },
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
        type: "svg",
        content: "", // Optimized: content not needed as VisualBlock handles placeholder/fetching
        meta: {
          shape: "image",
          source: "show_figure",
          figure_id: figureIdMatch ? figureIdMatch[1] : "",
        },
      });
    }

    lastIndex = visualTagRegex.lastIndex;
  }

  // 2. Process any remaining text for raw SVG blocks
  const remainingTextAfterTags = content.substring(lastIndex);
  let rawLastIndex = 0;
  let rawMatch;

  while ((rawMatch = rawSvgRegex.exec(remainingTextAfterTags)) !== null) {
    const textBefore = remainingTextAfterTags.substring(rawLastIndex, rawMatch.index);
    if (textBefore.trim()) {
      elements.push({
        id: `el-${elementCount++}-${Date.now()}`,
        type: "text",
        content: textBefore.trim(),
      });
    }

    elements.push({
      id: `svg-${elementCount++}-${Date.now()}`,
      type: "svg",
      content: rawMatch[0],
    });

    rawLastIndex = rawSvgRegex.lastIndex;
  }

  const finalTrailing = remainingTextAfterTags.substring(rawLastIndex);
  if (finalTrailing.trim()) {
    elements.push({
      id: `el-${elementCount++}-${Date.now()}`,
      type: "text",
      content: finalTrailing.trim(),
    });
  } else if (elements.length === 0 && content.trim()) {
    // Fallback if nothing was matched but there is content
    elements.push({
      id: `el-fallback-${Date.now()}`,
      type: "text",
      content: content.trim(),
    });
  }

  return elements;
}

const MAX_CACHED_SESSIONS = 10;

/**
 * Ensures the chat cache doesn't grow indefinitely by evicting the oldest sessions
 */
const manageCacheEviction = (cache: Record<string, ChatMessage[]>, newSessionId: string, newMessages: ChatMessage[]) => {
  const updatedCache = { ...cache, [newSessionId]: newMessages };
  const sessionIds = Object.keys(updatedCache);
  
  if (sessionIds.length > MAX_CACHED_SESSIONS) {
    // Simple FIFO eviction: remove the first key (oldest)
    const oldestSessionId = sessionIds[0];
    // Don't evict the current session we just added
    if (oldestSessionId !== newSessionId) {
      delete updatedCache[oldestSessionId];
    } else if (sessionIds.length > 1) {
      delete updatedCache[sessionIds[1]];
    }
  }
  
  return updatedCache;
};

// -- Store interface ----------------------------------------------------------─

interface StudentState {
  studentProfile: StudentProfile | null;
  recentChats: ChatSession[];
  activeChat: ChatSession | null;
  messages: ChatMessage[];
  chatMessagesCache: Record<string, ChatMessage[]>;
  isChatOpen: boolean;
  isProfileOpen: boolean;
  isAgentPickerOpen: boolean;
  isAITyping: boolean;
  typingChatIds: string[];
  isSessionsLoading: boolean;
  isHistoryLoading: boolean;
  historyAbortController: AbortController | null;
  availableAgents: AgentItem[];
  isAgentsLoading: boolean;
  availablePartners: PartnerItem[];
  enrolledPartners: PartnerItem[];
  isEnrolledPartnersLoading: boolean;
  partnerRequestStatus: "idle" | "loading" | "success" | "error";
  partnerRequestMessage: string;
  isPartnerModalOpen: boolean;
  streamingMessageId: string | null;
  chatAbortController: AbortController | null;
  voiceSessionStatus: "idle" | "connecting" | "active" | "error";
  hasFetchedSessions: boolean;
  hasFetchedAgents: boolean;

  // Actions
  setStudentProfile: (profile: StudentProfile) => void;
  fetchSessions: () => Promise<void>;
  fetchAvailableAgents: () => Promise<void>;
  fetchAvailablePartners: () => Promise<void>;
  fetchEnrolledPartners: () => Promise<void>;
  fetchChatHistory: (sessionId: string) => Promise<void>;
  openExistingChat: (chat: ChatSession) => void;
  openChatById: (sessionId: string) => Promise<void>;
  openNewChat: (agent: AgentItem) => string;
  initNewChat: (agentId: string) => void;
  startFocusedSession: (documentTitle: string, subject: string) => string;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  setProfileOpen: (open: boolean) => void;
  setAgentPickerOpen: (open: boolean) => void;
  setPartnerModalOpen: (open: boolean) => void;
  sendPartnerRequest: (partnerId: string) => Promise<void>;
  linkParent: (parentEmailOrPhone: string) => Promise<void>;
  stopMessageGeneration: () => void;
  startVoiceSession: () => Promise<void>;
  stopVoiceSession: () => void;
  logoutStudent: () => void;
}

// -- Store --------------------------------------------------------------------─

export const useStudentStore = create<StudentState>((set, get) => ({
  studentProfile: null,
  recentChats: [],
  activeChat: null,
  messages: [],
  chatMessagesCache: {},
  typingChatIds: [],
  isChatOpen: false,
  isProfileOpen: false,
  isAgentPickerOpen: false,
  isAITyping: false,
  isSessionsLoading: false,
  isHistoryLoading: false,
  historyAbortController: null,
  availableAgents: [],
  isAgentsLoading: false,
  availablePartners: [],
  enrolledPartners: [],
  isEnrolledPartnersLoading: false,
  partnerRequestStatus: "idle",
  partnerRequestMessage: "",
  isPartnerModalOpen: false,
  streamingMessageId: null,
  chatAbortController: null,
  voiceSessionStatus: "idle",
  hasFetchedSessions: false,
  hasFetchedAgents: false,

  setStudentProfile: (profile) => set({ studentProfile: profile }),

  fetchSessions: async () => {
    const { studentProfile, isSessionsLoading, hasFetchedSessions } = get();
    if (!studentProfile || isSessionsLoading || hasFetchedSessions) return;

    set({ isSessionsLoading: true });
    try {
      const data = await studentService.fetchSessions(studentProfile.user_id);
      console.log("📂 [StudentStore] Raw Sessions Data:", data);

      const mappedChats: ChatSession[] = data.sessions.map((s: any) => ({
        id: s.session_id,
        session_id: s.session_id,
        title: s.title || s.agent_name || "Scholarly Session",
        agentType: "English Assistant",
        agentIcon: "📖",
        lastActive: s.updated_at
          ? new Date(s.updated_at).toLocaleDateString()
          : "Recently",
        lastTopic: "Continued Learning",
        grade: "", // Grade is handled via student profile
        agent_id: s.subject_agent, // Mapping backend agent field
        subject: s.subject || "", 
      }));

      set({ recentChats: mappedChats, isSessionsLoading: false, hasFetchedSessions: true });
    } catch (error) {
      console.error("Fetch Sessions Error:", error);
      set({ isSessionsLoading: false });
    }
  },

  fetchAvailableAgents: async () => {
    const { studentProfile, isAgentsLoading, hasFetchedAgents } = get();
    if (!studentProfile || isAgentsLoading || hasFetchedAgents) return;

    set({ isAgentsLoading: true });
    try {
      const data = await studentService.fetchAvailableAgents(
        studentProfile.user_id,
      );

      // Flatten the nested structure: data.partners[].subjects[].agents[]
      const agents: AgentItem[] = [];
      if (data.partners && Array.isArray(data.partners)) {
        data.partners.forEach((partner: any) => {
          if (partner.subjects && Array.isArray(partner.subjects)) {
            partner.subjects.forEach((subject: any) => {
              if (subject.agents && Array.isArray(subject.agents)) {
                agents.push(...subject.agents);
              }
            });
          }
        });
      }

      set({ availableAgents: agents, isAgentsLoading: false, hasFetchedAgents: true });
    } catch (error) {
      console.error("Fetch Agents Error:", error);
      set({ availableAgents: [], isAgentsLoading: false });
    }
  },

  fetchAvailablePartners: async () => {
    try {
      const data: PartnerItem[] = await studentService.fetchAvailablePartners();
      set({ availablePartners: data });
    } catch (error) {
      console.error("Fetch Partners Error:", error);
    }
  },

  fetchEnrolledPartners: async () => {
    const { studentProfile } = get();
    if (!studentProfile) return;

    set({ isEnrolledPartnersLoading: true });
    try {
      const data = await studentService.fetchEnrolledPartners(
        studentProfile.user_id,
      );
      set({
        enrolledPartners: data.partners || [],
        isEnrolledPartnersLoading: false,
      });
    } catch (error) {
      console.error("Fetch Enrolled Partners Error:", error);
      set({ isEnrolledPartnersLoading: false });
    }
  },

  sendPartnerRequest: async (partnerId: string) => {
    const { studentProfile } = get();
    if (!studentProfile?.user_id) {
      set({
        isPartnerModalOpen: true,
        partnerRequestStatus: "error",
        partnerRequestMessage: "Student profile not found.",
      });
      return;
    }

    set({
      isPartnerModalOpen: true,
      partnerRequestStatus: "loading",
      partnerRequestMessage: "Sending request...",
    });

    try {
      const data = await studentService.sendPartnerRequest(
        studentProfile.user_id,
        partnerId,
      );
      const message =
        data.message ||
        data.organization ||
        "Successfully enrolled in partner module.";

      set({
        partnerRequestStatus: "success",
        partnerRequestMessage: String(message),
      });
    } catch (error: any) {
      console.error("Partner Request Error:", error);
      let errorMessage =
        error?.message || "Failed to send partner request. Please try again.";
      if (typeof errorMessage !== "string") {
        errorMessage = JSON.stringify(errorMessage);
      }
      set({
        partnerRequestStatus: "error",
        partnerRequestMessage: errorMessage,
      });
    }
  },

  linkParent: async (parentEmailOrPhone: string) => {
    const { studentProfile } = get();
    if (!studentProfile?.user_id) {
      set({
        isPartnerModalOpen: true,
        partnerRequestStatus: "error",
        partnerRequestMessage: "Student profile not found.",
      });
      return;
    }

    set({
      isPartnerModalOpen: true,
      partnerRequestStatus: "loading",
      partnerRequestMessage: "Linking parent profile...",
    });

    try {
      await studentService.linkParent(
        studentProfile.user_id,
        parentEmailOrPhone,
      );
      set({
        partnerRequestStatus: "success",
        partnerRequestMessage: "Parent successfully linked to your profile.",
      });
    } catch (error: any) {
      console.error("Link Parent Error:", error);
      let errorMessage =
        error?.message ||
        "Failed to link parent. Please check the ID and try again.";
      if (typeof errorMessage !== "string") {
        errorMessage = JSON.stringify(errorMessage);
      }

      set({
        partnerRequestStatus: "error",
        partnerRequestMessage: errorMessage,
      });
    }
  },

  fetchChatHistory: async (sessionId: string) => {
    const { studentProfile, historyAbortController } = get();
    if (!studentProfile) return;

    // Abort any existing history request
    if (historyAbortController) {
      historyAbortController.abort();
    }

    const controller = new AbortController();
    set({ isHistoryLoading: true, historyAbortController: controller });

    try {
      const response = await authFetch(`${API_BASE_URL}/get-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: studentProfile.user_id,
          session_id: sessionId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();

      const mappedMessages: ChatMessage[] = (data.history || []).map(
        (h: any, i: number) => {
          const content = h.content || "";
          const elements = parseContent(content);

          return {
            id: `h-${i}-${Date.now()}`,
            text: content.replace(/(?:<<|<)(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE)[\s\S]*?(?:>>|>)/g, "").replace(/<svg[\s\S]*?<\/svg>/g, "").trim(),
            elements:
              elements.length > 1 ||
              (elements.length === 1 && elements[0].type !== "text")
                ? elements
                : undefined,
            sender: h.role === "user" ? "user" : "ai",
            timestamp: h.created_at
              ? new Date(h.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
          };
        },
      );

      set((state) => {
        const isActive = state.activeChat?.id === sessionId;
        return {
          messages: isActive ? mappedMessages : state.messages,
          chatMessagesCache: manageCacheEviction(state.chatMessagesCache, sessionId, mappedMessages),
          isHistoryLoading: false,
          historyAbortController: null,
        };
      });
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.debug("History fetch aborted for session:", sessionId);
      } else {
        console.error("Fetch History Error:", error);
      }
      set({ isHistoryLoading: false, historyAbortController: null });
    }
  },

  openExistingChat: async (chat) => {
    // Open UI immediately
    set((state) => ({
      activeChat: chat,
      isChatOpen: true,
      isAgentPickerOpen: false,
      isAITyping: state.typingChatIds.includes(chat.id),
      messages: state.chatMessagesCache[chat.id] || [], // Use cached messages if available
    }));

    // Fetch real history only if we are not currently waiting for an AI response
    // to prevent overwriting the optimistic latest message
    if (!get().typingChatIds.includes(chat.id)) {
      await get().fetchChatHistory(chat.id);
    }
  },

  openChatById: async (sessionId) => {
    const {
      recentChats,
      fetchSessions,
      fetchChatHistory,
      openNewChat,
      startFocusedSession,
    } = get();

    // Handle transient 'new' state on refresh
    if (sessionId === "new") {
      fetchSessions(); // Load history in background
      openNewChat({
        name: "Socratic Tutor",
        agent_id: "eng-grade-4",
        subject: "General",
        grade: 10,
      });
      return;
    }

    // Handle transient 'new-focused' state on refresh by recovering context from sessionStorage
    if (sessionId === "new-focused") {
      fetchSessions(); // Load history in background
      const savedContext = sessionStorage.getItem("pending_focused_session");
      if (savedContext) {
        try {
          const { subject, documentTitle } = JSON.parse(savedContext);
          startFocusedSession(subject, documentTitle);
          return;
        } catch {
          console.error("Failed to recover focused session context");
        }
      }
      // If no context, we can't recover - redirect to home
      window.location.href = "/student";
      return;
    }

    // 1. Try to find in existing list
    let chat = recentChats.find((c) => c.id === sessionId);

    // 2. If not found, it might be a refresh - fetch sessions
    if (!chat) {
      await fetchSessions();
      chat = get().recentChats.find((c) => c.id === sessionId);
    }

    // 3. If found now, open it and trigger history
    if (chat) {
      set((state) => ({
        activeChat: chat,
        isChatOpen: true,
        isAITyping: state.typingChatIds.includes(sessionId),
        messages: state.chatMessagesCache[sessionId] || [],
      }));

      // Trigger history fetch if not cached
      if (!get().chatMessagesCache[sessionId]) {
        await fetchChatHistory(sessionId);
      }
    } else if (!get().isSessionsLoading && get().hasFetchedSessions) {
      console.error("Chat not found even after fetching sessions:", sessionId);
      // Fallback: redirect home only if we are SURE it's not there
      window.location.href = "/student";
    }
  },

  openNewChat: (agent: AgentItem) => {
    const newSession: ChatSession = {
      id: "new",
      title: agent.name,
      subject: agent.subject,
      agentType: "Socratic Tutor",
      agentIcon: "🤖",
      lastActive: "Just now",
      lastTopic: "New Session",
      grade: `Grade ${agent.grade}`,
      agent_id: agent.agent_id,
    };

    set((state) => ({
      activeChat: newSession,
      messages: [],
      chatMessagesCache: { ...state.chatMessagesCache, ["new"]: [] },
      isChatOpen: true,
      isAgentPickerOpen: false,
      isAITyping: false,
    }));

    return "new";
  },

  initNewChat: (agentId: string) => {
    const { availableAgents } = get();
    // If agents aren't loaded yet, we can't fully init, but fetchAvailableAgents
    // is called on StudentHome mount. Here we try to find the agent.
    const agent = availableAgents.find((a) => a.agent_id === agentId);

    if (agent) {
      const newSession: ChatSession = {
        id: "new",
        title: agent.name,
        subject: agent.subject,
        agentType: "Socratic Tutor",
        agentIcon: "🤖",
        lastActive: "Just now",
        lastTopic: "New Session",
        grade: `Grade ${agent.grade}`,
        agent_id: agent.agent_id,
      };
      set({ activeChat: newSession, isChatOpen: true });
    }
  },

  startFocusedSession: (documentTitle, subject) => {
    const { availableAgents, studentProfile } = get();

    // Find matching agent for the subject
    const matchingAgent = availableAgents.find(
      (a) => a.subject.toLowerCase() === subject.toLowerCase(),
    );

    const tempId = "new-focused";
    const newSession: ChatSession = {
      id: tempId,
      session_id: "", // First message requires empty session_id
      title: documentTitle,
      agentType: "Focused Tutor",
      agentIcon: "🎯",
      lastActive: "Just now",
      lastTopic: subject,
      grade: studentProfile?.grade
        ? `Grade ${studentProfile.grade}`
        : "General",
      agent_id: matchingAgent?.agent_id || "eng-grade-4", // Fallback
      isFocused: true,
      document_title: documentTitle,
      subject: subject,
    };

    // Navigation to /student/chat is handled by the calling component via router.push

    // Save context for refresh recovery
    sessionStorage.setItem(
      "pending_focused_session",
      JSON.stringify({ subject, documentTitle }),
    );

    set((state) => ({
      activeChat: newSession,
      isChatOpen: true,
      messages: [],
      chatMessagesCache: { ...state.chatMessagesCache, [tempId]: [] },
      isAITyping: false,
    }));

    return tempId;
  },

  closeChat: () => {
    const { historyAbortController } = get();
    if (historyAbortController) {
      historyAbortController.abort();
    }
    set({
      isChatOpen: false,
      activeChat: null,
      messages: [],
      isAITyping: false,
      isHistoryLoading: false,
      historyAbortController: null,
    });
  },

  startVoiceSession: async () => {
    const { activeChat, studentProfile } = get();
    if (!activeChat || !studentProfile) return;

    // Enforce text mode restriction
    if (activeChat.chatMode === "text") return;

    console.log("🎙️ [StudentStore] Starting Voice Session for Chat:", activeChat);
    set({ voiceSessionStatus: "connecting" });

    // Set chat mode to voice if not already set
    if (!activeChat.chatMode) {
      set((state) => ({
        activeChat: state.activeChat
          ? { ...state.activeChat, chatMode: "voice" }
          : null,
      }));
    }

    try {
      // Lazy load voice service to avoid SSR issues
      const { voiceService } =
        await import("@/features/student/services/voiceService");

      await voiceService.startSession(
        studentProfile.user_id,
        (event: any) => {
        if (event.type === "connected") {
          set({ voiceSessionStatus: "active" });
        } else if (event.type === "disconnected") {
          set({ voiceSessionStatus: "idle" });
        } else if (event.type === "error") {
          set({ voiceSessionStatus: "error" });
        } else if (event.type === "session_id") {
          // Update activeChat with the real session_id from backend
          const { activeChat, fetchSessions } = get();
          if (
            activeChat &&
            (activeChat.id === "new" || activeChat.id === "new-focused")
          ) {
            const newSessionId = event.session_id;

            // 1. Update the store
            set((state) => ({
              activeChat: state.activeChat
                ? { ...state.activeChat, session_id: newSessionId }
                : null,
            }));

            // 2. Update the URL
            window.history.pushState(
              {},
              "",
              `/student?session=${newSessionId}`,
            );

            // 3. Refresh sidebar to show the new chat
            fetchSessions();
          }
        } else if (event.type === "entry_resolved") {
          // Update chat metadata when entry phase completes
          set((state) => ({
            activeChat: state.activeChat
              ? {
                  ...state.activeChat,
                  subject: event.subject,
                  lastTopic: event.chapter,
                }
              : null,
          }));
        } else if (event.type === "planning") {
          const { text } = event;
          set((state) => {
            const lastMsg = state.messages[state.messages.length - 1];
            const isContinuingPlanning = 
              lastMsg && 
              lastMsg.sender === "ai" && 
              lastMsg.isPlanning && 
              state.streamingMessageId === lastMsg.id;

            let updatedMessages = [...state.messages];
            let newId = state.streamingMessageId;

            if (isContinuingPlanning) {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                text: text || "Thinking...",
              };
            } else {
              newId = `planning-${Date.now()}`;
              updatedMessages.push({
                id: newId,
                text: text || "Thinking...",
                sender: "ai",
                isPlanning: true,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              });
            }

            return {
              messages: updatedMessages,
              streamingMessageId: newId,
              isAITyping: true,
            };
          });
        } else if (event.type === "turn_complete") {
          set({ isAITyping: false, streamingMessageId: null });
        } else if (event.type === "status") {
          if (event.phase !== "teaching") {
            set({ isAITyping: false });
          }
        } else if (event.type === "tool_status") {
          set((state) => {
            const updatedMessages = [...state.messages];
            let lastMsg = updatedMessages[updatedMessages.length - 1];
            let newStreamingId = state.streamingMessageId;
            
            if (!lastMsg || lastMsg.sender === "user") {
              const newId = `voice-tool-${Date.now()}`;
              lastMsg = {
                id: newId,
                text: "",
                sender: "ai",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                toolStatus: event.message
              };
              updatedMessages.push(lastMsg);
              newStreamingId = newId;
            } else {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                toolStatus: event.message
              };
            }
            return { messages: updatedMessages, isAITyping: true, streamingMessageId: newStreamingId };
          });
        } else if (event.type === "visual_block" || event.type === "math_widget") {
          set((state) => {
            const updatedMessages = [...state.messages];
            let lastMsgIdx = updatedMessages.length - 1;
            let lastMsg = updatedMessages[lastMsgIdx];
            let newStreamingId = state.streamingMessageId;

            if (!lastMsg || lastMsg.sender === "user") {
              const newId = `voice-visual-${Date.now()}`;
              lastMsg = {
                id: newId,
                text: "",
                sender: "ai",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };
              updatedMessages.push(lastMsg);
              lastMsgIdx = updatedMessages.length - 1;
              newStreamingId = newId;
            }

            if (lastMsgIdx >= 0) {
              const elements = lastMsg.elements ? [...lastMsg.elements] : [
                ...(lastMsg.text ? [{ id: Date.now().toString() + "-text", type: "text" as const, content: lastMsg.text }] : [])
              ];
              
              if (event.type === "visual_block") {
                let svgContent = event.svg || "";
                if (!svgContent && event.image) {
                  try {
                    svgContent = decodeURIComponent(escape(atob(event.image)));
                  } catch (e) {
                    console.error("Failed to decode base64 image", e);
                  }
                }
                elements.push({
                  id: Date.now().toString() + "-svg",
                  type: "svg",
                  content: svgContent,
                  meta: event.meta
                });
              } else if (event.type === "math_widget") {
                elements.push({
                  id: Date.now().toString() + "-widget",
                  type: "widget",
                  content: event.expression || "",
                  meta: event.options
                });
              }

              updatedMessages[lastMsgIdx] = {
                ...lastMsg,
                elements,
                toolStatus: undefined
              };
            }
            return { messages: updatedMessages, streamingMessageId: newStreamingId };
          });
        }
        },
        (content, role) => {
          const { activeChat } = get();
          if (!activeChat) return;

          set((state) => {
            const lastMsg = state.messages[state.messages.length - 1];
            const sender = role === "user" ? "user" : "ai";
            
            // Check if we are continuing a message or replacing a planning message
            const isContinuing = 
              lastMsg && 
              lastMsg.sender === sender && 
              state.streamingMessageId === lastMsg.id;
            
            const isReplacingPlanning = 
              lastMsg && 
              lastMsg.sender === "ai" && 
              lastMsg.isPlanning &&
              state.streamingMessageId === lastMsg.id;

            let updatedMessages = [...state.messages];
            let newId = state.streamingMessageId;

            if (isContinuing) {
              const newText = isReplacingPlanning ? content : lastMsg.text + (role === "user" ? " " : "") + content;
              const updated: ChatMessage = {
                ...lastMsg,
                text: newText,
                isPlanning: false
              };

              // If the message already has elements (e.g. from a visual_block),
              // keep the SVG/widget elements and update the trailing text element
              if (updated.elements && updated.elements.length > 0) {
                const existingTextIdx = updated.elements.findIndex(
                  (el) => el.type === "text" && el.id.endsWith("-transcript")
                );
                if (existingTextIdx >= 0) {
                  updated.elements = [...updated.elements];
                  updated.elements[existingTextIdx] = {
                    ...updated.elements[existingTextIdx],
                    content: newText
                  };
                } else {
                  updated.elements = [
                    ...updated.elements,
                    { id: Date.now().toString() + "-transcript", type: "text" as const, content: newText }
                  ];
                }
              }

              updatedMessages[updatedMessages.length - 1] = updated;
            } else {
              newId = `voice-${Date.now()}`;
              updatedMessages.push({
                id: newId,
                text: content,
                sender,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              });
            }

            return {
              messages: updatedMessages,
              streamingMessageId: newId,
              isAITyping: role === "assistant"
            };
          });
        },
        activeChat.session_id,
        activeChat.subject
      );
    } catch (error) {
      console.error("Failed to start voice session:", error);
      set({ voiceSessionStatus: "error" });
    }
  },

  stopVoiceSession: async () => {
    try {
      const { voiceService } =
        await import("@/features/student/services/voiceService");
      voiceService.stopSession();
    } catch (error) {
      console.error("Failed to stop voice session:", error);
    }
    set({ voiceSessionStatus: "idle" });
  },

  sendMessage: async (text: string) => {
    const { studentProfile, activeChat } = get();
    if (!studentProfile || !activeChat) return;

    // Capture the ID of the chat where the message was sent
    const chatSentFromId = activeChat.id;

    // Enforce voice mode restriction
    if (activeChat.chatMode === "voice") return;

    // Set chat mode to text if not already set
    if (!activeChat.chatMode) {
      set((state) => ({
        activeChat: state.activeChat
          ? { ...state.activeChat, chatMode: "text" }
          : null,
      }));
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Insert user message + streaming AI placeholder immediately
    const streamingMsgId = `streaming-${Date.now()}`;
    const streamingPlaceholder: ChatMessage = {
      id: streamingMsgId,
      text: "",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    set((state) => {
      const currentMessages =
        state.chatMessagesCache[chatSentFromId] || state.messages;
      const newMessages = [...currentMessages, userMsg, streamingPlaceholder];

      return {
        messages:
          state.activeChat?.id === chatSentFromId
            ? newMessages
            : state.messages,
        chatMessagesCache: {
          ...state.chatMessagesCache,
          [chatSentFromId]: newMessages,
        },
        typingChatIds: [...state.typingChatIds, chatSentFromId],
        isAITyping:
          state.activeChat?.id === chatSentFromId ? true : state.isAITyping,
        streamingMessageId: streamingMsgId,
      };
    });

    try {
      const sessionIdToSend =
        activeChat.session_id || activeChat.id || undefined;
      const isNewSession =
        !sessionIdToSend ||
        sessionIdToSend === "new" ||
        sessionIdToSend.startsWith("new-") ||
        sessionIdToSend.startsWith("focused-");

      console.debug("[Chat] Sending message", {
        session_id: isNewSession ? undefined : sessionIdToSend,
        isFocused: activeChat.isFocused,
        text,
      });

      const isNewFocused = activeChat.isFocused && isNewSession;
      const abortController = new AbortController();
      set({ chatAbortController: abortController });

      const response = await studentService.sendChatMessage(
        {
          text,
          user_id: studentProfile.user_id,
          ...(isNewFocused
            ? {}
            : { session_id: isNewSession ? undefined : sessionIdToSend }),
          ...(!activeChat.isFocused && {
            agent_id: activeChat.agent_id || "eng-grade-4",
          }),
          subject: activeChat.subject || "English",
          grade: studentProfile.grade || 10,
          ...(activeChat.isFocused && {
            document_title: activeChat.document_title || "General",
            intent: "",
          }),
        },
        abortController.signal,
      );

      if (!response.body) throw new Error("No response body for streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalSessionId: string | undefined;
      let finalOptions: string[] = [];

      // -- Reactive Streaming State -------------------------------------------
      let isPlanningUIPresented = false;
      let streamDone = false;
      const planningQueue: string[] = [];
      const bufferedEvents: any[] = [];
      const elements: ChatElement[] = [];
      let bufferedText = "";
      let currentTextBuffer = "";
      let currentToolStatus: string | undefined;
      let currentStatusText: string | undefined = "Processing...";

      const updateUI = (text: string, els: ChatElement[], toolStatus?: string, statusText?: string) => {
        set((state) => {
          const patch = (msgs: ChatMessage[]) =>
            msgs.map((m) =>
              m.id === streamingMsgId 
                ? { 
                    ...m, 
                    text: text.replace(/(?:<<|<)(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE)[\s\S]*?(?:>>|>|$)/g, "").replace(/<svg[\s\S]*?<\/svg>/g, "").trim(),
                    elements: els.length > 0 ? [...els] : undefined,
                    toolStatus,
                    statusText: statusText !== undefined ? statusText : currentStatusText
                  } 
                : m
            );
          return {
            messages: state.activeChat?.id === chatSentFromId ? patch(state.messages) : state.messages,
            chatMessagesCache: {
              ...state.chatMessagesCache,
              [chatSentFromId]: patch(state.chatMessagesCache[chatSentFromId] || []),
            },
          };
        });
      };

      const pushTextElement = (textOverride?: string) => {
        const textToParse = textOverride !== undefined ? textOverride : currentTextBuffer;
        if (textToParse) {
          const parsed = parseContent(textToParse);
          if (parsed.length > 0) {
            parsed.forEach((newEl) => {
              // If we're adding a native SVG, check if we can replace a recent backend-provided placeholder
              if (newEl.type === "svg" && newEl.meta?.shape) {
                const lastIdx = elements.length - 1;
                const lastEl = lastIdx >= 0 ? elements[lastIdx] : null;

                if (
                  lastEl &&
                  lastEl.type === "svg" &&
                  lastEl.meta?.shape === newEl.meta.shape
                ) {
                  // Upgrade the existing element in place
                  elements[lastIdx] = newEl;
                } else {
                  elements.push(newEl);
                }
              } else {
                elements.push(newEl);
              }
            });
          }
          if (textOverride === undefined) currentTextBuffer = "";
        }
      };

      const handleEvent = (event: any) => {
        if (event.type === "planning") {
          const status = event.text || event.message || "";
          if (status && !planningQueue.includes(status)) {
            planningQueue.push(status);
          }
        } else if (event.type === "tool_status") {
          currentToolStatus = event.message || "Drawing...";
          if (isPlanningUIPresented) updateUI(bufferedText, elements, currentToolStatus);
        } else if (event.type === "visual_block" || event.type === "visual_error") {
          pushTextElement(currentTextBuffer);
          currentTextBuffer = "";
          
          if (event.image) {
            elements.push({
              id: `stream-el-${elements.length}`,
              type: "image",
              content: `data:image/jpeg;base64,${event.image}`,
              meta: event.meta,
            });
          } else {
            const svgContent = event.type === "visual_block" ? event.svg : (event.fallback?.content || event.fallback_text || "[Visual Error]");
            elements.push({
              id: `stream-el-${elements.length}`,
              type: "svg",
              content: svgContent,
              meta: event.meta,
            });
          }
          currentToolStatus = undefined;
          if (isPlanningUIPresented) updateUI(bufferedText, elements);
        } else if (event.type === "math_widget" || event.type === "math_widget_error") {
          pushTextElement(currentTextBuffer);
          currentTextBuffer = "";
          elements.push({
            id: `stream-el-${elements.length}`,
            type: "widget",
            content: event.expression || "",
            meta: { error: event.type === "math_widget_error", message: event.message },
          });
          currentToolStatus = undefined;
          if (isPlanningUIPresented) updateUI(bufferedText, elements);
        } else if ((event.type === "chunk" || event.type === "chunks") && typeof event.text === "string") {
          currentTextBuffer += event.text;
          bufferedText += event.text;

          // Detect and extract embedded tags (MATH_DRAW, etc.) from the text stream
          const tagRegex = /<<(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE)[\s\S]*?>>?/g;
          let match;
          while ((match = tagRegex.exec(currentTextBuffer)) !== null) {
            const tag = match[0];
            
            // 1. Finalize and push any text that appeared BEFORE the tag
            const textBefore = currentTextBuffer.substring(0, match.index);
            if (textBefore.trim()) pushTextElement(textBefore);
            
            // 2. Parse the tag itself into a visual element
            const extracted = parseContent(tag);
            const tagElement = extracted.find(el => el.type !== "text");
            if (tagElement) {
              elements.push(tagElement);
            }
            
            // 3. Remove the processed part (textBefore + tag) from the active buffer
            currentTextBuffer = currentTextBuffer.substring(match.index + tag.length);
            tagRegex.lastIndex = 0; // Reset for remaining text
          }

          if (isPlanningUIPresented) {
            updateUI(bufferedText, elements, currentToolStatus);
          }
        } else if (event.type === "done") {
          finalSessionId = event.session_id;
          finalOptions = Array.isArray(event.options) ? event.options : [];
          if (!bufferedText && typeof event.response === "string" && event.response.trim()) {
            currentTextBuffer = event.response;
            bufferedText = event.response;
            if (isPlanningUIPresented) updateUI(bufferedText, elements);
          }
        }
      };

      // -- Orchestrator Loop (Non-blocking) -----------------------------------
      const orchestrateUI = async () => {
        let shownStatuses = 0;
        
        while (!streamDone || planningQueue.length > shownStatuses) {
          if (planningQueue.length > shownStatuses) {
            const status = planningQueue[shownStatuses];
            shownStatuses++;
            currentStatusText = status;
            updateUI("", [], undefined, status);
            await new Promise((r) => setTimeout(r, 1200));
          } else if (streamDone) {
            break;
          } else {
            // If we have no more planning statuses but the stream is still going,
            // we wait a bit to see if more planning statuses arrive.
            // If the AI has already started sending chunks (bufferedEvents has data),
            // and we've shown at least one planning status (or there were none), 
            // we can proceed to streaming.
            if (bufferedEvents.length > 0 || shownStatuses > 0) break;
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        isPlanningUIPresented = true;
        // Process all events that were buffered during the planning phase
        while (bufferedEvents.length > 0) {
          handleEvent(bufferedEvents.shift());
        }
        // Final sync for the switch from "Thinking" to "Streaming"
        pushTextElement(currentTextBuffer);
        currentTextBuffer = "";
        updateUI(bufferedText, elements, currentToolStatus);
      };

      const uiPromise = orchestrateUI();

      // -- Stream Reader Loop -------------------------------------------------
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          streamDone = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          let event: any;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          let shouldUpdate = false;

          if (event.type === "planning") {
            const status = event.text || event.message || "";
            if (status && status !== currentStatusText) {
              currentStatusText = status;
              shouldUpdate = true;
            }
          } else if (event.type === "tool_status") {
            currentToolStatus = event.message || "Drawing...";
            shouldUpdate = true;
          } else if (
            event.type === "visual_block" ||
            event.type === "visual_error"
          ) {
            pushTextElement();

            // If we've already parsed a better native version of this shape from the text stream, skip the redundant visual_block
            if (
              event.meta?.shape &&
              elements.length > 0 &&
              elements[elements.length - 1].type === "svg" &&
              elements[elements.length - 1].meta?.shape === event.meta.shape
            ) {
              currentToolStatus = undefined;
              shouldUpdate = true;
              continue;
            }

            let svgContent =
              event.type === "visual_block"
                ? event.svg
                : event.fallback?.content ||
                  event.fallback_text ||
                  "[Visual Error]";

            // Even if we don't have params yet, if it's a natively supported shape, 
            // use our advanced style as a better starting point than the backend's old SVG.
            if (event.meta?.shape) {
              const localSupported = ["rectangle", "circle", "triangle", "line", "number_line", "calendar"];
              if (localSupported.includes(event.meta.shape)) {
                svgContent = generateHistoricalSVG(event.meta.shape, event.meta.params || {});
              }
            }

            elements.push({
              id: Math.random().toString(36).substring(2, 11),
              type: "svg",
              content: svgContent,
              meta: event.meta,
            });
            currentToolStatus = undefined;
            shouldUpdate = true;
          } else if (
            event.type === "math_widget" ||
            event.type === "math_widget_error"
          ) {
            pushTextElement();
            elements.push({
              id: Math.random().toString(36).substring(2, 11),
              type: "widget",
              content: event.expression || "",
              meta: {
                error: event.type === "math_widget_error",
                message: event.message,
              },
            });
            currentToolStatus = undefined;
            shouldUpdate = true;
          } else if (
            (event.type === "chunk" || event.type === "chunks") &&
            typeof event.text === "string"
          ) {
            currentTextBuffer += event.text;
            bufferedText += event.text;
            
            // If we detect a completed math/visual tag, flush it to elements immediately
            // so it renders with our advanced frontend logic right away
            if (currentTextBuffer.includes(">>") || (currentTextBuffer.includes("<<") && currentTextBuffer.trim().endsWith(">"))) {
              pushTextElement();
            }
            
            
            shouldUpdate = true;
          } else if (event.type === "done") {
            finalSessionId = event.session_id;
            finalOptions = Array.isArray(event.options) ? event.options : [];
            // If no chunks were received, fall back to the full response text provided in the 'done' event
            if (
              !bufferedText &&
              typeof event.response === "string" &&
              event.response.trim()
            ) {
              currentTextBuffer = event.response;
              bufferedText = event.response;
              shouldUpdate = true;
            }
          }

          if (shouldUpdate) {
            updateUI(bufferedText, elements, currentToolStatus, currentStatusText);
          }
        }
      }

      await uiPromise; // Ensure orchestrator finishes flushes

      // Finalise: replace streaming placeholder with finished message + options
      set((state) => {
        const finalisedMsg: ChatMessage = {
          id: streamingMsgId,
          text: bufferedText,
          elements: elements,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          options: finalOptions.length > 0 ? finalOptions : undefined,
          statusText: undefined,
          toolStatus: undefined,
        };

        const patchMsg = (msgs: ChatMessage[]) =>
          msgs.map((m) => (m.id === streamingMsgId ? finalisedMsg : m));

        // Update the session in recentChats
        const isPromotingNewChat =
          chatSentFromId === "new" || chatSentFromId === "new-focused";
        const chatInList = state.recentChats.find(
          (c) => c.id === chatSentFromId,
        );
        let newRecentChats = state.recentChats;
        let finalActiveChat = state.activeChat;
        const realId = finalSessionId || chatSentFromId;

        if (isPromotingNewChat && finalSessionId) {
          // Promote "new" chat to a real session in the list
          const updatedChat: ChatSession = {
            ...state.activeChat!,
            id: finalSessionId,
            session_id: finalSessionId,
          };
          // Filter out existing in case fetchSessions picked it up while streaming
          const deduplicatedChats = state.recentChats.filter(
            (c) => c.id !== finalSessionId && c.session_id !== finalSessionId,
          );
          newRecentChats = [updatedChat, ...deduplicatedChats];
          if (state.activeChat?.id === "new") {
            finalActiveChat = updatedChat;
          }
        } else if (chatInList) {
          const updatedChat: ChatSession = {
            ...chatInList,
            id: realId,
            session_id: finalSessionId || chatInList.session_id,
          };
          // Replace the temp entry and remove any duplicate with the same realId
          newRecentChats = state.recentChats
            .map((c) => (c.id === chatSentFromId ? updatedChat : c))
            .filter(
              (c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx,
            );
          if (state.activeChat?.id === chatSentFromId) {
            finalActiveChat = updatedChat;
          }
        }

        // Migrate cache key from tempId to realId with eviction management
        const currentCached = state.chatMessagesCache[chatSentFromId] || [];
        const finalisedMessages = patchMsg(currentCached);
        
        let newCache = manageCacheEviction(state.chatMessagesCache, realId, finalisedMessages);
        
        if (realId !== chatSentFromId) {
          // Explicitly cleanup the temporary ID cache
          const cleanedCache = { ...newCache };
          delete cleanedCache[chatSentFromId];
          newCache = cleanedCache;
        }

        const newTypingIds = state.typingChatIds.filter(
          (id) => id !== chatSentFromId,
        );
        const isStillViewing = state.activeChat?.id === chatSentFromId;

        return {
          activeChat: finalActiveChat,
          recentChats: newRecentChats,
          chatMessagesCache: newCache,
          messages: isStillViewing ? finalisedMessages : state.messages,
          typingChatIds: newTypingIds,
          isAITyping: isStillViewing ? false : state.isAITyping,
          streamingMessageId: null,
          chatAbortController: null,
        };
      });
    } catch (error: any) {
      const isAbort = error.name === "AbortError";

      if (isAbort) {
        console.debug("Chat generation aborted by user");
      } else {
        console.error("Chat API Error:", error);
      }

      set((state) => {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          text: error.detail ||  "Sorry, I encountered an error connecting to the knowledge base. Please try again.",
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        const cleanOrReplace = (msgs: ChatMessage[]) => {
          const withoutStreaming = msgs.filter((m) => m.id !== streamingMsgId);
          // If it was an abort, just leave it empty. Otherwise, add the error message.
          return isAbort ? withoutStreaming : [...withoutStreaming, errorMsg];
        };

        const cached = state.chatMessagesCache[chatSentFromId] || [];
        const finishedMessages = cleanOrReplace(cached);
        const newTypingIds = state.typingChatIds.filter(
          (id) => id !== chatSentFromId,
        );

        return {
          chatMessagesCache: manageCacheEviction(state.chatMessagesCache, chatSentFromId, finishedMessages),
          messages:
            state.activeChat?.id === chatSentFromId
              ? finishedMessages
              : state.messages,
          typingChatIds: newTypingIds,
          isAITyping:
            state.activeChat?.id === chatSentFromId ? false : state.isAITyping,
          streamingMessageId: null,
          chatAbortController: null,
        };
      });
      }
    },

  stopMessageGeneration: () => {
    const { chatAbortController } = get();
    if (chatAbortController) {
      chatAbortController.abort();
    }
    set({
      chatAbortController: null,
      isAITyping: false,
      streamingMessageId: null,
    });
  },

  setAgentPickerOpen: (open) => set({ isAgentPickerOpen: open }),
  setPartnerModalOpen: (open) =>
    set({
      isPartnerModalOpen: open,
      partnerRequestStatus: open ? get().partnerRequestStatus : "idle",
    }),

  setProfileOpen: (open) => set({ isProfileOpen: open }),

  logoutStudent: () => {
    localStorage.removeItem("gened_user_role");
    localStorage.removeItem("gened_auth_token");
    localStorage.removeItem("gened_user_profile");
    localStorage.removeItem("gened_partner_id");
    set({
      studentProfile: null,
      activeChat: null,
      messages: [],
      chatMessagesCache: {},
      isChatOpen: false,
      isProfileOpen: false,
      isAgentPickerOpen: false,
      isPartnerModalOpen: false,
      isAITyping: false,
      typingChatIds: [],
      hasFetchedSessions: false,
      hasFetchedAgents: false,
    });
    window.location.href = "/";
  },
}));
