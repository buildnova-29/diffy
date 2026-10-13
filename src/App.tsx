import './ui/app.css'
import { useApp } from './state/store'
import { Header } from './ui/Header'
import { ResultsPlaceholder } from './ui/ResultsPlaceholder'
import { SetupScreen } from './ui/setup/SetupScreen'
import { UploadScreen } from './ui/UploadScreen'

export default function App() {
  const step = useApp((s) => s.step)
  return (
    <div className="app">
      <Header step={step} />
      {step === 1 && <UploadScreen />}
      {step === 2 && <SetupScreen />}
      {step === 3 && <ResultsPlaceholder />}
    </div>
  )
}
