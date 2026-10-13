import './ui/app.css'
import { useApp } from './state/store'
import { Header } from './ui/Header'
import { SetupPlaceholder } from './ui/SetupPlaceholder'
import { UploadScreen } from './ui/UploadScreen'

export default function App() {
  const step = useApp((s) => s.step)
  return (
    <div className="app">
      <Header step={step} />
      {step === 1 && <UploadScreen />}
      {step === 2 && <SetupPlaceholder />}
    </div>
  )
}
