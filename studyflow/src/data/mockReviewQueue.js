// TODO: replace with real due-card queue from the FSRS scheduler/backend.
export const mockReviewQueue = [
  {
    id: 'c1',
    subject: 'Data Structures',
    question: 'What is a binary search tree?',
    answer:
      'A binary tree where each node\u2019s left subtree contains only smaller values and its right subtree contains only larger values, enabling O(log n) search.',
  },
  {
    id: 'c2',
    subject: 'Calculus',
    question: 'What does the derivative of a function represent?',
    answer: 'The instantaneous rate of change of the function with respect to its variable — the slope of the tangent line at a point.',
  },
  {
    id: 'c3',
    subject: 'Electronics',
    question: "State Ohm's Law.",
    answer: 'V = IR — voltage equals current multiplied by resistance.',
  },
  {
    id: 'c4',
    subject: 'Data Structures',
    question: 'What is the time complexity of a balanced BST lookup?',
    answer: 'O(log n), since each comparison eliminates roughly half the remaining nodes.',
  },
  {
    id: 'c5',
    subject: 'Calculus',
    question: 'What is the fundamental theorem of calculus?',
    answer: 'It links differentiation and integration: the definite integral of a function can be computed using any of its antiderivatives.',
  },
  {
    id: 'c6',
    subject: 'Physics',
    question: "State Newton's second law.",
    answer: 'F = ma — the net force on an object equals its mass times its acceleration.',
  },
]

// Predicted next interval per rating — placeholder values.
// TODO: compute per-card from the actual FSRS algorithm based on stability/difficulty.
export const ratingIntervals = {
  again: '<10 min',
  hard: '1 day',
  good: '4 days',
  easy: '10 days',
}
