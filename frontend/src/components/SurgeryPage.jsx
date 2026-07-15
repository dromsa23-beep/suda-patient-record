import { useState, useEffect } from 'react'
import { surgeries as surgeriesApi } from '../api'
import { EmptyState } from './shared'

export default function SurgeryPage() {
  const [days, setDays] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [patients, setPatients] = useState([])
  const [name, setName] = useState('')
  const [proc, setProc] = useState('')
  const [phone, setPhone] = useState('')
  const load = () => surgeriesApi.list().then(r => setDays(r.data)).catch(() => { })
  useEffect(() => { load() }, [])
  const addPatient = () => {
    if (!name.trim()) return alert('أدخل اسم المريض')
    setPatients([...patients, { name: name.trim(), procedure: proc.trim(), phone: phone.trim() }])
    setName(''); setProc(''); setPhone('')
  }
  const saveDay = async () => {
    if (!patients.length) return alert('أضف مرضى')
    await surgeriesApi.create({ date, patients })
    setPatients([]); load(); alert('تم الحفظ')
  }
  const del = async (id) => { if (alert('حذف؟') === false) return; await surgeriesApi.delete(id); load() }
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <div className="header"><h1>🩺 قائمة العمليات</h1><p>تسجيل وإدارة العمليات الجراحية</p></div>
      <div className="page-inner">
        <div className="section" style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }} />
          </div>
          <div className="input-group">
            <input placeholder="اسم المريض" value={name} onChange={e => setName(e.target.value)} style={{ flex: 2, padding: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }} />
            <input placeholder="نوع العملية" value={proc} onChange={e => setProc(e.target.value)} style={{ flex: 2, padding: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }} />
            <input placeholder="الهاتف" value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1, padding: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }} />
            <button className="btn btn-primary" onClick={addPatient}>➕</button>
          </div>
          {patients.length > 0 && <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>المريض</th><th>العملية</th><th>الهاتف</th><th></th></tr></thead>
                <tbody>{patients.map((p, i) => <tr key={i}><td>{i + 1}</td><td style={{ fontWeight: 600 }}>{p.name}</td><td style={{ color: 'var(--royal)' }}>{p.procedure}</td><td>{p.phone}</td><td><button onClick={() => setPatients(patients.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button></td></tr>)}</tbody>
              </table>
            </div>
            <button className="btn btn-accent btn-full" onClick={saveDay} style={{ marginTop: 10 }}>💾 حفظ العمليات</button>
          </>}
        </div>
        {sorted.map(d => (
          <div key={d.id} className="section" style={{ marginBottom: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div><div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>📅 {d.date}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>👥 {d.patients.length} مريض</div></div>
              <button onClick={() => del(d.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer' }}>🗑️</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th style={{ textAlign: 'right' }}>#</th><th style={{ textAlign: 'right' }}>المريض</th><th style={{ textAlign: 'right' }}>العملية</th><th style={{ textAlign: 'right' }}>الهاتف</th></tr></thead>
                <tbody>{d.patients.map((p, i) => <tr key={i}><td>{i + 1}</td><td style={{ fontWeight: 600 }}>{p.name}</td><td style={{ color: 'var(--royal)' }}>{p.procedure}</td><td>{p.phone}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ))}
        {!sorted.length && <EmptyState icon="🩺" text="لا توجد عمليات مسجلة" />}
      </div>
    </div>
  )
}
