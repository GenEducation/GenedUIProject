const BASE_URL = (process.env.NEXT_PUBLIC_CORE_API_URL || "http://192.168.1.6:8000").replace(/\/$/, "");

export interface LinkedStudent {
  student_id: string;
  parent_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_at: string;
  username?: string; // Returned by backend as the student's name
}

export const parentService = {
  fetchLinkedStudents: async (parentId: string): Promise<LinkedStudent[]> => {
    const response = await fetch(`${BASE_URL}/parent/students?parent_id=${encodeURIComponent(parentId)}`, {
      headers: { "accept": "application/json" }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch linked students: ${response.status}`);
    }
    
    return response.json();
  },

  linkStudent: async (parentId: string, studentId: string): Promise<LinkedStudent> => {
    const response = await fetch(`${BASE_URL}/parent/link`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "accept": "application/json" 
      },
      body: JSON.stringify({
        parent_id: parentId,
        student_id: studentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to link student: ${response.status}`);
    }

    return response.json();
  },

  updateStudentStatus: async (parentId: string, studentId: string, status: "APPROVED" | "REJECTED"): Promise<LinkedStudent> => {
    const response = await fetch(`${BASE_URL}/parent/link/${studentId}/status?parent_id=${encodeURIComponent(parentId)}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "accept": "application/json" 
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update student status: ${response.status}`);
    }

    return response.json();
  },

  unlinkStudent: async (parentId: string, studentId: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/parent/link/${studentId}?parent_id=${encodeURIComponent(parentId)}`, {
      method: "DELETE",
      headers: { "accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Failed to unlink student: ${response.status}`);
    }
  },
};
