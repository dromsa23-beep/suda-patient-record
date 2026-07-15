import { useState, useEffect } from 'react'
import { stats as statsApi } from '../api'

export default function StatsPage() {
  const [s, setS] = useState(null)
  useEffect(() => { statsApi.get().then(r => setS(r.data)).catch(() => { }) }, [])
  if (!s) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }} className="pulse-loading">جاري التحميل...</div>
  return (
    <div>
      <div className="header"><h1>📊 الإحصائيات</h1><p>نظرة عامة على قاعدة بيانات المرضى</p></div>
      <div className="page-inner">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <div className="stat-card navy"><div className="stat-icon">👥</div><div className="number">{s.total}</div><div className="label">إجمالي المرضى</div></div>
          <div className="stat-card gold"><div className="stat-icon">📊</div><div className="number">{s.avgAge}</div><div className="label">متوسط العمر</div></div>
          <div className="stat-card blue"><div className="stat-icon">♂️</div><div className="number">{s.male}</div><div className="label">ذكور</div></div>
          <div className="stat-card gold"><div className="stat-icon">♀️</div><div className="number">{s.female}</div><div className="label">إناث</div></div>
        </div>
        <div className="section">
          <div className="section-title"><span className="icon">🦠</span> أكثر الأمراض</div>
          {s.topDiseases?.length ? s.topDiseases.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 4 }}>
              <span>{d.name}</span>
              <span className="badge-number">{d.count}</span>
            </div>
          )) : <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)' }}>لا توجد بيانات</div>}
        </div>
        <div className="section">
          <div className="section-title"><span className="icon">🔬</span> أكثر الفحوصات</div>
          {s.topExams?.length ? s.topExams.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 4 }}>
              <span>{d.name}</span>
              <span className="badge-number">{d.count}</span>
            </div>
          )) : <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)' }}>لا توجد بيانات</div>}
        </div>
      </div>
    </div>
  )
}
