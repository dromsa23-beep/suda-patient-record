import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { patients as patientsApi } from '../api'
import { emptyPatient, pmhOptions, fhOptions, rosSystemOptions, rosLabels, bloodTypes, genders, sectionLabels, defaultSectionOrder, socratesPlaceholder, imagingTypes } from '../constants'
import { EditAccordion, EditableRow, Lightbox, ImageGrid } from './shared'

export default function AddPage({ user }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const fRef = useRef({ ...emptyPatient })
  const [, forceRender] = useState(0)
  const [activeAccordion, setActiveAccordion] = useState('personal')
  const [editMode, setEditMode] = useState(false)
  const [customFields, setCustomFields] = useState([])
  const [sectionOrder, setSectionOrder] = useState([...defaultSectionOrder])
  const [hiddenSections, setHiddenSections] = useState([])
  const [hiddenRows, setHiddenRows] = useState({})
  const [customRows, setCustomRows] = useState({})
  const [lightbox, setLightbox] = useState({ images: [], index: null })
  const [recordsVersion, setRecordsVersion] = useState(0)
  const recordsRef = useRef([{ date: new Date().toISOString().slice(0, 10) }])
  const formRef = useRef(null)

  const f = fRef.current
  const r = useMemo(() => recordsRef.current[recordsRef.current.length - 1] || {}, [recordsVersion])
  const invImages = useMemo(() => recordsRef.current[recordsRef.current.length - 1]?.invImages || [], [recordsVersion])

  const set = useCallback((k, v) => { fRef.current = { ...fRef.current, [k]: v } }, [])

  const updateRecord = useCallback((field, value) => {
    const recs = recordsRef.current
    if (!recs.length) recs.push({ date: new Date().toISOString().slice(0, 10) })
    recs[recs.length - 1] = { ...recs[recs.length - 1], [field]: value }
    setRecordsVersion(v => v + 1)
  }, [])

  const toggleAccordion = useCallback((name) => setActiveAccordion(prev => prev === name ? '' : name), [])

  const handleFormInput = useCallback((e) => {
    const el = e.target
    const field = el.dataset.field
    if (!field) return
    const val = el.value
    if (field.startsWith('rec:')) {
      const recField = field.slice(4)
      const recs = recordsRef.current
      if (!recs.length) recs.push({ date: new Date().toISOString().slice(0, 10) })
      recs[recs.length - 1] = { ...recs[recs.length - 1], [recField]: val }
      setRecordsVersion(v => v + 1)
    } else {
      fRef.current = { ...fRef.current, [field]: field === 'age' ? (parseInt(val) || 0) : val }
    }
  }, [])

  useEffect(() => {
    const el = formRef.current
    if (!el) return
    el.addEventListener('input', handleFormInput)
    return () => el.removeEventListener('input', handleFormInput)
  }, [handleFormInput])

  const compressImage = (dataUrl, maxWidth = 600, quality = 0.4) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = dataUrl
    })
  }

  const moveSection = (name, dir) => {
    const idx = sectionOrder.indexOf(name)
    if (idx < 0) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sectionOrder.length) return
    const arr = [...sectionOrder]; [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]; setSectionOrder(arr)
  }

  const deleteSection = (name) => { if (!confirm('حذف هذا القسم؟')) return; setHiddenSections([...hiddenSections, name]) }
  const addCustomSection = () => {
    const name = prompt('اسم القسم الجديد:')
    if (!name?.trim()) return
    const key = 'custom_' + Date.now()
    setSectionOrder([...sectionOrder, key])
    setCustomFields([...customFields, { key, title: name.trim(), fields: [] }])
    setActiveAccordion(key)
  }
  const addFieldToSection = (sectionKey) => {
    const label = prompt('اسم الحقل الجديد:')
    if (!label?.trim()) return
    const fieldKey = 'cf_' + Date.now()
    setCustomFields(customFields.map(cf => cf.key === sectionKey ? { ...cf, fields: [...cf.fields, { key: fieldKey, label: label.trim() }] } : cf))
  }
  const removeFieldFromSection = (sectionKey, fieldKey) => {
    setCustomFields(customFields.map(cf => cf.key === sectionKey ? { ...cf, fields: cf.fields.filter(f => f.key !== fieldKey) } : cf))
  }
  const hideRow = (sectionKey, fieldKey) => { setHiddenRows({ ...hiddenRows, [sectionKey]: [...(hiddenRows[sectionKey] || []), fieldKey] }) }
  const addRow = (sectionKey, label, value = '') => {
    const key = 'row_' + Date.now()
    setCustomRows({ ...customRows, [sectionKey]: [...(customRows[sectionKey] || []), { key, label, value }] })
  }
  const deleteRow = (sectionKey, rowKey) => { setCustomRows({ ...customRows, [sectionKey]: (customRows[sectionKey] || []).filter(r => r.key !== rowKey) }) }
  const updateRowValue = (sectionKey, rowKey, value) => { setCustomRows({ ...customRows, [sectionKey]: (customRows[sectionKey] || []).map(r => r.key === rowKey ? { ...r, value } : r) }) }
  const updateRowLabel = (sectionKey, rowKey, label) => { setCustomRows({ ...customRows, [sectionKey]: (customRows[sectionKey] || []).map(r => r.key === rowKey ? { ...r, label } : r) }) }
  const isRowHidden = (sectionKey, fieldKey) => (hiddenRows[sectionKey] || []).includes(fieldKey)

  useEffect(() => {
    if (id) patientsApi.get(id).then(r => {
      const data = r.data
      if (!data.records?.length) data.records = [{ date: new Date().toISOString().slice(0, 10) }]
      fRef.current = data
      recordsRef.current = data.records
      forceRender(n => n + 1)
    }).catch(() => { })
  }, [id])

  const save = async () => {
    try {
      const data = { ...fRef.current, records: recordsRef.current, createdBy: user?.username || 'unknown' }
      if (!data.records?.length) data.records = [{ date: new Date().toISOString().slice(0, 10) }]
      const jsonSize = new TextEncoder().encode(JSON.stringify(data)).length
      if (jsonSize > 900000) {
        alert('⚠️ حجم البيانات كبير جداً (' + Math.round(jsonSize / 1024) + 'KB). يرجى حذف بعض الصور قبل الحفظ.')
        return
      }
      if (id) { await patientsApi.update(id, data); alert('تم التحديث'); navigate(-1) }
      else { await patientsApi.create(data); alert('تم الحفظ'); navigate('/search') }
    } catch (e) {
      console.error('Save error:', e)
      alert('خطأ في الحفظ: ' + (e.message || 'تأكد من اتصال الإنترنت وحاول مرة أخرى'))
    }
  }

  const togglePmh = (v) => {
    const current = fRef.current.pmh || []
    fRef.current = { ...fRef.current, pmh: current.includes(v) ? current.filter(x => x !== v) : [...current, v] }
    forceRender(n => n + 1)
  }
  const toggleFh = (v) => {
    const current = fRef.current.fh || []
    fRef.current = { ...fRef.current, fh: current.includes(v) ? current.filter(x => x !== v) : [...current, v] }
    forceRender(n => n + 1)
  }

  const rosData = (() => {
    try { return typeof fRef.current.ros === 'string' ? JSON.parse(fRef.current.ros || '{}') : (fRef.current.ros || {}) } catch { return {} }
  })()
  const getRos = (key) => Array.isArray(rosData[key]) ? rosData[key] : (rosData[key] ? [rosData[key]] : [])
  const toggleRosItem = (system, item) => {
    const current = getRos(system)
    const next = current.includes(item) ? current.filter(x => x !== item) : [...current, item]
    fRef.current = { ...fRef.current, ros: { ...rosData, [system]: next } }
    forceRender(n => n + 1)
  }

  const handleInvestigationImages = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const compressed = await compressImage(ev.target.result)
        const recs = recordsRef.current
        if (!recs.length) recs.push({ date: new Date().toISOString().slice(0, 10) })
        const last = recs.length - 1
        recs[last] = { ...recs[last], invImages: [...(recs[last].invImages || []), compressed] }
        setRecordsVersion(v => v + 1)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const handleImagingImages = async (e, key) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const compressed = await compressImage(ev.target.result)
        const recs = recordsRef.current
        if (!recs.length) recs.push({ date: new Date().toISOString().slice(0, 10) })
        const last = recs.length - 1
        recs[last] = {
          ...recs[last],
          imgImages: [...(recs[last].imgImages || []), compressed],
          imgImageKeys: [...(recs[last].imgImageKeys || []), key]
        }
        setRecordsVersion(v => v + 1)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const removeInvImage = (idx) => {
    const recs = recordsRef.current
    if (!recs.length) return
    const last = recs.length - 1
    const images = [...(recs[last].invImages || [])]
    images.splice(idx, 1)
    recs[last] = { ...recs[last], invImages: images }
    setRecordsVersion(v => v + 1)
  }

  const removeImgImageByKey = (key, gi) => {
    const recs = recordsRef.current
    if (!recs.length) return
    const last = recs.length - 1
    const allImages = [...(recs[last].imgImages || [])]
    const allKeys = [...(recs[last].imgImageKeys || [])]
    const indices = allKeys.map((k, i) => k === key ? i : -1).filter(i => i >= 0)
    const globalIdx = indices[gi]
    if (globalIdx === undefined) return
    allImages.splice(globalIdx, 1)
    allKeys.splice(globalIdx, 1)
    recs[last] = { ...recs[last], imgImages: allImages, imgImageKeys: allKeys }
    setRecordsVersion(v => v + 1)
  }

  const openImgLightboxByKey = (key, gi) => {
    const rec = recordsRef.current[recordsRef.current.length - 1]
    if (!rec) return
    const allImages = rec.imgImages || []
    const allKeys = rec.imgImageKeys || []
    const filtered = allImages.filter((_, i) => allKeys[i] === key)
    setLightbox({ images: filtered, index: gi })
  }

  const renderSection = (secName) => {
    const isActive = activeAccordion === secName
    const sectionProps = {
      title: sectionLabels[secName] || secName,
      name: secName,
      active: activeAccordion,
      toggle: toggleAccordion,
      editMode,
      onMoveUp: () => moveSection(secName, -1),
      onMoveDown: () => moveSection(secName, 1),
      onDelete: () => deleteSection(secName),
      onAddRow: editMode ? () => { const l = prompt('اسم الحقل:'); if (l?.trim()) addRow(secName, l.trim()) } : undefined
    }

    if (!isActive) {
      return (
        <div key={secName} className="accordion-section">
          <div className="accordion-header" onClick={() => toggleAccordion(secName)}>
            <span className="accordion-arrow">▼</span>
            <span className="accordion-title">{sectionLabels[secName] || secName}</span>
          </div>
        </div>
      )
    }

    if (secName === 'personal') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('personal', 'name') && <div className="form-group"><label>الاسم الكامل</label><input data-field="name" placeholder="الاسم الكامل *" defaultValue={f.name} /></div>}
        {!isRowHidden('personal', 'age') && <div className="form-group"><label>العمر والجنس</label><div className="form-row"><div className="form-group"><input data-field="age" type="number" placeholder="العمر" defaultValue={f.age || ''} /></div><div className="form-group"><select defaultValue={f.gender} onChange={e => { set('gender', e.target.value); forceRender(n => n + 1) }}><option value="">الجنس</option>{genders.map(g => <option key={g}>{g}</option>)}</select></div></div></div>}
        {!isRowHidden('personal', 'phone') && <div className="form-group"><label>رقم الهاتف</label><input data-field="phone" placeholder="رقم الهاتف" defaultValue={f.phone} /></div>}
        {!isRowHidden('personal', 'address') && <div className="form-group"><label>العنوان</label><input data-field="address" placeholder="العنوان" defaultValue={f.address} /></div>}
        {!isRowHidden('personal', 'blood') && <div className="form-group"><label>فصيلة الدم والمهنة</label><div className="form-row"><div className="form-group"><select defaultValue={f.bloodType} onChange={e => { set('bloodType', e.target.value); forceRender(n => n + 1) }}><option value="">فصيلة الدم</option>{bloodTypes.map(b => <option key={b}>{b}</option>)}</select></div><div className="form-group"><input data-field="occupation" placeholder="المهنة" defaultValue={f.occupation} /></div></div></div>}
        {!isRowHidden('personal', 'emergency') && <div className="form-group"><label>جهة اتصال طارئة</label><input data-field="emergency" placeholder="جهة اتصال طارئة" defaultValue={f.emergency} /></div>}
        {(customRows['personal'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input defaultValue={cr.value} onChange={e => updateRowValue('personal', cr.key, e.target.value)} /><button onClick={() => deleteRow('personal', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'chief') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('chief', 'hpi') && <div className="form-group"><label>الشكوى الرئيسية</label><input data-field="hpi" placeholder="الشكوى الرئيسية" defaultValue={f.hpi} /></div>}
        {(customRows['chief'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input defaultValue={cr.value} onChange={e => updateRowValue('chief', cr.key, e.target.value)} /><button onClick={() => deleteRow('chief', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'socrates') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('socrates', 'socratesText') && <div className="form-group"><label>SOCRATES Analysis</label><textarea data-field="rec:socratesText" placeholder={socratesPlaceholder} defaultValue={r.socratesText || ''} style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre' }} /></div>}
        {(customRows['socrates'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input defaultValue={cr.value} onChange={e => updateRowValue('socrates', cr.key, e.target.value)} /><button onClick={() => deleteRow('socrates', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'ros') return (
      <EditAccordion key={secName} {...sectionProps}>
        {Object.keys(rosSystemOptions).map(sys => (
          <div key={sys} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{rosLabels[sys]}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {rosSystemOptions[sys].map(item => {
                const selected = getRos(sys).includes(item)
                return <label key={item} className={`tag ${selected ? 'tag-selected' : 'tag-default'}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleRosItem(sys, item)} style={{ display: 'none' }} />
                  {item}
                </label>
              })}
            </div>
          </div>
        ))}
        <div className="form-group" style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>📝 ملاحظات إضافية (Additional Notes)</label>
          <textarea data-field="rec:rosNotes" placeholder="أي ملاحظات أو أعراض أخرى غير مدرجة في القائمة..." defaultValue={r.rosNotes || ''} style={{ minHeight: 60 }} />
        </div>
      </EditAccordion>
    )
    if (secName === 'pmh') return (
      <EditAccordion key={secName} {...sectionProps}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{pmhOptions.map(p => <label key={p} className={`tag ${(fRef.current.pmh || []).includes(p) ? 'tag-selected' : 'tag-default'}`}><input type="checkbox" checked={(fRef.current.pmh || []).includes(p)} onChange={() => togglePmh(p)} style={{ display: 'none' }} />{p}</label>)}</div>
        <div className="form-group" style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>📝 ملاحظات إضافية (Additional Notes)</label>
          <textarea data-field="rec:pmhNotes" placeholder="أمراض سابقة أخرى, جراحات, عمليات, أمراض وراثية..." defaultValue={r.pmhNotes || ''} style={{ minHeight: 60 }} />
        </div>
      </EditAccordion>
    )
    if (secName === 'drughistory') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('drughistory', 'chronicMeds') && <div className="form-group"><label>الأدوية الحالية</label><textarea data-field="chronicMeds" placeholder="مثال: ميتفورمين 500mg مرتين يومياً..." defaultValue={fRef.current.chronicMeds} style={{ minHeight: 60 }} /></div>}
        {!isRowHidden('drughistory', 'drugAllergies') && <div className="form-group"><label>الحساسية الدوائية</label><textarea data-field="drugAllergies" placeholder="مثال: بنسيلين (طفح جلدي)..." defaultValue={fRef.current.drugAllergies} style={{ minHeight: 60 }} /></div>}
        {(customRows['drughistory'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><textarea defaultValue={cr.value} onChange={e => updateRowValue('drughistory', cr.key, e.target.value)} style={{ minHeight: 50 }} /><button onClick={() => deleteRow('drughistory', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'fh') return (
      <EditAccordion key={secName} {...sectionProps}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{fhOptions.map(p => <label key={p} className={`tag ${(fRef.current.fh || []).includes(p) ? 'tag-selected' : 'tag-default'}`}><input type="checkbox" checked={(fRef.current.fh || []).includes(p)} onChange={() => toggleFh(p)} style={{ display: 'none' }} />{p}</label>)}</div>
      </EditAccordion>
    )
    if (secName === 'exam') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('exam', 'vitals') && <div className="form-group"><label>العلامات الحيوية</label><div className="form-row"><div className="form-group"><input data-field="rec:bp" placeholder="BP" defaultValue={r.bp || ''} /></div><div className="form-group"><input data-field="rec:hr" placeholder="HR" defaultValue={r.hr || ''} /></div></div><div className="form-row"><div className="form-group"><input data-field="rec:rr" placeholder="RR" defaultValue={r.rr || ''} /></div><div className="form-group"><input data-field="rec:temp" placeholder="Temp" defaultValue={r.temp || ''} /></div></div><div className="form-row"><div className="form-group"><input data-field="rec:spo2" placeholder="SpO2" defaultValue={r.spo2 || ''} /></div><div className="form-group"><input data-field="rec:weight" placeholder="Weight" defaultValue={r.weight || ''} /></div></div></div>}
        {!isRowHidden('exam', 'cv') && <div className="form-group"><label>الجهاز القلبي والتنفسي</label><div className="form-group"><input data-field="examCardio" placeholder="CVS" defaultValue={fRef.current.examCardio} /></div><div className="form-group"><input data-field="examChest" placeholder="Resp" defaultValue={fRef.current.examChest} /></div></div>}
        {!isRowHidden('exam', 'abd') && <div className="form-group"><label>البطن والجهاز العصبي</label><div className="form-group"><input data-field="examAbdomen" placeholder="Abdomen" defaultValue={fRef.current.examAbdomen} /></div><div className="form-group"><input data-field="examCNS" placeholder="CNS" defaultValue={fRef.current.examCNS} /></div><div className="form-group"><input data-field="examMSK" placeholder="MSK" defaultValue={fRef.current.examMSK} /></div></div>}
        {(customRows['exam'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input defaultValue={cr.value} onChange={e => updateRowValue('exam', cr.key, e.target.value)} /><button onClick={() => deleteRow('exam', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'investigation') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('investigation', 'results') && <div className="form-group"><label>نتائج الفحوصات المخبرية</label><textarea data-field="rec:investigations" placeholder="مثال: CBC: Hb 12, WBC 8000..." defaultValue={r.investigations || ''} style={{ minHeight: 80 }} /></div>}
        {!isRowHidden('investigation', 'upload') && <div className="form-group"><div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 8 }}>📷 رفع أو تصوير نتائج الفحوصات</label><div style={{ display: 'flex', gap: 8, marginBottom: 8 }}><label style={{ flex: 1, padding: '8px 12px', background: 'var(--royal)', color: 'white', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 12, fontWeight: 600 }}>📁 رفع صورة<input type="file" accept="image/*" multiple onChange={e => handleInvestigationImages(e)} style={{ display: 'none' }} /></label><label style={{ flex: 1, padding: '8px 12px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 12, fontWeight: 600 }}>📸 تصوير<input type="file" accept="image/*" capture="environment" onChange={e => handleInvestigationImages(e)} style={{ display: 'none' }} /></label></div><ImageGrid images={invImages} onRemove={removeInvImage} onOpen={(i) => setLightbox({ images: invImages, index: i })} /></div></div>}
        {(customRows['investigation'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><textarea defaultValue={cr.value} onChange={e => updateRowValue('investigation', cr.key, e.target.value)} style={{ minHeight: 50 }} /><button onClick={() => deleteRow('investigation', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'imaging') return (
      <EditAccordion key={secName} {...sectionProps}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 6 }}>📝 ملاحظات التصوير</label>
          <textarea data-field="rec:imagingFindings" placeholder="وصف نتائج التصوير..." defaultValue={r.imagingFindings || ''} style={{ minHeight: 60 }} />
        </div>
        {imagingTypes.map(item => (
          <div key={item.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', flex: 1 }}>{item.label}</span>
              <label style={{ padding: '4px 10px', background: 'var(--royal)', color: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>📁 رفع<input type="file" accept="image/*" multiple onChange={e => handleImagingImages(e, item.key)} style={{ display: 'none' }} /></label>
              <label style={{ padding: '4px 10px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>📸 تصوير<input type="file" accept="image/*" capture="environment" onChange={e => handleImagingImages(e, item.key)} style={{ display: 'none' }} /></label>
            </div>
            <ImageGrid images={(recordsRef.current[recordsRef.current.length - 1]?.imgImages || []).filter((_, i) => (recordsRef.current[recordsRef.current.length - 1]?.imgImageKeys || [])[i] === item.key)} onRemove={(gi) => removeImgImageByKey(item.key, gi)} onOpen={(gi) => openImgLightboxByKey(item.key, gi)} />
          </div>
        ))}
      </EditAccordion>
    )
    if (secName === 'treatment') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('treatment', 'dx') && <div className="form-group"><label>التشخيص الأساسي</label><input data-field="rec:primaryDx" placeholder="التشخيص" defaultValue={r.primaryDx || ''} /></div>}
        {!isRowHidden('treatment', 'rx') && <div className="form-group"><label>خطة العلاج</label><textarea data-field="rec:medications" placeholder="مثال: Amoxicillin 500mg TDS x 7 days..." defaultValue={r.medications || ''} style={{ minHeight: 60 }} /></div>}
        {!isRowHidden('treatment', 'followup') && <div className="form-group"><label>ملاحظات المتابعة</label><input data-field="rec:management" placeholder="مثال: مراجعة بعد أسبوع" defaultValue={r.management || ''} /></div>}
        {(customRows['treatment'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input defaultValue={cr.value} onChange={e => updateRowValue('treatment', cr.key, e.target.value)} /><button onClick={() => deleteRow('treatment', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    const cf = customFields.find(c => c.key === secName)
    if (cf) return (
      <EditAccordion key={secName} {...sectionProps} title={'📝 ' + cf.title}>
        {cf.fields.map(field => (
          <div key={field.key} className="form-group" style={{ position: 'relative' }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{field.label}</label>
            <input data-field={field.key} placeholder={field.label} defaultValue={fRef.current[field.key] || ''} />
            {editMode && <button onClick={() => removeFieldFromSection(secName, field.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button>}
          </div>
        ))}
        {editMode && <button onClick={() => addFieldToSection(secName)} style={{ width: '100%', padding: 8, border: '2px dashed var(--border)', borderRadius: 8, background: 'none', color: 'var(--royal)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ إضافة حقل</button>}
      </EditAccordion>
    )
    return null
  }

  return (
    <div>
      <Lightbox images={lightbox.images} index={lightbox.index} onClose={(idx) => idx !== undefined ? setLightbox({ ...lightbox, index: idx }) : setLightbox({ images: [], index: null })} />
      <div className="header">
        <div className="header-flex">
          <button className="back-btn" onClick={() => navigate(-1)}>‹</button>
          <h1 style={{ flex: 1 }}>{id ? '✏️ تعديل بيانات' : '➕ إضافة مريض جديد'}</h1>
          <button onClick={() => setEditMode(!editMode)} className={`btn btn-sm ${editMode ? 'btn-accent' : 'btn-primary'}`}>
            {editMode ? '✓ تم' : '✏️ تعديل الأقسام'}
          </button>
        </div>
      </div>
      <div className="page-inner" ref={formRef}>
        {sectionOrder.filter(s => !hiddenSections.includes(s)).map(secName => renderSection(secName))}
        {editMode && <button onClick={addCustomSection} style={{ width: '100%', padding: 12, border: '2px dashed var(--gold)', borderRadius: 10, background: 'var(--surface)', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>+ إضافة قسم جديد</button>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary btn-full" onClick={save}>💾 حفظ</button>
          <button className="btn btn-red btn-full" onClick={() => navigate(-1)}>❌ إلغاء</button>
        </div>
      </div>
    </div>
  )
}
