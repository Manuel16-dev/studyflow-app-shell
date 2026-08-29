import { useEffect, useState } from 'react'
import { Pencil, Flame, Layers, BookOpen, Target, Clock } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { useAuth } from '../lib/AuthContext'
import { getProfile, updateProfile } from '../lib/profileStore'
import { getStreakDays, getTotalStudyMinutes } from '../lib/studySessionsStore'
import { getSubjects } from '../lib/subjectsStore'
import { getCardCounts } from '../lib/cardsStore'
import { getOverallMastery, getRetentionRate } from '../lib/progressStore'

const studyForOptions = ['University', 'High school', 'Certification', 'Self-study']

function initials(name, email) {
  const source = (name || '').trim() || (email || '').split('@')[0] || '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function formatMinutes(mins) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3 px-2 rounded-md bg-neutral-50">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-lg font-semibold text-neutral-900 leading-none">{value}</span>
      <span className="text-[11px] text-neutral-500 text-center leading-tight">{label}</span>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [studyForDraft, setStudyForDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getProfile(),
      getStreakDays(),
      getTotalStudyMinutes(),
      getSubjects(),
      getCardCounts(),
      getOverallMastery(),
      getRetentionRate(),
    ])
      .then(([prof, streak, totalMinutes, subs, cardCounts, mastery, retention]) => {
        if (cancelled) return
        setProfile(prof)
        setSubjects(subs)
        const totalCards = Object.values(cardCounts).reduce((a, b) => a + b, 0)
        setStats({ streak, totalMinutes, totalCards, subjectCount: subs.length, mastery, retention })
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  function openEdit() {
    setNameDraft(profile?.display_name ?? user?.user_metadata?.display_name ?? '')
    setStudyForDraft(profile?.study_for ?? null)
    setSaveError(null)
    setEditOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const patch = { display_name: nameDraft.trim() || null, study_for: studyForDraft }
      await updateProfile(patch)
      setProfile((p) => ({ ...(p ?? {}), ...patch }))
      setEditOpen(false)
    } catch (err) {
      setSaveError(err.message ?? 'Could not save — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.display_name ?? user?.user_metadata?.display_name ?? null
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col gap-4 pb-16">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Profile</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Your account and study identity.</p>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-xl font-semibold shrink-0">
            {initials(displayName, user?.email)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-900 truncate">
                {displayName || 'Add your name'}
              </h2>
              <button
                type="button"
                onClick={openEdit}
                aria-label="Edit profile"
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-neutral-500 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {profile?.study_for && <Badge variant="info">{profile.study_for}</Badge>}
              {memberSince && (
                <span className="text-xs text-neutral-400">Member since {memberSince}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Your stats">
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <StatTile icon={Flame} label="Day streak" value={stats.streak} />
            <StatTile icon={Clock} label="Total study time" value={formatMinutes(stats.totalMinutes)} />
            <StatTile icon={Layers} label="Cards created" value={stats.totalCards} />
            <StatTile icon={BookOpen} label="Subjects" value={stats.subjectCount} />
            <StatTile
              icon={Target}
              label="Overall mastery"
              value={stats.mastery != null ? `${stats.mastery}%` : '—'}
            />
          </div>
        )}
        {!loading && stats.retention != null && (
          <p className="text-xs text-neutral-500 mt-3">
            {stats.retention}% of your reviews are recalled successfully (not rated "Again").
          </p>
        )}
      </Card>

      {!loading && subjects.length > 0 && (
        <Card title="Subjects">
          <div className="flex flex-col divide-y divide-neutral-100">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-neutral-800">{s.name}</span>
                <span className="text-xs text-neutral-400">
                  {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        {saveError && (
          <p className="text-sm text-danger bg-danger-light border border-danger/20 rounded-md px-3 py-2 mb-3">
            {saveError}
          </p>
        )}
        <div className="flex flex-col gap-4">
          <TextField
            id="display-name"
            label="Display name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name"
          />
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-1.5">Studying for</p>
            <div className="grid grid-cols-2 gap-2">
              {studyForOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStudyForDraft(opt)}
                  className={[
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors text-left',
                    'focus-visible:outline-2 focus-visible:outline-primary',
                    studyForDraft === opt
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
