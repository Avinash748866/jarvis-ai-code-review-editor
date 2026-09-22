import { createRoot } from 'react-dom/client'
import './index.css'
import RobotAvatar from './components/RobotAvatar'

const params = new URLSearchParams(location.search)
const sizes = (params.get('sizes') || '56,104,240').split(',').map(Number)
const statuses = (params.get('status') || 'idle,analyzing,thinking,speaking,success,alert').split(',')
const variant = params.get('variant') || undefined

function Lab() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {statuses.map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <code style={{ width: 90, color: '#7c8aa0', fontSize: 12 }}>{s}</code>
          {sizes.map((px) => (
            <div key={px} style={{ width: px, height: px, background: '#0a0e16', outline: '1px solid #1b2433' }}>
              <RobotAvatar status={s} variant={variant} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
createRoot(document.getElementById('root')).render(<Lab />)
