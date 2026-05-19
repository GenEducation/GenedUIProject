export const QUESTIONS = [
  {
    id: "learning_preferences",
    sageMessage:
      "How do you prefer to absorb new information? For example — do you learn best by watching videos, listening to explanations, or getting hands-on?",
    placeholder:
      "I learn best when I see diagrams or watch videos...",
  },
  {
    id: "interests",
    sageMessage:
      "What subjects or hobbies excite you the most?",
    placeholder:
      "I am really into space exploration and solving complex math puzzles...",
  },
  {
    id: "strengths",
    sageMessage:
      "What are your best academic or personal skills?",
    placeholder:
      "I am good at explaining things to others and I have a strong memory...",
  },
  {
    id: "weaknesses",
    sageMessage:
      "What areas do you find most challenging?",
    placeholder:
      "I sometimes struggle with time management and long-form writing...",
  },
] as const;
