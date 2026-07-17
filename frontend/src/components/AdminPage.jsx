import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { patients as patientsApi } from '../api'
import { db } from '../firebase'
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc
} from 'firebase/firestore'

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

export default function AdminPage() {
  const [admin, setAdmin] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('sudaAdmin')
    if (saved) {
      try { setAdmin(JSON.parse(saved)) } catch { localStorage.removeItem('sudaAdmin') }
    }
  }, [])

  if (!admin) return <AdminLogin onLogin={(a) => { setAdmin(a); localStorage.setItem('sudaAdmin', JSON.stringify(a)) }} />
  return <AdminDashboard admin={admin} onLogout={() => { localStorage.removeItem('sudaAdmin'); setAdmin(null) }} onBack={() => navigate('/')} />
}

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      const snap = await getDocs(collection(db, 'admins'))
      const found = snap.docs.find(d => {
        const a = d.data()
        return a.username === username && a.password === password
      })
      if (!found) { setError('اسم المستخدم أو كلمة المرور خاطئة'); return }
      const a = found.data()
      onLogin({ id: found.id, username: a.username, name: a.name, role: a.role })
    } catch (e) {
      setError('خطأ في الاتصال بقاعدة البيانات')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="login-logo">⚙️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)', margin: '8px 0 4px' }}>لوحة إدارة النظام</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Admin Panel - تسجيل دخول المشرف</p>
        </div>
        {error && <div style={{ background: '#fde8e8', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
        <div className="form-group"><label>👤 اسم المستخدم</label><input placeholder="Admin username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
        <div className="form-group"><label>🔒 كلمة المرور</label><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
        <button className="btn btn-primary btn-full" onClick={handleLogin} style={{ marginTop: 8 }}>🔐 دخول الإدارة</button>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--royal)', cursor: 'pointer', fontSize: 13 }}>← العودة للتطبيق</button>
        </div>
      </div>
    </div>
  )
}

