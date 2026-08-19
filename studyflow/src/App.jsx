import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import RequireAuth from './lib/RequireAuth'
import AppShell from './nav/AppShell'
import PlaceholderPage from './pages/PlaceholderPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import OnboardingWizard from './pages/auth/OnboardingWizard'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import SubjectDetail from './pages/SubjectDetail'
import Review from './pages/Review'
import GenerateCards from './pages/GenerateCards'
import Progress from './pages/Progress'
import Exams from './pages/Exams'
import ExamDetail from './pages/ExamDetail'
import Planner from './pages/Planner'
import Settings from './pages/Settings'

// Placeholder copy per screen — real screens replace these one by one,
// following the spec's build order (section 12): shell/nav done, auth next.
const pages = {
  dashboard: { title: 'Dashboard', description: 'What should I study now? Reviews due, streak, weak areas, and today\u2019s plan.' },
  review: { title: 'Review', description: 'Distraction-free flashcard review — the core learning loop.' },
  subjects: { title: 'Subjects', description: 'Your courses and topics, with mastery progress.' },
  flashcards: { title: 'Flashcards', description: 'Browse and manage cards across all subjects.' },
  practice: { title: 'Practice', description: 'Targeted practice outside the scheduled review queue.' },
  tutor: { title: 'AI Tutor', description: 'Contextual explanations and Socratic questioning.' },
  exams: { title: 'Exams', description: 'Readiness by topic, days remaining, and prep recommendations.' },
  calendar: { title: 'Calendar', description: 'Study plan, review blocks, and exam deadlines.' },
  progress: { title: 'Progress', description: 'Retention, mastery, and consistency over time.' },
  library: { title: 'Library', description: 'Uploaded source material and generated card sets.' },
  settings: { title: 'Settings', description: 'Account, preferences, and study defaults.' },
  profile: { title: 'Profile', description: 'Your account and study identity.' },
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingWizard />} />
          <Route path="/review" element={<Review />} />
          <Route path="/subjects/:id/generate" element={<GenerateCards />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/subjects/:id" element={<SubjectDetail />} />
            <Route path="/flashcards" element={<PlaceholderPage {...pages.flashcards} />} />
            <Route path="/practice" element={<PlaceholderPage {...pages.practice} />} />
            <Route path="/tutor" element={<PlaceholderPage {...pages.tutor} />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/exams/:id" element={<ExamDetail />} />
            <Route path="/calendar" element={<Planner />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/library" element={<PlaceholderPage {...pages.library} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<PlaceholderPage {...pages.profile} />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
