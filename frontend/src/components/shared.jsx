import { useState } from 'react'

export function Accordion({ title, name, active, toggle, children }) {
  const isOpen = active === name
  return (
    <div className="accordion-section">
      <div className="accordion-header" onClick={() => toggle(name)}>
        <span className={`accordion-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        <span className="accordion-title">{title}</span>
      </div>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  )
}

export function EditAccordion({ title, name, active, toggle, editMode, onMoveUp, onMoveDown, onDelete, onAddRow, children }) {
  const isOpen = active === name
  return (
    <div className={`accordion-section ${editMode ? 'edit-mode' : ''}`}>
      <div className="accordion-header" style={{ background: editMode ? '#fffbe6' : 'transparent' }}>
        <span className={`accordion-arrow ${isOpen ? 'open' : ''}`} onClick={() => toggle(name)}>▼</span>
        <span className="accordion-title" onClick={() => toggle(name)}>{title}</span>
        {editMode && <div className="accordion-actions">
          <button onClick={onMoveUp} className="btn btn-sm btn-outline" style={{ padding: '2px 6px', fontSize: 11 }} title="تحريك لأعلى">▲</button>
          <button onClick={onMoveDown} className="btn btn-sm btn-outline" style={{ padding: '2px 6px', fontSize: 11 }} title="تحريك لأسفل">▼</button>
          {onAddRow && <button onClick={onAddRow} className="btn btn-sm" style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '2px 6px', fontSize: 11 }} title="إضافة سطر">+ سطر</button>}
          <button onClick={onDelete} className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '2px 6px', fontSize: 11 }} title="حذف القسم">✕</button>
        </div>}
      </div>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  )
}

export function EditableRow({ editMode, label, onLabelEdit, children }) {
  const [editing, setEditing] = useState(false)
  const [newLabel, setNewLabel] = useState(label)
  if (!editMode) return <div className="form-group">{children}</div>
  return (
    <div className="form-group" style={{ position: 'relative', border: '1px dashed var(--gold)', borderRadius: 8, padding: 8, marginBottom: 6, background: '#fffdf5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {editing ? (
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} style={{ flex: 1, fontSize: 11, padding: '2px 6px', border: '1px solid var(--royal)', borderRadius: 4 }} />
        ) : (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', flex: 1 }}>{label}</span>
        )}
        <button onClick={() => { if (editing) { onLabelEdit(newLabel); setEditing(false) } else { setEditing(true) } }} style={{ background: editing ? 'var(--success)' : 'var(--bg)', color: editing ? 'white' : 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', cursor: 'pointer', fontSize: 10 }}>{editing ? '✓' : '✏️'}</button>
      </div>
      {children}
    </div>
  )
}

export function Lightbox({ images, index, onClose }) {
  if (index === null || !images?.length) return null
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-counter">{index + 1} / {images.length}</div>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      {images.length > 1 && <>
        <button className="lightbox-nav prev" onClick={e => { e.stopPropagation(); onClose((index - 1 + images.length) % images.length) }}>‹</button>
        <button className="lightbox-nav next" onClick={e => { e.stopPropagation(); onClose((index + 1) % images.length) }}>›</button>
      </>}
      <img src={images[index]} onClick={e => e.stopPropagation()} className="lightbox-img" alt="" />
    </div>
  )
}

export function ImageGrid({ images, onRemove, onOpen }) {
  if (!images?.length) return null
  return (
    <div className="image-grid">
      {images.map((img, i) => (
        <div key={i} className="image-grid-item" onClick={() => onOpen(i)}>
          <img src={img} alt="" />
          {onRemove && <button className="image-grid-remove" onClick={e => { e.stopPropagation(); onRemove(i) }}>✕</button>}
          <div className="image-grid-view">عرض</div>
        </div>
      ))}
    </div>
  )
}

export function FieldBlock({ label, value }) {
  return (
    <div className="field-block">
      <div className="field-label">{label}</div>
      <div className="field-value">{value}</div>
    </div>
  )
}

export function RecordCard({ record, idx }) {
  const r = record
  return (
    <div className="record-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>📅 {r.date}</span>
        <span className="badge-number">#{idx + 1}</span>
      </div>
      {r.chiefComplaint && <div style={{ fontSize: 13, fontWeight: 600 }}>🩺 {r.chiefComplaint}</div>}
      {r.primaryDx && <div style={{ background: 'var(--navy)', color: 'white', padding: '4px 8px', borderRadius: 4, marginTop: 4, fontSize: 12 }}>✅ {r.primaryDx}</div>}
    </div>
  )
}

export function EmptyState({ icon, text }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><p>{text}</p></div>
}
