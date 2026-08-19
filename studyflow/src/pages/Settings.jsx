import { useEffect, useState } from 'react'
import { Info, Download, Trash2, LogOut } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import Toggle from '../components/ui/Toggle'
import Slider from '../components/ui/Slider'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { studyTimeOptions, timezoneOptions, mockSettings } from '../data/mockSettings'
import { getSettings, updateSettingsSection } from '../lib/settingsStore'
import { deleteAccount } from '../lib/authHelpers'
import { exportMyData } from '../lib/exportData'

function Select({ id, label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 bg-white focus-visible:outline-2 focus-visible:outline-primary"
      >
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>{opt}</option>
          ) : (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )
        )}
      </select>
    </div>
  )
}

const retentionCopy = (v) => {
  if (v >= 0.93) return 'Very thorough — frequent reviews, minimal forgetting'
  if (v >= 0.87) return 'Balanced — the default most students should use'
  return 'Relaxed — fewer reviews, more forgetting between sessions'
}

export default function Settings() {
  const navigate = useNavigate()
  const { signOut, updatePassword } = useAuth()
  const [behavior, setBehavior] = useState(mockSettings.studyBehavior)
  const [notifications, setNotifications] = useState(mockSettings.notifications)
  const [appearance, setAppearance] = useState(mockSettings.appearance)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      await exportMyData()
    } catch (err) {
      setExportError(err.message ?? 'Export failed — please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function handlePasswordSave() {
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords don't match.")
      return
    }
    setPasswordSaving(true)
    setPasswordError(null)
    const { error } = await updatePassword(newPassword)
    setPasswordSaving(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setPasswordSuccess(true)
    setNewPassword('')
    setConfirmNewPassword('')
  }

  useEffect(() => {
    getSettings().then((real) => {
      if (!real) return // trigger hasn't created the row yet — keep defaults
      setBehavior(real.studyBehavior)
      setNotifications(real.notifications)
      setAppearance(real.appearance)
    })
  }, [])

  // Each setter updates local state immediately (snappy UI) and persists
  // the same patch to settingsStore so it survives a refresh.
  const setB = (key, value) => {
    setBehavior((s) => ({ ...s, [key]: value }))
    updateSettingsSection('studyBehavior', { [key]: value })
  }
  const setN = (key, value) => {
    setNotifications((s) => ({ ...s, [key]: value }))
    updateSettingsSection('notifications', { [key]: value })
  }
  const setA = (key, value) => {
    setAppearance((s) => ({ ...s, [key]: value }))
    updateSettingsSection('appearance', { [key]: value })
    if (key === 'reducedMotion') document.documentElement.classList.toggle('reduce-motion', value)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col gap-4 pb-16">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Control how StudyFlow schedules, reminds, and looks for you.
        </p>
      </div>

      {/* Study behavior */}
      <Card title="Study behavior">
        <Slider
          id="desired-retention"
          label="Review difficulty"
          description="How much forgetting you're willing to tolerate before a card comes back around."
          min={0.7}
          max={0.97}
          step={0.01}
          value={behavior.desiredRetention}
          onChange={(v) => setB('desiredRetention', v)}
          minLabel="Harder / fewer reviews"
          maxLabel="Easier / more reviews"
          valueLabel={`${Math.round(behavior.desiredRetention * 100)}%`}
        />
        <p className="text-xs text-neutral-500 -mt-1 mb-2">{retentionCopy(behavior.desiredRetention)}</p>

        <div className="border-t border-neutral-100 pt-3">
          <Slider
            id="daily-target"
            label="Daily study target"
            min={10}
            max={120}
            step={5}
            value={behavior.dailyTargetMinutes}
            onChange={(v) => setB('dailyTargetMinutes', v)}
            minLabel="10 min"
            maxLabel="120 min"
            valueLabel={`${behavior.dailyTargetMinutes} min`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-100 pt-4 mt-1">
          <Select
            id="preferred-time"
            label="Preferred study time"
            value={behavior.preferredStudyTime}
            onChange={(v) => setB('preferredStudyTime', v)}
            options={studyTimeOptions}
          />
          <Select
            id="timezone"
            label="Timezone"
            value={behavior.timezone}
            onChange={(v) => setB('timezone', v)}
            options={timezoneOptions}
          />
        </div>

        <div className="flex items-start gap-2 bg-primary-light text-primary text-xs rounded-md px-3 py-2 mt-4">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Review difficulty sets the target the scheduler should aim for. It doesn&rsquo;t change today&rsquo;s
            review intervals yet — those are still fixed placeholders until the real FSRS scheduler is built.
          </span>
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <div className="divide-y divide-neutral-100">
          <Toggle
            id="push"
            label="Push notifications"
            description="Reminders on your phone and desktop."
            checked={notifications.push}
            onChange={(v) => setN('push', v)}
          />
          <Toggle
            id="email"
            label="Email notifications"
            description="Weekly summaries and important reminders by email."
            checked={notifications.email}
            onChange={(v) => setN('email', v)}
          />
          <Toggle
            id="review-reminders"
            label="Review due reminders"
            checked={notifications.reviewReminders}
            onChange={(v) => setN('reviewReminders', v)}
          />
          <Toggle
            id="exam-reminders"
            label="Exam deadline reminders"
            checked={notifications.examReminders}
            onChange={(v) => setN('examReminders', v)}
          />
          <Toggle
            id="quiet-hours"
            label="Quiet hours"
            description="Don't send notifications during this window."
            checked={notifications.quietHoursEnabled}
            onChange={(v) => setN('quietHoursEnabled', v)}
          />
          {notifications.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 py-3">
              <TextField
                id="quiet-start"
                label="Starts"
                type="time"
                value={notifications.quietHoursStart}
                onChange={(e) => setN('quietHoursStart', e.target.value)}
              />
              <TextField
                id="quiet-end"
                label="Ends"
                type="time"
                value={notifications.quietHoursEnd}
                onChange={(e) => setN('quietHoursEnd', e.target.value)}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Appearance */}
      <Card title="Appearance">
        <div>
          <p className="text-sm font-medium text-neutral-900 mb-2">Theme</p>
          <div className="flex gap-2">
            {['light', 'dark', 'system'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setA('theme', opt)}
                className={[
                  'flex-1 capitalize rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-primary',
                  appearance.theme === opt
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50',
                ].join(' ')}
              >
                {opt}
              </button>
            ))}
          </div>
          {appearance.theme !== 'light' && (
            <div className="flex items-start gap-2 bg-accent-light text-accent text-xs rounded-md px-3 py-2 mt-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Your preference is saved, but dark styling isn&rsquo;t built yet — the app will still render in
                light mode until that pass is done.
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 mt-4 pt-4">
          <p className="text-sm font-medium text-neutral-900 mb-2">Text size</p>
          <div className="flex gap-2">
            {['small', 'medium', 'large'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setA('textSize', opt)}
                className={[
                  'flex-1 capitalize rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-primary',
                  appearance.textSize === opt
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50',
                ].join(' ')}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-100 mt-2">
          <Toggle
            id="reduced-motion"
            label="Reduce motion"
            description="Minimize animations. Also respected automatically from your system setting."
            checked={appearance.reducedMotion}
            onChange={(v) => setA('reducedMotion', v)}
          />
        </div>
      </Card>

      {/* Account */}
      <Card title="Account">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { setPasswordOpen(true); setPasswordSuccess(false); setPasswordError(null) }}
            className="flex items-center justify-between text-left text-sm text-neutral-700 hover:text-neutral-900 py-1"
          >
            <span>Change password</span>
            <span className="text-primary text-sm font-medium">Edit</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center justify-between text-left text-sm text-neutral-700 hover:text-neutral-900 py-1 disabled:opacity-50"
          >
            <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Export my data</span>
            <span className="text-primary text-sm font-medium">{exporting ? 'Preparing…' : 'Download'}</span>
          </button>
          {exportError && <p className="text-xs text-danger">{exportError}</p>}
          <button
            type="button"
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
            className="flex items-center gap-2 text-left text-sm text-neutral-700 hover:text-neutral-900 py-1"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>

        <div className="border-t border-neutral-100 mt-4 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                Delete account <Badge variant="weak">Irreversible</Badge>
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Permanently deletes your subjects, cards, review history and progress.
              </p>
            </div>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteConfirmText('') }}
        title="Delete your account?"
      >
        <p className="text-sm text-neutral-700">
          This permanently deletes all subjects, flashcards, review history and progress. This cannot be undone.
        </p>
        {deleteError && (
          <p className="text-sm text-danger bg-danger-light border border-danger/20 rounded-md px-3 py-2 mt-3">
            {deleteError}
          </p>
        )}
        <div className="mt-4">
          <TextField
            id="delete-confirm"
            label='Type "DELETE" to confirm'
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button
            variant="secondary"
            onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); setDeleteError(null) }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteConfirmText !== 'DELETE' || deleting}
            onClick={async () => {
              setDeleting(true)
              setDeleteError(null)
              try {
                await deleteAccount()
                navigate('/login', { replace: true })
              } catch (err) {
                setDeleteError(err.message ?? 'Something went wrong — please try again.')
                setDeleting(false)
              }
            }}
          >
            {deleting ? 'Deleting…' : 'Delete my account'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={passwordOpen}
        onClose={() => { setPasswordOpen(false); setNewPassword(''); setConfirmNewPassword(''); setPasswordError(null) }}
        title="Change password"
      >
        {passwordSuccess ? (
          <p className="text-sm text-secondary">Password updated.</p>
        ) : (
          <>
            {passwordError && (
              <p className="text-sm text-danger bg-danger-light border border-danger/20 rounded-md px-3 py-2 mb-3">
                {passwordError}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <TextField
                id="new-password"
                type="password"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <TextField
                id="confirm-new-password"
                type="password"
                label="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="secondary"
                onClick={() => { setPasswordOpen(false); setNewPassword(''); setConfirmNewPassword('') }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handlePasswordSave} disabled={passwordSaving}>
                {passwordSaving ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
