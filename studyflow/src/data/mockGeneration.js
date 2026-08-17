// TODO: replace with real upload + RAG generation pipeline once backend is wired.
export const mockSource = {
  name: 'Chapter 7 — Trees and Graphs.pdf',
  pages: 14,
}

export const mockGeneratedCards = [
  {
    id: 'gen-1',
    front: 'What distinguishes a complete binary tree from a full binary tree?',
    back: 'A complete tree fills every level left-to-right except possibly the last; a full tree requires every node to have 0 or 2 children.',
    sourceRef: 'p. 3, para 2',
  },
  {
    id: 'gen-2',
    front: 'What is tree traversal, and name the three depth-first orders.',
    back: 'Visiting every node systematically. The three DFS orders are pre-order, in-order, and post-order.',
    sourceRef: 'p. 5',
  },
  {
    id: 'gen-3',
    front: 'How does a graph differ from a tree?',
    back: 'A graph can contain cycles and disconnected components; a tree is a connected, acyclic graph with exactly one path between any two nodes.',
    sourceRef: 'p. 9, para 1',
  },
  {
    id: 'gen-4',
    front: "What is the difference between BFS and DFS traversal order?",
    back: 'BFS explores neighbors level-by-level using a queue; DFS explores as far as possible along a branch using a stack (or recursion) before backtracking.',
    sourceRef: 'p. 11, para 3',
  },
]

// Simulated regenerate call for a single card — occasionally "fails" so the
// AI-failure state (spec section 8) is a real, reachable branch, not just a
// static mock.
export function regenerateOne(card) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.25) {
        reject(new Error('Regeneration failed'))
      } else {
        resolve({ ...card, back: `${card.back} (regenerated phrasing)` })
      }
    }, 700)
  })
}
