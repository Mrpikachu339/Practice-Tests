/* Practice Tests — shared test registry.
 *
 * Single source of truth for test metadata (identity, title, description,
 * URL and question count). Loaded before auth.js on the home page and on
 * every test page so metadata is available without duplicating it per page.
 *
 * Question arrays, answer keys, worked solutions and embedded figures stay
 * in their own test pages; this file deliberately contains no question data.
 *
 * Shape:
 *   id             stable progress/sync key used by PTProgress and Supabase
 *   subject        human-readable subject name
 *   badgeIcon      emoji shown in the subject badge
 *   motif          visual theme key: physics | biology | chemistry | math | generic
 *   title          full test title
 *   description    short home-page summary
 *   url            page filename relative to index.html
 *   totalQuestions number of questions in the test
 */

window.PT_TESTS = [
  {
    id: 'physics-equilibrium',
    subject: 'Physics 12',
    badgeIcon: '⚛️',
    motif: 'physics', // 'physics' | 'biology' | 'chemistry' | 'math' | 'generic'
    title: 'Physics 12 — Static Equilibrium Practice Test',
    description: '33 multiple choice and 11 written questions. Calculator, formula sheet and drawing pad included.',
    url: 'physics-equilibrium-test.html',
    totalQuestions: 44
  },
  {
    id: 'biology-12-digestion-circulation-respiration',
    subject: 'Biology 12',
    badgeIcon: '🧬',
    motif: 'biology',
    title: 'Biology 12 — Digestion, Circulation & Respiration Practice Test',
    description: 'Digestion, Circulation & Respiration • 180 Questions',
    url: 'biology-12-digestion-circulation-respiration-test.html',
    totalQuestions: 180
  },
  {
    id: 'ap-calculus-limits-continuity',
    subject: 'AP Calculus',
    badgeIcon: '∫',
    motif: 'math',
    title: 'AP Calculus — Limits & Continuity Practice Test',
    description: '0 multiple choice and 13 written questions • Limits, One-Sided Limits, Asymptotes & Continuity. Calculator & drawing pad included.',
    url: 'ap-calculus-limits-continuity-test.html',
    totalQuestions: 13
  }
];
