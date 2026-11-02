import { useState } from 'react'
import LessonScreen from './components/LessonScreen.jsx'
import PlanPreview from './components/PlanPreview.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import { useLesson } from './lesson/useLesson.js'
import { useApiKey } from './state/useApiKey.js'

/** Three screens, one after the other: describe the lesson, read its plan, then have the lesson. */
export default function App() {
  const [apiKey, setApiKey] = useApiKey()
  const [teacherPrompt, setTeacherPrompt] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [planned, setPlanned] = useState(null)
  const session = useLesson(apiKey)

  if (session.isActive) return <LessonScreen session={session} apiKey={apiKey} onApiKeyChange={setApiKey} />

  if (planned) {
    return <PlanPreview plan={planned.plan} onStart={() => session.begin(planned.plan, planned.passages)} onEdit={() => setPlanned(null)} />
  }

  return (
    <SetupScreen
      apiKey={apiKey}
      onApiKeyChange={setApiKey}
      teacherPrompt={teacherPrompt}
      onTeacherPromptChange={setTeacherPrompt}
      sourceText={sourceText}
      onSourceTextChange={setSourceText}
      onPlanned={setPlanned}
    />
  )
}
