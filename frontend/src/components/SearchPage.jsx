import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { patients as patientsApi } from '../api'
import { EmptyState } from './shared'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [list, setList] = useState([])
  const navigate = useNavigate()
  const doSearch = useCallback(async () => {
    try { const r = query ? await patientsApi.search(query) : await patientsApi.list(); setList(r.data) } catch (e) { }
  }, [query])
  useEffect(() => { doSearch() }, [])
  useEffect(() => { const t = setTimeout(doSearch, 300); return () => clearTimeout(t) }, [query])
  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

  return (
    <div>
      <div className="header"><h1>🔍 البحث عن مريض</h1></div>
      <div className="page-inner">
        <div className="section">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input className="search-input" style={{ paddingRight: 40 }} placeholder="ابحث باسم المريض أو رقم الهاتف..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="section">
          <div className="section-title"><span className="icon">👥</span> النتائج ({list.length})</div>
          {list.map(p => (
            <div key={p.id} className="patient-item" onClick={() => navigate(`/details/${p.id}`)}>
              <div className="patient-avatar">{getInitials(p.name)}</div>
              <div className="patient-info">
                <div className="patient-name">{p.name}</div>
                <div className="patient-meta">{p.age} سنة · {p.gender} · {p.phone} · {p.address}</div>
              </div>
              <span className="patient-arrow">‹</span>
            </div>
          ))}
          {!list.length && <EmptyState icon="🔍" text="لا توجد نتائج" />}
        </div>
      </div>
    </div>
  )
}
