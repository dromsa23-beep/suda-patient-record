import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { specialtyList } from '../constants'

function getDB() {
  try { return JSON.parse(localStorage.getItem('sudaDB') || '{}') } catch { return {} }
}
function saveDB(db) { localStorage.setItem('sudaDB', JSON.stringify(db)) }

const defaultAdmin = { id: 'admin001', username: 'admin', password: 'admin123', name: 'المدير العام', role: 'superadmin', createdAt: new Date().toISOString() }

function initAdmins() {
  const db = getDB()
  if (!db.admins || !db.admins.length) {
    db.admins = [defaultAdmin]
    saveDB(db)
  }
}

export default function LoginPage({ onLogin, onRegister }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', clinic: '', username: '', password: '', confirm: '', specialty: '' })
  const [creds, setCreds] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const set = (k, v) => tab === 'login' ? setCreds({ ...creds, [k]: v }) : setForm({ ...form, [k]: v })

  useEffect(() => { initAdmins() }, [])

  const doLogin = async () => {
    try {
      setError('')
      const db = getDB()
      const admins = db.admins || []
      const isAdmin = admins.find(a => a.username === creds.username && a.password === creds.password)
      if (isAdmin) {
        localStorage.setItem('sudaAdmin', JSON.stringify({ username: isAdmin.username, name: isAdmin.name, role: isAdmin.role }))
        navigate('/admin')
        return
      }
      await onLogin(creds.username, creds.password)
    }
    catch (e) { setError(e.response?.data?.detail || 'خطأ في البيانات') }
  }
  const doRegister = async () => {
    try {
      if (form.password !== form.confirm) { setError('كلمة السر غير متطابقة'); return }
      if (form.password.length < 6) { setError('كلمة السر 6 أحرف على الأقل'); return }
      await onRegister(form); setTab('login'); setError('')
    } catch (e) { setError(e.response?.data?.detail || 'خطأ في التسجيل') }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="login-logo">🏥</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', margin: '8px 0 4px' }}>Suda Patient Record</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>نظام إدارة سجلات المرضى</p>
        </div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--bg)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => { setTab('login'); setError('') }} className={`pill-tab ${tab === 'login' ? 'active' : ''}`} style={{ flex: 1, borderRadius: 8 }}>🔐 دخول</button>
          <button onClick={() => { setTab('register'); setError('') }} className={`pill-tab ${tab === 'register' ? 'active' : ''}`} style={{ flex: 1, borderRadius: 8 }}>📝 حساب جديد</button>
        </div>
        {error && <div style={{ background: '#fde8e8', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
        {tab === 'login' ? (
          <div>
            <div className="form-group"><label>👤 اسم المستخدم</label><input placeholder="اسم المستخدم" value={creds.username} onChange={e => set('username', e.target.value)} /></div>
            <div className="form-group"><label>🔒 كلمة السر</label><input type="password" placeholder="كلمة السر" value={creds.password} onChange={e => set('password', e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} /></div>
            <button className="btn btn-primary btn-full" onClick={doLogin} style={{ marginTop: 8 }}>🔐 دخول</button>
          </div>
        ) : (
          <div>
            <div className="form-group"><label>👤 الاسم الكامل</label><input placeholder="الاسم الكامل" value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="form-row">
              <div className="form-group"><label>📧 البريد</label><input placeholder="البريد" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div className="form-group"><label>📞 الهاتف</label><input placeholder="الهاتف" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            </div>
            <div className="form-group"><label>🩺 التخصص</label><select value={form.specialty} onChange={e => set('specialty', e.target.value)}><option value="">اختر التخصص</option>{specialtyList.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="form-group"><label>🏥 مكان العيادة</label><input placeholder="مكان العيادة" value={form.clinic} onChange={e => set('clinic', e.target.value)} /></div>
            <div className="form-group"><label>👤 اسم المستخدم</label><input placeholder="اسم المستخدم" value={form.username} onChange={e => set('username', e.target.value)} /></div>
            <div className="form-row">
              <div className="form-group"><label>🔒 كلمة السر</label><input type="password" placeholder="كلمة السر" value={form.password} onChange={e => set('password', e.target.value)} /></div>
              <div className="form-group"><label>🔒 تأكيد كلمة السر</label><input type="password" placeholder="تأكيد كلمة السر" value={form.confirm} onChange={e => set('confirm', e.target.value)} /></div>
            </div>
            <button className="btn btn-accent btn-full" onClick={doRegister} style={{ marginTop: 8 }}>✅ إنشاء حساب</button>
          </div>
        )}
      </div>
    </div>
  )
}
