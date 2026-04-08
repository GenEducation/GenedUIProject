import { create } from "zustand";

export interface Student {
  id: string;
  name: string;
  grade: string;
  initials?: string;
}

export interface Subject {
  name: string;
  grade: string;
}

interface PartnerState {
  // --- Analytics Data ---
  students: Student[];
  pendingRequests: Student[];
  numberOfPendingRequests: number;
  totalEnrollments: number;
  selectedStudent: Student | null;

  // --- Subject Data ---
  subjects: Subject[];

  // --- UI State ---
  isLoading: boolean;

  // --- Actions ---
  // Analytics Actions
  setSelectedStudent: (student: Student | null) => void;
  approveRequest: (studentId: string) => void;
  rejectRequest: (studentId: string) => void;

  // Subject Actions
  addSubject: (subject: Subject) => void;

  // Auth/Logout Action
  logoutPartner: () => void;
}

// Mock Data
const INITIAL_STUDENTS: Student[] = [
  { id: "1", name: "Aliza Bennet", grade: "Grade 12", initials: "AB" },
  { id: "2", name: "Darius Knight", grade: "Grade 11", initials: "DK" },
  { id: "3", name: "Fiona Hayes", grade: "Grade 12", initials: "FH" },
  { id: "4", name: "Gabriel Russo", grade: "Grade 10", initials: "GR" },
  { id: "5", name: "Hannah Miller", grade: "Grade 12", initials: "HM" },
  { id: "6", name: "Isaac Watts", grade: "Grade 11", initials: "IW" },
  { id: "7", name: "Jade Morales", grade: "Grade 12", initials: "JM" },
  { id: "8", name: "Kaelen Smith", grade: "Grade 10", initials: "KS" },
];

const INITIAL_PENDING: Student[] = [
  { id: "p1", name: "Julianne Sterling", grade: "Grade 12" },
  { id: "p2", name: "Marcus Holloway", grade: "Grade 11" },
  { id: "p3", name: "Elena Rodriguez", grade: "Grade 12" },
  { id: "p4", name: "Samuel Thorne", grade: "Grade 10" },
  { id: "p5", name: "Beatrice Vance", grade: "Grade 12" },
  { id: "p6", name: "Oliver Chen", grade: "Grade 11" },
];

const INITIAL_SUBJECTS: Subject[] = [
  { name: "Advanced Mathematics", grade: "12th Grade" },
  { name: "Molecular Biology", grade: "12th Grade" },
  { name: "Classical History", grade: "11th Grade" },
  { name: "Computer Science Fundamentals", grade: "12th Grade" },
  { name: "Art Theory & Criticism", grade: "11th Grade" },
];

export const usePartnerStore = create<PartnerState>((set) => ({
  students: INITIAL_STUDENTS,
  pendingRequests: INITIAL_PENDING,
  numberOfPendingRequests: INITIAL_PENDING.length,
  totalEnrollments: 12482,
  selectedStudent: null,
  subjects: INITIAL_SUBJECTS,
  isLoading: false,

  setSelectedStudent: (student) => set({ selectedStudent: student }),

  approveRequest: (studentId) => set((state) => {
    const request = state.pendingRequests.find(r => r.id === studentId);
    if (!request) return state;

    const initials = request.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const newStudent = { ...request, initials };

    const newPending = state.pendingRequests.filter(r => r.id !== studentId);

    return {
      pendingRequests: newPending,
      numberOfPendingRequests: newPending.length,
      students: [newStudent, ...state.students],
      totalEnrollments: state.totalEnrollments + 1,
      selectedStudent: null
    };
  }),

  rejectRequest: (studentId) => set((state) => {
    const newPending = state.pendingRequests.filter(r => r.id !== studentId);
    return {
      pendingRequests: newPending,
      numberOfPendingRequests: newPending.length,
      selectedStudent: null
    };
  }),

  addSubject: (subject) => set((state) => ({
    subjects: [subject, ...state.subjects]
  })),

  logoutPartner: () => {
    localStorage.removeItem("gened_user_role");
    set({ 
      students: [], 
      pendingRequests: [], 
      numberOfPendingRequests: 0,
      subjects: [], 
      selectedStudent: null, 
      totalEnrollments: 0 
    });
    window.location.href = "/";
  }
}));