function AdminDashboard({ admin, onLogout, onBack }) {
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [patientsList, setPatientsList] = useState([])
  const [admins, setAdmins] = useState([])
  const [complaints, setComplaints] = useState([])
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', name: '', clinic: '' })
  const [newComplaint, setNewComplaint] = useState('')
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersSnap, patientsSnap, adminsSnap, complaintsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'admins')),
        getDocs(collection(db, 'complaints')),
      ])
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPatientsList(patientsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setAdmins(adminsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setComplaints(complaintsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadData() }, [])
  useEffect(() => { loadData() }, [tab])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const addAdmin = async () => {
    if (!newAdmin.username.trim() || !newAdmin.password.trim() || !newAdmin.name.trim()) return showToast('أكمل جميع الحقول')
    const exists = admins.find(a => a.username === newAdmin.username)
    if (exists) return showToast('اسم المستخدم موجود بالفعل')
    await addDoc(collection(db, 'admins'), { ...newAdmin, role: 'admin', createdAt: new Date().toISOString() })
    setNewAdmin({ username: '', password: '', name: '', clinic: '' })
    setShowAddAdmin(false)
    await loadData()
    showToast('تمت إضافة المشرف')
  }

  const removeAdmin = async (id) => {
    if (admin.role !== 'superadmin') return showToast('فقط المدير العام يمكنه حذف المشرفين')
    const found = admins.find(a => a.id === id)
    if (found && found.role === 'superadmin') return showToast('لا يمكن حذف المدير العام')
    if (!confirm('هل أنت متأكد من حذف هذا المشرف؟')) return
    await deleteDoc(doc(db, 'admins', id))
    await loadData()
    showToast('تم حذف المشرف')
  }

  const removeUser = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
    await deleteDoc(doc(db, 'users', id))
    await loadData()
    showToast('تم حذف المستخدم')
  }

  const addComplaint = async () => {
    if (!newComplaint.trim()) return showToast('اكتب الشكوى أولاً')
    await addDoc(collection(db, 'complaints'), { text: newComplaint.trim(), by: 'مستفيد', date: new Date().toISOString(), status: 'جديد' })
    setNewComplaint('')
    await loadData()
    showToast('تم إرسال الشكوى')
  }

  const resolveComplaint = async (id) => {
    await updateDoc(doc(db, 'complaints', id), { status: 'تم الحل' })
    await loadData()
  }

  const deletePatient = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المريض؟')) return
    await deleteDoc(doc(db, 'patients', id))
    await loadData()
    showToast('تم حذف المريض')
  }

  const approveUser = async (id) => {
    await updateDoc(doc(db, 'users', id), { approved: true })
    await loadData()
    showToast('تمت الموافقة على المستخدم')
  }

  const rejectUser = async (id) => {
    if (!confirm('هل تريد رفض هذا الطلب وحذفه؟')) return
    await deleteDoc(doc(db, 'users', id))
    await loadData()
    showToast('تم رفض الطلب')
  }

  const updateSubscription = async (id, months) => {
    const user = users.find(u => u.id === id)
    if (!user) return
    const now = new Date()
    const currentEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : now
    const base = currentEnd > now ? currentEnd : now
    const newEnd = new Date(base)
    newEnd.setMonth(newEnd.getMonth() + months)
    await updateDoc(doc(db, 'users', id), { subscriptionEnd: newEnd.toISOString() })
    await loadData()
    showToast(`تم تمديد الاشتراك ${months} شهر`)
  }

  const freezeUser = async (id) => {
    await updateDoc(doc(db, 'users', id), { subscriptionEnd: new Date().toISOString() })
    await loadData()
    showToast('تم تجميد الحساب')
  }

  const unfreezeUser = async (id, months = 1) => {
    const now = new Date()
    const newEnd = new Date(now)
    newEnd.setMonth(newEnd.getMonth() + months)
    await updateDoc(doc(db, 'users', id), { subscriptionEnd: newEnd.toISOString() })
    await loadData()
    showToast('تم تفعيل الحساب')
  }

  const isExpired = (u) => u.subscriptionEnd && new Date(u.subscriptionEnd) < new Date()

  const pendingUsers = users.filter(u => u.approved === false).length

  const tabs = [
    { k: 'overview', l: '📊 النظرة العامة' },
    { k: 'approvals', l: `✅ الموافقات${pendingUsers ? ` (${pendingUsers})` : ''}` },
    { k: 'users', l: '👥 المستخدمين' },
    { k: 'patients', l: '🏥 المرضى' },
    { k: 'complaints', l: '📝 الشكاوى' },
    { k: 'admins', l: '⚙️ المشرفين' },
  ]

  const newComplaints = complaints.filter(c => c.status === 'جديد').length
  const expiredCount = users.filter(u => isExpired(u)).length

  if (loading) return (
    <div className="login-page">
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <div>جاري تحميل البيانات...</div>
      </div>
    </div>
  )

  return (
    <div className="app-container">
      {toast && <div className="toast">{toast}</div>}
      <nav className="top-nav">
        <div className="nav-brand">
          <div className="nav-brand-logo">⚙️</div>
          لوحة الإدارة
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, padding: '0 12px' }}>👤 {admin.name}</span>
        <button className="nav-item" onClick={onBack}>🏠 التطبيق</button>
        <button className="nav-item" onClick={onLogout}>🚪 خروج</button>
      </nav>
      <main className="app-content">
        <div className="header"><h1>⚙️ لوحة إدارة النظام</h1><p>إدارة المستخدمين والمرضى والمشرفين</p></div>
        <div className="page-inner">
          <div className="pill-tabs" style={{ marginBottom: 16 }}>
            {tabs.map(t => (
              <button key={t.k} className={`pill-tab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>
                {t.l} {t.k === 'complaints' && newComplaints > 0 && <span style={{ background: 'var(--danger)', color: 'white', borderRadius: 10, padding: '0 6px', fontSize: 10, marginRight: 4 }}>{newComplaints}</span>}
              </button>
            ))}
          </div>

          {tab === 'overview' && <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
              <div className="stat-card navy"><div className="stat-icon">👥</div><div className="number">{users.length}</div><div className="label">المستخدمين</div></div>
              <div className="stat-card gold"><div className="stat-icon">🏥</div><div className="number">{patientsList.length}</div><div className="label">المرضى</div></div>
              <div className="stat-card blue"><div className="stat-icon">⚙️</div><div className="number">{admins.length}</div><div className="label">المشرفين</div></div>
              <div className="stat-card gold"><div className="stat-icon">📝</div><div className="number">{newComplaints}</div><div className="label">شكاوى جديدة</div></div>
              <div className="stat-card navy" style={expiredCount > 0 ? { border: '2px solid var(--danger)' } : {}}><div className="stat-icon">❄️</div><div className="number" style={expiredCount > 0 ? { color: 'var(--danger)' } : {}}>{expiredCount}</div><div className="label">حسابات منتهية</div></div>
            </div>
            <div className="section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-title" style={{ marginBottom: 0 }}><span className="icon">⚙️</span> إضافة مشرف جديد</div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 14, border: '1px dashed var(--gold)' }}>
                <div className="form-row">
                  <div className="form-group"><label>👤 اسم المستخدم</label><input placeholder="username" value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} /></div>
                  <div className="form-group"><label>🔒 كلمة المرور</label><input type="password" placeholder="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>📝 الاسم الكامل</label><input placeholder="الاسم" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} /></div>
                  <div className="form-group"><label>🏥 مكان العيادة</label><input placeholder="العيادة" value={newAdmin.clinic} onChange={e => setNewAdmin({ ...newAdmin, clinic: e.target.value })} /></div>
                </div>
                <button className="btn btn-primary btn-full" onClick={addAdmin} style={{ marginTop: 4 }}>➕ إضافة مشرف</button>
              </div>
            </div>
            <div className="section">
              <div className="section-title"><span className="icon">⚙️</span> المشرفين الحاليين</div>
              {admins.map(a => (
                <div key={a.id} className="patient-item">
                  <div className="patient-avatar" style={{ background: a.role === 'superadmin' ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'linear-gradient(135deg, var(--royal), var(--med-blue))' }}>
                    {a.role === 'superadmin' ? '👑' : '⚙️'}
                  </div>
                  <div className="patient-info">
                    <div className="patient-name">{a.name} {a.role === 'superadmin' && <span style={{ fontSize: 10, background: 'var(--gold)', color: 'var(--navy)', padding: '1px 6px', borderRadius: 8, marginRight: 4 }}>مدير عام</span>}</div>
                    <div className="patient-meta">👤 {a.username} · 🔑 {a.password} · 🏥 {a.clinic || 'غير محدد'}</div>
                  </div>
                  {a.role !== 'superadmin' && <button onClick={() => removeAdmin(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }} title="حذف">🗑️</button>}
                </div>
              ))}
            </div>
            <div className="section">
              <div className="section-title"><span className="icon">👥</span> آخر المستخدمين المسجلين</div>
              {users.slice(-5).reverse().map(u => (
                <div key={u.id} className="patient-item">
                  <div className="patient-avatar">{u.name?.[0] || u.username?.[0] || '?'}</div>
                  <div className="patient-info">
                    <div className="patient-name">{u.name || u.username}</div>
                    <div className="patient-meta">👤 {u.username} · 🏥 {u.clinic || 'غير محدد'} · 🩺 {u.specialty || 'غير محدد'}</div>
                  </div>
                </div>
              ))}
              {!users.length && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>لا يوجد مستخدمين مسجلين</div>}
            </div>
            <div className="section">
              <div className="section-title"><span className="icon">📝</span> آخر الشكاوى</div>
              {complaints.slice(0, 3).map(c => (
                <div key={c.id} className="patient-item">
                  <div className="patient-info">
                    <div className="patient-name">{c.text}</div>
                    <div className="patient-meta">📅 {new Date(c.date).toLocaleDateString('ar')} · <span className={`tag ${c.status === 'جديد' ? 'tag-active' : 'tag-inactive'}`} style={{ fontSize: 10 }}>{c.status}</span></div>
                  </div>
                </div>
              ))}
              {!complaints.length && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>لا توجد شكاوى</div>}
            </div>
          </div>}

          {tab === 'approvals' && <div>
            <div className="section">
              <div className="section-title"><span className="icon">✅</span> طلبات الموافقة ({pendingUsers}) <button onClick={loadData} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }} title="تحديث">🔄</button></div>
              {users.filter(u => u.approved === false).map(u => (
                <div key={u.id} className="patient-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="patient-avatar" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--navy)', fontWeight: 700 }}>{u.name?.[0] || '?'}</div>
                      <div className="patient-info">
                        <div className="patient-name">{u.name || u.username}</div>
                        <div className="patient-meta">👤 {u.username} · 🏥 {u.clinic || 'غير محدد'} · 🩺 {u.specialty || 'غير محدد'}</div>
                        <div className="patient-meta">📧 {u.email || '—'} · 📞 {u.phone || '—'} · 📅 {new Date(u.createdAt).toLocaleDateString('ar')}</div>
                      </div>
                    </div>
                    <span className="tag tag-active" style={{ fontSize: 11, padding: '3px 10px' }}>⏳ في الانتظار</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-accent btn-sm" onClick={() => approveUser(u.id)}>✅ موافقة</button>
                    <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => rejectUser(u.id)}>❌ رفض</button>
                  </div>
                </div>
              ))}
              {pendingUsers === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>✅ لا توجد طلبات معلقة</div>}
            </div>
          </div>}

          {tab === 'users' && <div>
            <div className="section">
              <div className="section-title"><span className="icon">👥</span> جميع المستخدمين ({users.length})</div>
              {users.map(u => {
                const expired = isExpired(u)
                const end = u.subscriptionEnd ? new Date(u.subscriptionEnd).toLocaleDateString('ar') : 'غير محدد'
                const daysLeft = u.subscriptionEnd ? Math.ceil((new Date(u.subscriptionEnd) - new Date()) / (1000*60*60*24)) : 0
                return (
                  <div key={u.id} className="patient-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="patient-avatar" style={expired ? { background: 'linear-gradient(135deg, #e74c3c, #c0392b)' } : {}}>{u.name?.[0] || '?'}</div>
                        <div className="patient-info">
                          <div className="patient-name">{u.name || u.username} {expired && <span style={{ fontSize: 10, background: 'var(--danger)', color: 'white', padding: '1px 6px', borderRadius: 8, marginRight: 4 }}>منتهي</span>}</div>
                          <div className="patient-meta">👤 {u.username} · 🔑 {u.password || '***'} · 🏥 {u.clinic || 'غير محدد'} · 🩺 {u.specialty || 'غير محدد'}</div>
                          <div className="patient-meta">📅 ينتهي: {end} {expired ? '❌' : daysLeft > 0 ? `(${daysLeft} يوم متبقي)` : ''}</div>
                        </div>
                      </div>
                      <button onClick={() => removeUser(u.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }} title="حذف">🗑️</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-accent btn-sm" onClick={() => updateSubscription(u.id, 1)}>➕ شهر</button>
                      <button className="btn btn-primary btn-sm" onClick={() => updateSubscription(u.id, 3)}>➕ 3 أشهر</button>
                      <button className="btn btn-sm" style={{ background: 'var(--royal)', color: 'white' }} onClick={() => updateSubscription(u.id, 12)}>➕ سنة</button>
                      {expired ? (
                        <button className="btn btn-sm" style={{ background: 'var(--success)', color: 'white' }} onClick={() => unfreezeUser(u.id)}>🔄 تفعيل</button>
                      ) : (
                        <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => freezeUser(u.id)}>❄️ تجميد</button>
                      )}
                    </div>
                  </div>
                )
              })}
              {!users.length && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>لا يوجد مستخدمين مسجلين</div>}
            </div>
          </div>}

          {tab === 'patients' && <div>
            <div className="section">
              <div className="section-title"><span className="icon">🏥</span> جميع المرضى ({patientsList.length})</div>
              {patientsList.map(p => (
                <div key={p.id} className="patient-item">
                  <div className="patient-avatar">{p.name?.[0] || '?'}</div>
                  <div className="patient-info">
                    <div className="patient-name">{p.name}</div>
                    <div className="patient-meta">{p.age} سنة · {p.gender} · 📞 {p.phone} · 📍 {p.address}</div>
                  </div>
                  <button onClick={() => deletePatient(p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }} title="حذف">🗑️</button>
                </div>
              ))}
              {!patientsList.length && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>لا يوجد مرضى مسجلين</div>}
            </div>
          </div>}

          {tab === 'complaints' && <div>
            <div className="section">
              <div className="section-title"><span className="icon">📝</span> إرسال شكوى جديدة</div>
              <textarea placeholder="اكتب شكوى أو اقتراح..." value={newComplaint} onChange={e => setNewComplaint(e.target.value)} style={{ width: '100%', padding: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', minHeight: 80, resize: 'vertical' }} />
              <button className="btn btn-primary btn-full" onClick={addComplaint} style={{ marginTop: 8 }}>📤 إرسال الشكوى</button>
            </div>
            <div className="section">
              <div className="section-title"><span className="icon">📋</span> جميع الشكاوى ({complaints.length})</div>
              {complaints.map(c => (
                <div key={c.id} className="patient-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="patient-info">
                      <div className="patient-name">{c.text}</div>
                      <div className="patient-meta">📅 {new Date(c.date).toLocaleDateString('ar')} · {new Date(c.date).toLocaleTimeString('ar')}</div>
                    </div>
                    <span className={`tag ${c.status === 'جديد' ? 'tag-active' : 'tag-inactive'}`}>{c.status}</span>
                  </div>
                  {c.status === 'جديد' && <button className="btn btn-sm btn-accent" onClick={() => resolveComplaint(c.id)}>✅ تم الحل</button>}
                </div>
              ))}
              {!complaints.length && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>لا توجد شكاوى</div>}
            </div>
          </div>}

          {tab === 'admins' && <div>
            <div className="section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-title" style={{ marginBottom: 0 }}><span className="icon">⚙️</span> المشرفين ({admins.length})</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddAdmin(!showAddAdmin)}>➕ إضافة مشرف</button>
              </div>
              {showAddAdmin && (
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 12, border: '1px dashed var(--gold)' }}>
                  <div className="form-row">
                    <div className="form-group"><label>👤 اسم المستخدم</label><input placeholder="username" value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} /></div>
                    <div className="form-group"><label>📝 الاسم الكامل</label><input placeholder="الاسم" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>🔒 كلمة المرور</label><input type="password" placeholder="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} /></div>
                    <div className="form-group"><label>🏥 مكان العيادة</label><input placeholder="العيادة" value={newAdmin.clinic} onChange={e => setNewAdmin({ ...newAdmin, clinic: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={addAdmin}>✅ حفظ</button>
                    <button className="btn btn-sm" style={{ background: 'var(--border)', color: 'var(--text)' }} onClick={() => setShowAddAdmin(false)}>❌ إلغاء</button>
                  </div>
                </div>
              )}
              {admins.map(a => (
                <div key={a.id} className="patient-item">
                  <div className="patient-avatar" style={{ background: a.role === 'superadmin' ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'linear-gradient(135deg, var(--royal), var(--med-blue))' }}>
                    {a.role === 'superadmin' ? '👑' : '⚙️'}
                  </div>
                  <div className="patient-info">
                    <div className="patient-name">{a.name} {a.role === 'superadmin' && <span style={{ fontSize: 10, background: 'var(--gold)', color: 'var(--navy)', padding: '1px 6px', borderRadius: 8, marginRight: 4 }}>مدير عام</span>}</div>
                    <div className="patient-meta">👤 {a.username} · 🔑 {a.password} · 🏥 {a.clinic || 'غير محدد'} · 📅 {new Date(a.createdAt).toLocaleDateString('ar')}</div>
                  </div>
                  {a.role !== 'superadmin' && <button onClick={() => removeAdmin(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }} title="حذف">🗑️</button>}
                </div>
              ))}
            </div>
          </div>}
        </div>
      </main>
    </div>
  )
}
