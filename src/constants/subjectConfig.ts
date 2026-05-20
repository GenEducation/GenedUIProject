export type Subject = 'english' | 'mathematics' | 'science' | 'hindi';

export const SUBJECT_CONFIG: Record<Subject, {
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hoverBgColor: string;
}> = {
  english: {
    name: 'English',
    color: '#74B9FF',      // Sky Blue
    bgColor: 'rgba(116, 185, 255, 0.08)',
    textColor: '#74B9FF',
    borderColor: '#74B9FF',
    hoverBgColor: 'rgba(116, 185, 255, 0.12)',
  },
  mathematics: {
    name: 'Mathematics',
    color: '#00B894',      // Growth Green
    bgColor: 'rgba(0, 184, 148, 0.08)',
    textColor: '#00B894',
    borderColor: '#00B894',
    hoverBgColor: 'rgba(0, 184, 148, 0.12)',
  },
  science: {
    name: 'Science',
    color: '#FDCB6E',      // Sun Orange
    bgColor: 'rgba(253, 203, 110, 0.08)',
    textColor: '#FDCB6E',
    borderColor: '#FDCB6E',
    hoverBgColor: 'rgba(253, 203, 110, 0.12)',
  },
  hindi: {
    name: 'Hindi',
    color: '#6C5CE7',      // Spark Purple
    bgColor: 'rgba(108, 92, 231, 0.08)',
    textColor: '#6C5CE7',
    borderColor: '#6C5CE7',
    hoverBgColor: 'rgba(108, 92, 231, 0.12)',
  },
};

export const getSubjectConfig = (subject: Subject) => {
  return SUBJECT_CONFIG[subject];
};
