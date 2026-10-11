import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/tokens.css'
import './index.css'
import {BrowserRouter} from 'react-router-dom'

// a soft glow follows the mouse anywhere on the page (styling only; see #root::before in App.css)
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.addEventListener('pointermove', (e) => {
    document.documentElement.style.setProperty('--mx', `${e.clientX}px`)
    document.documentElement.style.setProperty('--my', `${e.clientY}px`)
  }, { passive: true })
}

// page blobs glide with scrolling: --scroll goes from 0 (top) to 1 (bottom) (styling only)
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let queued = false
  const updateScroll = () => {
    queued = false
    const room = document.documentElement.scrollHeight - window.innerHeight
    const progress = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0
    document.documentElement.style.setProperty('--scroll', progress.toFixed(3))
  }
  const onScroll = () => {
    if (!queued) {
      queued = true
      requestAnimationFrame(updateScroll)
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  updateScroll()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
    <App />
    </BrowserRouter>
  </React.StrictMode>,
)
