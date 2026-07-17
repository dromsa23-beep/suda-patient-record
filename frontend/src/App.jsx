import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { auth } from './api'
import LoginPage from './components/LoginPage'
import HomePage from './components/HomePage'
import SearchPage from './components/SearchPage'
import AddPage from './components/AddPage'
import DetailsPage from './components/DetailsPage'
import SurgeryPage from './components/SurgeryPage'
import ClinicPage from './components/ClinicPage'
import StatsPage from './components/StatsPage'
import ComplaintPage from './components/ComplaintPage'
import AdminPage from './components/AdminPage'
import { navItems } from './constants'

export default function App() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sudaUser')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.username && parsed.approved !== false) {
          setUser(parsed)
          if (location.pathname === '/login') navigate('/')
        } else {
          localStorage.removeItem('sudaUser')
        }
      }
    } catch { localStorage.removeItem('sudaUser') }
    setReady(true)
  }, [])

  const handleLogin = async (u, p) => {
    const { data } = await auth.login({ username: u, password: p })
    setUser(data.user)
    localStorage.setItem('sudaUser', JSON.stringify(data.user))
    navigate('/')
  }

  const handleRegister = async (d) => {
    await auth.register(d)
  }

  const handleLogout = async () => {
    try { await auth.logout() } catch {}
    localStorage.removeItem('sudaUser')
    setUser(null)
    navigate('/login')
  }

  if (!ready) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="login-logo">🏥</div>
      <p style={{ color: 'var(--text-2)', marginTop: 12 }}>جاري التحميل...</p>
    </div>
  </div>

  if (!user) return <Routes>
    <Route path="/admin" element={<AdminPage />} />
    <Route path="*" element={<LoginPage onLogin={handleLogin} onRegister={handleRegister} />} />
  </Routes>

  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="nav-brand">
          <div className="nav-brand-logo">🏥</div>
          Suda
        </div>
        {navItems.map(n => (
          <button key={n.path} className={`nav-item ${location.pathname === n.path ? 'active' : ''}`} onClick={() => navigate(n.path)}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </button>
        ))}
        <button className="nav-item" style={{ marginRight: 'auto' }} onClick={handleLogout}>🚪 خروج</button>
      </nav>
      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/search" element={<SearchPage user={user} />} />
          <Route path="/add" element={<AddPage user={user} />} />
          <Route path="/add/:id" element={<AddPage user={user} />} />
          <Route path="/details/:id" element={<DetailsPage user={user} />} />
          <Route path="/surgery" element={<SurgeryPage user={user} />} />
          <Route path="/clinic" element={<ClinicPage user={user} />} />
          <Route path="/stats" element={<StatsPage user={user} />} />
          <Route path="/complaint" element={<ComplaintPage user={user} />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} onRegister={handleRegister} />} />
        </Routes>
      </main>
    </div>
  )
}
