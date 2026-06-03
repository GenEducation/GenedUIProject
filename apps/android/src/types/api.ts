/**
 * Shared TypeScript interfaces for all API response shapes.
 * Used by services, hooks, and components throughout the app.
 */

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  user_id: string;
  username: string;
  email?: string;
  name?: string;
  role: string;
  grade?: number;
  school_board?: string;
  ai_name?: string;
  preferred_voice?: string;
  plan?: "FREE" | "PRO";
  plan_expires_at?: string | null;
}

// ── Dashboard / Home ──────────────────────────────────────────────────────────

export interface GeneralOnboarding {
  learning_preferences?: string[];
  interests?: string[];
  strengths?: string[];
  weaknesses?: string[];
  completed?: boolean;
}

export interface DashboardProfile {
  student_id: string;
  name?: string;
  grade?: number;
  school_board?: string;
  ai_name?: string;
  total_sessions?: number;
  traits?: LearnerTrait[];
  badges?: Badge[];
  general_onboarding?: GeneralOnboarding;
}

export interface PartnerItem {
  id?: string;
  partner_id?: string;
  organization: string;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_sessions: number;
}

// ── Subjects / Chapters ───────────────────────────────────────────────────────

export interface SubjectInfo {
  subject: string;
  grade: number;
  total_chapters?: number;
  mastery?: number;
  last_session_at?: string;
  /** Agent ID from available-agents (used when opening chat) */
  agent_id?: string;
  /** Coverage percentage from available-agents */
  subject_coverage_percentage?: number;
  /** Whether onboarding is complete */
  is_onboarding_complete?: boolean;
  /** Document titles available for this subject */
  document_titles?: string[];
}

// ── Available Agents (from /api/students/{id}/available-agents) ───────────────

export interface AgentInfo {
  agent_id: string;
  name: string;
  subject: string;
  grade: number;
  document_titles?: string[];
}

export interface PartnerSubject {
  subject: string;
  is_onboarding_complete: boolean;
  subject_coverage_percentage: number;
  agents: AgentInfo[];
}

export interface PartnerInfo {
  partner_id: string;
  organization: string;
  subjects: PartnerSubject[];
}

export interface AvailableAgentsResponse {
  partners: PartnerInfo[];
}

export interface ChapterMastery {
  chapter_title: string;
  mastery: number;
  sessions?: number;
  last_studied?: string;
}

// ── Progress Report ───────────────────────────────────────────────────────────

export interface SubjectKpi {
  subject: string;
  score: number;
  band: "Advanced" | "Proficient" | "Approaching" | "Developing";
}

export interface ProgressReport {
  report_number?: string;
  period?: string;
  student_name?: string;
  grade?: number;
  school_board?: string;
  total_sessions?: number;
  issued?: string;
  narrative?: string;
  subject_kpis?: SubjectKpi[];
  chapters?: ChapterMastery[];
  sections?: ReportSection[];
}

export interface ReportSection {
  title: string;
  body: string;
}

// ── Chat / Sessions ───────────────────────────────────────────────────────────

export interface ChatSession {
  session_id: string;
  subject?: string;
  grade?: number;
  title?: string;
  last_message?: string;
  last_active?: string;
  message_count?: number;
}

export interface ChatMessage {
  id?: string;
  from: "me" | "ai";
  text: string;
  /** Planning phase status: "Thinking…", "Understanding your request…" */
  statusText?: string;
  /** Phase name: "thinking", "understanding", etc. */
  phase?: string;
  /** True while this message is still being streamed */
  isStreaming?: boolean;
  timestamp?: string;
}

export interface SessionsResponse {
  sessions: ChatSession[];
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: HistoryMessage[];
}

// ── Voices ────────────────────────────────────────────────────────────────────

export interface VoiceOption {
  id: string;
  label: string;
  description?: string;
  sample_url?: string;
}

// ── Tests / Practice ──────────────────────────────────────────────────────────

export interface TestQuestion {
  question_id: string;
  question: string;
  options?: string[];
  type: "mcq" | "short_answer" | "fill_blank";
}

export interface TestSection {
  section_id: string;
  title: string;
  questions: TestQuestion[];
}

export interface CreateTestResponse {
  test_id: string;
  sections: TestSection[];
  subject: string;
  grade: number;
  chapter?: string;
}

export interface SubmitAnswer {
  question_id: string;
  student_answer: string;
}

export interface GradedQuestion {
  question_id: string;
  correct: boolean;
  score: number;
  correct_answer?: string;
  feedback?: string;
}

export interface TestResult {
  submission_id: string;
  test_id: string;
  verdict: string;
  total_score: number;
  max_score: number;
  percentage: number;
  graded_questions: GradedQuestion[];
  submitted_at?: string;
}

export interface TestSubmission {
  submission_id: string;
  test_id: string;
  subject: string;
  chapter?: string;
  score?: number;
  percentage?: number;
  submitted_at?: string;
}

// ── Profile / Me ──────────────────────────────────────────────────────────────

export interface LearnerTrait {
  label: string;
  value: string;
}

export interface Badge {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  earned: boolean;
  earned_at?: string;
}

// ── Send Chat ─────────────────────────────────────────────────────────────────

export interface SendChatPayload {
  text: string;
  user_id: string;
  session_id?: string;
  agent_id?: string;
  subject: string;
  grade: number;
  document_title?: string;
  intent?: string;
}
