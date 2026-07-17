import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { specialtyList } from '../constants'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import { auth } from '../api'

export default function LoginPage({ onLogin, onRegister }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', clinic: '', username: '', password: '', confirm: '', specialty: '' })
  const [creds, setCreds] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const navigate = useNavigate()
  const set = (k, v) => tab === 'login' ? setCreds({ ...creds, [k]: v }) : setForm({ ...form, [k]: v })

  useEffect(() => { auth.initAdmin() }, [])

  const doLogin = async () => {
    try {
      setError('')
      const snap = await getDocs(collection(db, 'admins'))
      const found = snap.docs.find(d => {
        const a = d.data()
        return a.username === creds.username && a.password === creds.password
      })
      if (found) {
        const a = found.data()
        localStorage.setItem('sudaAdmin', JSON.stringify({ id: found.id, username: a.username, name: a.name, role: a.role }))
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
      await onRegister(form); setRegistered(true); setError('')
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
        {registered && <div style={{ background: '#e8fde8', color: 'var(--success)', padding: '12px', borderRadius: 8, marginBottom: 12, fontSize: 13, textAlign: 'center', lineHeight: 1.8 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>تم إرسال بياناتك للإدارة للموافقة عليها</div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>يمكنك استخدام التطبيق بعد موافقة الإدارة</div>
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: 12 }}>📞 للاستفسار الاتصال على:</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--royal)', direction: 'ltr', marginTop: 4 }}>00249127320208</div>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => { setRegistered(false); setTab('login') }} style={{ marginTop: 12 }}>العودة لتسجيل الدخول</button>
        </div>}
        {!registered && tab === 'login' ? (
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
