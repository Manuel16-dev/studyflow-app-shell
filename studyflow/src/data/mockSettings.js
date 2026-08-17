// Seed values for the Settings screen. Local component state reads/writes
// this shape for now — becomes the `profile` / `settings` slice once
// Zustand + backend persistence is wired in.
export const mockSettings = {
  studyBehavior: {
    // Maps to FSRS `desired_retention`. NOTE: the slider sets this value,
    // but Review's scheduler is still hardcoded intervals (flagged earlier) —
    // so changing this won't yet change real review timing.
    desiredRetention: 0.9, // 0.7–0.97
    dailyTargetMinutes: 30,
    preferredStudyTime: 'evening', // morning | afternoon | evening | flexible
    timezone: 'Africa/Accra',
  },
  notifications: {
    push: true,
    email: false,
    reviewReminders: true,
    examReminders: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
  appearance: {
    theme: 'light', // light | dark | system — dark has no real styling yet, see below
    textSize: 'medium', // small | medium | large
    reducedMotion: false,
  },
}

export const studyTimeOptions = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'flexible', label: 'Flexible' },
]

export const timezoneOptions = [
  'Africa/Accra',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
]
