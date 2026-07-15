import { useState, useEffect } from 'react'
import { clinics as clinicsApi } from '../api'
import { EmptyState } from './shared'

export default function ClinicPage() {
  const [view, setView] = useState('menu')
  const [days, setDays] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [place, setPlace] = useState('')
  const [patients, setPatients] = useState([])
  const [pname, setPname] = useState('')
  const [pplace, setPplace] = useState('')
  const [ptype, setPtype] = useState('new')
  const [search, setSearch] = useState('')
  const load = () => clinicsApi.list().then(r => setDays(r.data)).catch(() => { })
  useEffect(() => { load() }, [])
  const addPatient = () => {
    if (!pname.trim()) return alert('أدخل اسم المريض')
    setPatients([...patients, { name: pname.trim(), place: pplace.trim() || '---', type: ptype }])
    setPname(''); setPplace('')
  }
  const saveDay = async () => {
    if (!patients.length) return alert('أضف مرضى')
    await clinicsApi.create({ date, place: place || 'العيادة', patients })
    setPatients([]); setView('previous'); load()
  }
  const del = async (id) => { if (confirm('حذف؟')) { await clinicsApi.delete(id); load() } }
  const filtered = days.filter(d => !search || d.date.includes(search) || d.patients.some(p => p.name.toLowerCase().includes(search.toLowerCase())))
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  if (view === 'menu') return (
    <div>
      <div className="header"><h1>🏥 إدارة العيادة</h1></div>
      <div className="page-inner">
        <div className="menu-grid">
          <div className="menu-card" style={{ background: 'linear-gradient(135deg,var(--navy),var(--royal))', color: 'white' }} onClick={() => setView('new')}>
            <div className="menu-icon">🏥</div>
            <div className="menu-title">عيادة جديدة</div>
            <div className="menu-desc">تسجيل مرضى جلسة اليوم</div>
          </div>
          <div className="menu-card" style={{ background: 'linear-gradient(135deg,var(--gold),var(--gold-light))', color: 'var(--navy)' }} onClick={() => { setView('previous'); load() }}>
            <div className="menu-icon">📂</div>
            <div className="menu-title">عيادات سابقة</div>
            <div className="menu-desc">استعراض وبحث</div>
          </div>
        </div>
      </div>
    </div>
  )

  if (view === 'new') return (
    <div>
      <div className="header">
        <div className="header-flex">
          <button className="back-btn" onClick={() => setView('menu')}>‹</button>
          <h1 style={{ flex: 1 }}>🏥 عيادة جديدة</h1>
        </div>
      </div>
      <div className="page-inner">
        <div className="section" style={{ padding: 14 }}>
          <div className="form-row">
            <div className="form-group"><label>📅 التاريخ</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="form-group"><label>📍 المكان</label><input placeholder="اسم العيادة" value={place} onChange={e => setPlace(e.target.value)} /></div>
          </div>
        </div>
        <div className="section" style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>👤 إضافة مريض</div>
          <div className="input-group">
            <input placeholder="الاسم" value={pname} onChange={e => setPname(e.target.value)} style={{ flex: 2, padding: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }} />
            <input placeholder="المكان" value={pplace} onChange={e => setPplace(e.target.value)} style={{ flex: 1, padding: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }} />
            <select value={ptype} onChange={e => setPtype(e.target.value)} style={{ padding: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }}>
              <option value="new">🆕 جديد</option><option value="followup">🔄 سابقة</option>
            </select>
            <button className="btn btn-primary" onClick={addPatient}>➕</button>
          </div>
          {patients.length > 0 && <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>الاسم</th><th>المكان</th><th>الحالة</th><th></th></tr></thead>
                <tbody>{patients.map((p, i) => <tr key={i}><td>{i + 1}</td><td style={{ fontWeight: 600 }}>{p.name}</td><td>{p.place}</td><td><span className={`tag ${p.type === 'new' ? 'tag-new' : 'tag-followup'}`}>{p.type === 'new' ? '🆕 جديد' : '🔄 سابقة'}</span></td><td><button onClick={() => setPatients(patients.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button></td></tr>)}</tbody>
              </table>
            </div>
            <button className="btn btn-accent btn-full" onClick={saveDay} style={{ marginTop: 10 }}>💾 حفظ العيادة</button>
          </>}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="header">
        <div className="header-flex">
          <button className="back-btn" onClick={() => setView('menu')}>‹</button>
          <h1 style={{ flex: 1 }}>📂 عيادات سابقة</h1>
        </div>
      </div>
      <div className="page-inner">
        <div className="section" style={{ padding: 12 }}>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input className="search-input" style={{ paddingRight: 40 }} placeholder="بحث باليوم أو اسم المريض..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {sorted.map(d => (
          <div key={d.id} className="section" style={{ marginBottom: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div><div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>📅 {d.date}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>📍 {d.place} · 👥 {d.patients.length} مريض</div></div>
              <button onClick={() => del(d.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer' }}>🗑️</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th style={{ textAlign: 'right' }}>#</th><th style={{ textAlign: 'right' }}>الاسم</th><th style={{ textAlign: 'right' }}>المكان</th><th style={{ textAlign: 'right' }}>الحالة</th></tr></thead>
                <tbody>{d.patients.map((p, i) => <tr key={i}><td>{i + 1}</td><td style={{ fontWeight: 600 }}>{p.name}</td><td>{p.place}</td><td><span className={`tag ${p.type === 'new' ? 'tag-new' : 'tag-followup'}`}>{p.type === 'new' ? '🆕 جديد' : '🔄 سابقة'}</span></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ))}
        {!sorted.length && <EmptyState icon="📂" text="لا توجد عيادات" />}
      </div>
    </div>
  )
}
