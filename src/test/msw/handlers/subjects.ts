import { http, HttpResponse } from "msw";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

export const subjectHandlers = [
  http.get(`${BASE}/rag/taxonomy/subjects`, () =>
    HttpResponse.json({
      subjects: [
        { name: "English", grades: [3, 4, 5, 6, 7, 8] },
        { name: "Mathematics", grades: [3, 4, 5, 6, 7, 8] },
        { name: "Science", grades: [6, 7, 8] },
        { name: "Social Science", grades: [6, 7, 8] },
        { name: "History", grades: [6, 7, 8] },
        { name: "Geography", grades: [6, 7, 8] },
        { name: "Social & Political Science", grades: [6, 7, 8] },
      ],
    }),
  ),
];
