# Frontend Implementation Guide: Test Service

The `test-service` generates personalized, ZPD-calibrated chapter tests for students and provides AI-powered grading. This guide covers how to integrate these endpoints into the student dashboard.

---

## 1. Core Concepts

### ZPD-Calibration & Scaffolding
The service automatically adjusts the difficulty and support level (**Tier**) for every section of a test based on the student's current mastery of the Learning Objectives (LOs).

| Tier | Scaffolding Level | UI/UX Recommendation |
| :--- | :--- | :--- |
| **Heavy Scaffolding** | MCQ + Fill-in-the-blank | Provide maximum UI support; hints are embedded in the prompt. |
| **Moderate Scaffolding** | Short Answer | Standard input fields with sub-prompts. |
| **Socratic** | Open Analytical | Multi-line text areas; encourage "Explain Why". |
| **Stretch** | Application | Scenario-based open-ended questions. |

### The "Verdict"
Instead of a simple percentage, we use a **ZPD Verdict** to measure growth:
- **ABOVE**: Student performed better than their prior mastery predicted.
- **AT**: Student performed exactly at their current level.
- **BELOW**: Student struggled more than expected.

---

## 2. API Reference

### A. Generate a New Test
**Endpoint:** `POST /create-chapter-test`

**Request Body (`CreateChapterTestRequest`):**
```json
{
  "student_id": "uuid",
  "chapter_query": "Introduction to Fractions",
  "subject": "Math",
  "grade": 5,
  "questions_per_section": 3
}
```

**Response Example (`CreateChapterTestResponse`):**
```json
{
  "test_id": "uuid",
  "document_title": "Understanding Fractions",
  "sections": [
    {
      "main_heading": "Introduction to Numerators",
      "tier": "Moderate Scaffolding",
      "avg_mastery": 0.55,
      "questions": [
        {
          "question_id": "q_001",
          "type": "short_answer",
          "prompt": "In the fraction 3/4, which number is the numerator?",
          "options": null
        }
      ]
    }
  ]
}
```

### B. Submit Test Answers
**Endpoint:** `POST /tests/{test_id}/submit`

**Request Body (`SubmitTestRequest`):**
```json
{
  "answers": [
    { "question_id": "q_001", "student_answer": "3" }
  ]
}
```

**Response Example (`SubmitTestResponse`):**
```json
{
  "submission_id": "uuid",
  "overall_verdict": "AT",
  "overall_score": 0.85,
  "section_results": {
    "Introduction to Numerators": {
      "actual_score": 0.85,
      "expected_score": 0.80,
      "verdict": "AT"
    }
  },
  "graded_questions": [
    {
      "question_id": "q_001",
      "score_0_1": 1.0,
      "rationale": "Correctly identified the numerator."
    }
  ]
}
```

---

## 3. Implementation Workflow

1.  **Test Start:** Call `POST /create-chapter-test`. Store the `test_id` and the `sections` array in state.
2.  **Rendering:** 
    - Loop through `sections`.
    - For each `question`, check the `type`.
    - `multiple_choice`: Render radio buttons using the `options` array.
    - `short_answer` / `open_ended`: Render a text input or textarea.
3.  **Collection:** Build the `answers` array as the student types.
4.  **Submission:** On "Finish Test", call `POST /tests/{test_id}/submit`.
5.  **Result Screen:**
    - Use `overall_verdict` to show a badge (Green for ABOVE, Blue for AT, Orange for BELOW).
    - Display the `rationale` for each question to give the student feedback.

---

## 4. Environment Setup

- **Local Development:** `http://localhost:8004`
- **Headers:** `Content-Type: application/json`
- **Auth:** Ensure the `student_id` in the request matches the authenticated user.
