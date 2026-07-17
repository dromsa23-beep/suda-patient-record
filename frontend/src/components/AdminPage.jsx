import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc, onSnapshot
} from 'firebase/firestore'
import { sectionLabels } from '../constants'
import jsPDF from 'jspdf'

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
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [editPassword, setEditPassword] = useState('')
  const [expandedUser, setExpandedUser] = useState(null)

  const patientsByUser = useMemo(() => {
    const groups = {}
    patientsList.forEach(p => {
      const uid = p.userId || p.createdBy || 'unknown'
      if (!groups[uid]) groups[uid] = []
      groups[uid].push(p)
    })
    return groups
  }, [patientsList])

  const getUserLabel = (uid) => {
    if (uid === 'unknown') return 'غير معروف'
    const u = users.find(u => u.id === uid || u.username === uid)
    return u ? (u.name || u.username) : uid
  }

  const downloadPatient = async (p) => {
    try {
      const docPdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const pageW = 210
      const margin = 15
      const contentW = pageW - margin * 2
      let y = 20

      const addText = (text, size = 11, isBold = false) => {
        if (!text) return
        docPdf.setFontSize(size)
        docPdf.setFont('helvetica', isBold ? 'bold' : 'normal')
        const lines = docPdf.splitTextToSize(String(text), contentW)
        lines.forEach(line => {
          if (y > 275) { docPdf.addPage(); y = 20 }
          docPdf.text(line, pageW - margin, y, { align: 'right' })
          y += size * 0.5
        })
      }

      const addSection = (title, content) => {
        if (!content) return
        if (y > 260) { docPdf.addPage(); y = 20 }
        docPdf.setFillColor(41, 65, 122)
        docPdf.roundedRect(margin, y - 4, contentW, 8, 1, 1, 'F')
        docPdf.setTextColor(255, 255, 255)
        docPdf.setFontSize(11)
        docPdf.setFont('helvetica', 'bold')
        docPdf.text(title, pageW - margin, y + 1, { align: 'right' })
        docPdf.setTextColor(0, 0, 0)
        y += 10
        addText(content)
        y += 3
      }

      const addImageToPdf = (base64, title) => {
        if (!base64) return
        try {
          if (y > 200) { docPdf.addPage(); y = 20 }
          docPdf.setFillColor(240, 240, 240)
          docPdf.roundedRect(margin, y - 2, contentW, 6, 1, 1, 'F')
          docPdf.setFontSize(9)
          docPdf.setFont('helvetica', 'bold')
          docPdf.text(title, pageW - margin, y + 2, { align: 'right' })
          y += 8
          const imgW = contentW
          const imgH = imgW * 0.6
          if (y + imgH > 275) { docPdf.addPage(); y = 20 }
          docPdf.addImage(base64, 'JPEG', margin, y, imgW, imgH)
          y += imgH + 5
        } catch (e) { console.warn('Image skip:', e) }
      }

      // Title
      docPdf.setFillColor(41, 65, 122)
      docPdf.rect(0, 0, pageW, 35, 'F')
      docPdf.setTextColor(255, 255, 255)
      docPdf.setFontSize(20)
      docPdf.setFont('helvetica', 'bold')
      docPdf.text(`Patient: ${p.name || '—'}`, pageW - margin, 18, { align: 'right' })
      docPdf.setFontSize(10)
      docPdf.text(`Export: ${new Date().toLocaleDateString('en-US')}`, pageW - margin, 28, { align: 'right' })
      docPdf.setTextColor(0, 0, 0)
      y = 42

      // Personal Info
      addSection('Personal Information', [
        `Name: ${p.name}`,
        `Age: ${p.age} years`,
        `Gender: ${p.gender}`,
        `Phone: ${p.phone}`,
        `Address: ${p.address || '—'}`,
        `Blood Type: ${p.bloodType || '—'}`,
        `Occupation: ${p.occupation || '—'}`,
        `Emergency: ${p.emergency || '—'}`,
      ].join('\n'))

      if (p.hpi) addSection('Chief Complaint (HPI)', p.hpi)
      if (p.chronicMeds) addSection('Chronic Medications', p.chronicMeds)
      if (p.drugAllergies) addSection('Drug Allergies', p.drugAllergies)
      if (p.socialHistory) addSection('Social History', p.socialHistory)
      if (p.surgicalHistory) addSection('Surgical History', p.surgicalHistory)
      if (p.pmh?.length) addSection('Past Medical History', p.pmh.map(m => `• ${m}`).join('\n'))
      if (p.fh?.length) addSection('Family History', p.fh.map(f => `• ${f}`).join('\n'))

      const rosItems = Object.entries(p.ros || {}).filter(([, v]) => v?.length)
      if (rosItems.length) {
        addSection('Review of Systems', rosItems.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n'))
      }

      // Records
      if (p.records?.length) {
        p.records.forEach((r, i) => {
          if (y > 250) { docPdf.addPage(); y = 20 }
          docPdf.setFillColor(100, 150, 200)
          docPdf.roundedRect(margin, y - 2, contentW, 8, 1, 1, 'F')
          docPdf.setTextColor(255, 255, 255)
          docPdf.setFontSize(12)
          docPdf.setFont('helvetica', 'bold')
          docPdf.text(`Record #${i + 1} - ${r.date || '—'}`, pageW - margin, y + 2, { align: 'right' })
          docPdf.setTextColor(0, 0, 0)
          y += 10

          if (r.primaryDx) addText(`Diagnosis: ${r.primaryDx}`, 10, true)
          if (r.chiefComplaint) addText(`Complaint: ${r.chiefComplaint}`, 10)
          if (r.treatmentPlan) addText(`Treatment: ${r.treatmentPlan}`, 10)
          if (r.followUp) addText(`Follow-up: ${r.followUp}`, 10)

          // Investigation images
          if (r.invImages?.length) {
            for (const img of r.invImages) {
              addImageToPdf(img, `Investigation Image (${i + 1})`)
            }
          }
          y += 3
        })
      }

      docPdf.save(`patient_${p.name || p.id}.pdf`)
    } catch (e) {
      console.error('PDF export error:', e)
      alert('حدث خطأ أثناء إنشاء ملف PDF')
    }
  }

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
    } catch (e) { console.error('loadData error:', e) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadData() }, [])
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (err) => console.error('onSnapshot users error:', err))
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snap) => {
      setPatientsList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (err) => console.error('onSnapshot patients error:', err))
    const unsubComplaints = onSnapshot(collection(db, 'complaints'), (snap) => {
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (err) => console.error('onSnapshot complaints error:', err))
    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snap) => {
      const allAdmins = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setAdmins(allAdmins)
      const superadmins = allAdmins.filter(a => a.role === 'superadmin')
      if (superadmins.length > 1) {
        for (let i = 1; i < superadmins.length; i++) {
          deleteDoc(doc(db, 'admins', superadmins[i].id))
        }
      }
    }, (err) => console.error('onSnapshot admins error:', err))
    return () => { unsubUsers(); unsubPatients(); unsubComplaints(); unsubAdmins() }
  }, [])

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
    if (!confirm('هل أنت متأكد من حذف هذا المشرف؟')) return
    await deleteDoc(doc(db, 'admins', id))
    showToast('تم حذف المشرف')
  }

  const changeAdminPassword = async (id) => {
    if (!editPassword || editPassword.length < 6) return showToast('كلمة المرور 6 أحرف على الأقل')
    await updateDoc(doc(db, 'admins', id), { password: editPassword })
    setEditingAdmin(null)
    setEditPassword('')
    showToast('تم تغيير كلمة المرور')
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

  const pendingUsers = users.filter(u => u.approved === false || u.approved === undefined).length

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div className="stat-card navy"><div className="stat-icon">👥</div><div className="number">{users.length}</div><div className="label">المستخدمين</div></div>
              <div className="stat-card gold" style={pendingUsers > 0 ? { border: '2px solid var(--success)' } : {}}><div className="stat-icon">✅</div><div className="number" style={pendingUsers > 0 ? { color: 'var(--success)' } : {}}>{pendingUsers}</div><div className="label">بانتظار الموافقة</div></div>
              <div className="stat-card blue"><div className="stat-icon">🏥</div><div className="number">{patientsList.length}</div><div className="label">المرضى</div></div>
              <div className="stat-card gold"><div className="stat-icon">⚙️</div><div className="number">{admins.length}</div><div className="label">المشرفين</div></div>
              <div className="stat-card navy" style={newComplaints > 0 ? { border: '2px solid var(--danger)' } : {}}><div className="stat-icon">📝</div><div className="number" style={newComplaints > 0 ? { color: 'var(--danger)' } : {}}>{newComplaints}</div><div className="label">شكاوى جديدة</div></div>
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
              {users.filter(u => u.approved === false || u.approved === undefined).map(u => (
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
              <div className="section-title"><span className="icon">🏥</span> جميع المرضى ({patientsList.length}) — حسب المستخدم</div>
              {Object.entries(patientsByUser).map(([uid, plist]) => (
                <div key={uid} className="patient-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedUser(expandedUser === uid ? null : uid)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="patient-avatar" style={{ background: 'var(--royal)', color: 'white' }}>👤</div>
                      <div className="patient-info">
                        <div className="patient-name">{getUserLabel(uid)}</div>
                        <div className="patient-meta">📋 {plist.length} مريض</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--text-3)', transition: 'transform 0.2s', transform: expandedUser === uid ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </div>
                  {expandedUser === uid && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 10, borderRight: '3px solid var(--royal)', marginRight: 6, paddingTop: 8 }}>
                      {plist.map(p => {
                        const records = p.records || []
                        const lastRecord = records[records.length - 1]
                        return (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                              <div className="patient-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{p.name?.[0] || '?'}</div>
                              <div className="patient-info" style={{ minWidth: 0 }}>
                                <div className="patient-name" style={{ fontSize: 14 }}>{p.name}</div>
                                <div className="patient-meta" style={{ fontSize: 11 }}>{p.age} سنة · {p.gender} · 📞 {p.phone}</div>
                                {lastRecord && <div className="patient-meta" style={{ fontSize: 11 }}>🩺 آخر زيارة: {lastRecord.date} · {lastRecord.primaryDx || '—'}</div>}
                                <div className="patient-meta" style={{ fontSize: 11 }}>📋 {records.length} سجل طبي</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button onClick={(e) => { e.stopPropagation(); downloadPatient(p) }} style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }} title="تحميل بيانات المريض كـ PDF">📄 PDF</button>
                              <button onClick={(e) => { e.stopPropagation(); window.open('/details/' + p.id, '_blank') }} style={{ background: 'var(--royal)', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>👁️ تفاصيل</button>
                              <button onClick={(e) => { e.stopPropagation(); deletePatient(p.id) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }} title="حذف">🗑️</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
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
                <div key={a.id} className="patient-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="patient-avatar" style={{ background: a.role === 'superadmin' ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'linear-gradient(135deg, var(--royal), var(--med-blue))' }}>
                        {a.role === 'superadmin' ? '👑' : '⚙️'}
                      </div>
                      <div className="patient-info">
                        <div className="patient-name">{a.name} {a.role === 'superadmin' && <span style={{ fontSize: 10, background: 'var(--gold)', color: 'var(--navy)', padding: '1px 6px', borderRadius: 8, marginRight: 4 }}>مدير عام</span>}</div>
                        <div className="patient-meta">👤 {a.username} · 🔑 {a.password} · 🏥 {a.clinic || 'غير محدد'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditingAdmin(a.id); setEditPassword('') }} style={{ background: 'none', border: 'none', color: 'var(--royal)', cursor: 'pointer', fontSize: 14 }} title="تغيير كلمة المرور">🔑</button>
                      <button onClick={() => removeAdmin(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }} title="حذف">🗑️</button>
                    </div>
                  </div>
                  {editingAdmin === a.id && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                      <input type="password" placeholder="كلمة المرور الجديدة" value={editPassword} onChange={e => setEditPassword(e.target.value)} style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && changeAdminPassword(a.id)} />
                      <button className="btn btn-accent btn-sm" onClick={() => changeAdminPassword(a.id)}>✅ حفظ</button>
                      <button className="btn btn-sm" style={{ background: 'var(--border)', color: 'var(--text)' }} onClick={() => setEditingAdmin(null)}>❌</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>}
        </div>
      </main>
    </div>
  )
}
