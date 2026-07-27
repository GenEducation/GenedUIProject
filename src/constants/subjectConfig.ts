export interface SubjectPresentation {
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hoverBgColor: string;
}

const DEFAULT_SUBJECT_PRESENTATION: SubjectPresentation = {
  color: '#2D5540',
  bgColor: 'rgba(45, 85, 64, 0.08)',
  textColor: '#2D5540',
  borderColor: '#2D5540',
  hoverBgColor: 'rgba(45, 85, 64, 0.12)',
};

/**
 * Presentation only. This map is not a supported-subject registry: selection
 * always comes from the taxonomy catalogue and unknown future names receive
 * the neutral visual treatment without changing their identity.
 */
export const SUBJECT_CONFIG: Readonly<Record<string, SubjectPresentation>> = {
  English: {
    color: '#74B9FF',      // Sky Blue
    bgColor: 'rgba(116, 185, 255, 0.08)',
    textColor: '#74B9FF',
    borderColor: '#74B9FF',
    hoverBgColor: 'rgba(116, 185, 255, 0.12)',
  },
  Mathematics: {
    color: '#00B894',      // Growth Green
    bgColor: 'rgba(0, 184, 148, 0.08)',
    textColor: '#00B894',
    borderColor: '#00B894',
    hoverBgColor: 'rgba(0, 184, 148, 0.12)',
  },
  Science: {
    color: '#FDCB6E',      // Sun Orange
    bgColor: 'rgba(253, 203, 110, 0.08)',
    textColor: '#FDCB6E',
    borderColor: '#FDCB6E',
    hoverBgColor: 'rgba(253, 203, 110, 0.12)',
  },
  'Social Science': {
    color: '#E17055',      // Terracotta
    bgColor: 'rgba(225, 112, 85, 0.08)',
    textColor: '#E17055',
    borderColor: '#E17055',
    hoverBgColor: 'rgba(225, 112, 85, 0.12)',
  },
  History: {
    color: '#A6762D',      // Antique Bronze
    bgColor: 'rgba(166, 118, 45, 0.08)',
    textColor: '#A6762D',
    borderColor: '#A6762D',
    hoverBgColor: 'rgba(166, 118, 45, 0.12)',
  },
  Geography: {
    color: '#1E8FA6',      // Atlas Teal
    bgColor: 'rgba(30, 143, 166, 0.08)',
    textColor: '#1E8FA6',
    borderColor: '#1E8FA6',
    hoverBgColor: 'rgba(30, 143, 166, 0.12)',
  },
  'Social & Political Science': {
    color: '#8C4A6B',      // Civic Plum
    bgColor: 'rgba(140, 74, 107, 0.08)',
    textColor: '#8C4A6B',
    borderColor: '#8C4A6B',
    hoverBgColor: 'rgba(140, 74, 107, 0.12)',
  },
};

export const getSubjectConfig = (subject: string): SubjectPresentation =>
  SUBJECT_CONFIG[subject] ?? DEFAULT_SUBJECT_PRESENTATION;
