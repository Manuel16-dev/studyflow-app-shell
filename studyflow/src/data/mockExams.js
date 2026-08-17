// TODO: replace with real readiness data (derived from FSRS mastery per
// topic) from FastAPI/Supabase once backend is wired.
export const mockExams = [
  {
    id: 'calc-midterm',
    name: 'Calculus Midterm',
    subjectId: 'calculus',
    daysLeft: 14,
    readiness: 76,
    topics: [
      { name: 'Derivatives', mastery: 88, severity: 'mastered' },
      { name: 'Integration Techniques', mastery: 71, severity: 'attention' },
      { name: 'Double Integrals', mastery: 38, severity: 'weak' },
      { name: "L'Hopital's Rule", mastery: 82, severity: 'mastered' },
    ],
    recommendations: [
      'Double Integrals is your weakest topic \u2014 schedule two focused review sessions this week.',
      'Integration Techniques is close to solid \u2014 one more pass should push it over 80%.',
    ],
  },
  {
    id: 'ds-final',
    name: 'Data Structures',
    subjectId: 'data-structures',
    daysLeft: 21,
    readiness: 64,
    topics: [
      { name: 'Arrays & Lists', mastery: 90, severity: 'mastered' },
      { name: 'Tree Rotation', mastery: 54, severity: 'attention' },
      { name: 'Graph Traversal', mastery: 47, severity: 'weak' },
      { name: 'Hash Tables', mastery: 79, severity: 'attention' },
    ],
    recommendations: [
      'Graph Traversal and Tree Rotation are both under 60% \u2014 these two topics carry the most exam risk.',
      'With 21 days left, you have room to fix both if you start this week.',
    ],
  },
  {
    id: 'physics-quiz',
    name: 'Physics Quiz',
    subjectId: 'physics',
    daysLeft: 5,
    readiness: 58,
    topics: [
      { name: "Newton's Laws", mastery: 81, severity: 'mastered' },
      { name: 'Circuit Analysis', mastery: 71, severity: 'mastered' },
      { name: 'Kinematics', mastery: 41, severity: 'weak' },
    ],
    recommendations: [
      'Only 5 days left and Kinematics is under 50% \u2014 prioritize it above everything else this week.',
    ],
  },
]
