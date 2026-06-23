/** Types for the Teacher portal. */

export type LinkStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TeacherOverview {
  total_students: number;
  pending: number;
  approved: number;
  [key: string]: any;
}

export interface TeacherStudent {
  student_id: string;
  teacher_id?: string;
  status: LinkStatus;
  subject?: string;
  name?: string;
  username?: string;
  email?: string;
  grade?: number;
  requested_at?: string;
  [key: string]: any;
}

export interface TeacherChatSession {
  session_id: string;
  title?: string;
  subject?: string;
  last_active?: string;
  updated_at?: string;
  message_count?: number;
  [key: string]: any;
}

export interface TeacherChatMessage {
  message_id?: string;
  role?: string;
  content?: string;
  meta_data?: Record<string, any>;
  [key: string]: any;
}

export interface InvitePayload {
  student_email_or_username: string;
  subject: string;
}
