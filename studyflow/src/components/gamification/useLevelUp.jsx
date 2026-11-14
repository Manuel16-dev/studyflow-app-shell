import { useCallback, useState } from 'react'
import { checkLevelUp } from '../../lib/xpStore'
import LevelUpCelebration from './LevelUpCelebration'

// Returns [element, check]. Render `element` anywhere in the screen (it is a
// fixed overlay, or null); call check(totalXp) once XP has loaded. If the
// level went up since the last check on this device the celebration opens.
//
//   const [levelUpModal, checkForLevelUp] = useLevelUp()
//   getXpSummary().then((s) => checkForLevelUp(s.totalXp))
//   return <div>{levelUpModal} ...</div>
export function useLevelUp() {
  const [event, setEvent] = useState(null)
  const close = useCallback(() => setEvent(null), [])
  const check = useCallback((totalXp) => {
    checkLevelUp(totalXp)
      .then((found) => found && setEvent(found))
      .catch(() => {}) // a failed check just means no celebration this time
  }, [])
  const element = event ? <LevelUpCelebration {...event} onClose={close} /> : null
  return [element, check]
}
