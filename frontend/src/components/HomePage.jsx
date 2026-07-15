import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { patients as patientsApi } from '../api'
import { EmptyState } from './shared'

export default function HomePage() {
  const [list, setList] = useState([])
  const navigate = useNavigate()
  useEffect(() => { patientsApi.list().then(r => setList(r.data)).catch(() => { }) }, [])
  const recent = [...list].sort((a, b) => (b.id || '').localeCompare(a.id || '')).slice(0, 5)
  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

  return (
    <div>
      <div className="header"><h1>🏥 مرحباً بك</h1><p>نظام إدارة سجلات المرضى</p></div>
      <div className="page-inner">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <div className="stat-card navy" onClick={() => navigate('/search')}>
            <div className="stat-icon">👥</div>
            <div className="number">{list.length}</div>
            <div className="label">إجمالي المرضى</div>
          </div>
          <div className="stat-card gold" onClick={() => navigate('/add')}>
            <div className="stat-icon">➕</div>
            <div className="number">+</div>
            <div className="label">إضافة مريض</div>
          </div>
          <div className="stat-card blue" onClick={() => navigate('/surgery')}>
            <div className="stat-icon">🩺</div>
            <div className="number">{list.length > 0 ? '🩺' : '0'}</div>
            <div className="label">العمليات</div>
          </div>
          <div className="stat-card gold" onClick={() => navigate('/clinic')}>
            <div className="stat-icon">🏥</div>
            <div className="number">{list.length > 0 ? '🏥' : '0'}</div>
            <div className="label">العيادة</div>
          </div>
        </div>
        <div className="section">
          <div className="section-title"><span className="icon">📋</span> آخر المرضى</div>
          {recent.length ? recent.map(p => (
            <div key={p.id} className="patient-item" onClick={() => navigate(`/details/${p.id}`)}>
              <div className="patient-avatar">{getInitials(p.name)}</div>
              <div className="patient-info">
                <div className="patient-name">{p.name}</div>
                <div className="patient-meta">{p.age} سنة · {p.gender} · {p.phone}</div>
              </div>
              <span className="patient-arrow">‹</span>
            </div>
          )) : <EmptyState icon="📋" text="لا يوجد مرضى بعد" />}
        </div>
      </div>
    </div>
  )
}
