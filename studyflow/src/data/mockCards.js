// TODO: replace with real cards from FastAPI/Supabase once backend is wired.
// Cards are keyed by subjectId. Only a few subjects are seeded here for the
// card creation/editing screen — the rest render the empty state.
export const mockCardsBySubject = {
  'data-structures': [
    {
      id: 'ds-1',
      front: 'What is a binary search tree?',
      back: 'A binary tree where each node\u2019s left subtree contains only smaller values and its right subtree contains only larger values, enabling O(log n) search.',
    },
    {
      id: 'ds-2',
      front: 'What is the time complexity of a balanced BST lookup?',
      back: 'O(log n), since each comparison eliminates roughly half the remaining nodes.',
    },
    {
      id: 'ds-3',
      front: 'What is the difference between a stack and a queue?',
      back: 'A stack is LIFO (last in, first out); a queue is FIFO (first in, first out).',
    },
  ],
  calculus: [
    {
      id: 'calc-1',
      front: 'What does the derivative of a function represent?',
      back: 'The instantaneous rate of change of the function with respect to its variable \u2014 the slope of the tangent line at a point.',
    },
    {
      id: 'calc-2',
      front: 'What is the fundamental theorem of calculus?',
      back: 'It links differentiation and integration: the definite integral of a function can be computed using any of its antiderivatives.',
    },
  ],
}

let idCounter = 1000
export function nextCardId() {
  idCounter += 1
  return `local-${idCounter}`
}
