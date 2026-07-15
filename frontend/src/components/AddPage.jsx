import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { patients as patientsApi } from '../api'
import { emptyPatient, pmhOptions, fhOptions, rosSystemOptions, rosLabels, bloodTypes, genders, sectionLabels, defaultSectionOrder, socratesPlaceholder, imagingTypes } from '../constants'
import { EditAccordion, EditableRow, Lightbox, ImageGrid } from './shared'

export default function AddPage({ user }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [f, setF] = useState({ ...emptyPatient })
  const [activeAccordion, setActiveAccordion] = useState('personal')
  const [editMode, setEditMode] = useState(false)
  const [customFields, setCustomFields] = useState([])
  const [sectionOrder, setSectionOrder] = useState([...defaultSectionOrder])
  const [hiddenSections, setHiddenSections] = useState([])
  const [hiddenRows, setHiddenRows] = useState({})
  const [customRows, setCustomRows] = useState({})
  const [lightbox, setLightbox] = useState({ images: [], index: null })
  const set = (k, v) => setF({ ...f, [k]: v })
  const toggleAccordion = (name) => setActiveAccordion(activeAccordion === name ? '' : name)

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
      setF(data)
    }).catch(() => { })
  }, [id])

  const save = async () => {
    try {
      const data = { ...f, createdBy: user?.username || 'unknown' }
      if (!data.records?.length) data.records = [{ date: new Date().toISOString().slice(0, 10) }]
      if (id) { await patientsApi.update(id, data); alert('تم التحديث'); navigate(-1) }
      else { await patientsApi.create(data); alert('تم الحفظ'); navigate('/search') }
    } catch (e) { alert('خطأ: ' + (e.response?.data?.detail || e.message)) }
  }

  const togglePmh = (v) => set('pmh', f.pmh.includes(v) ? f.pmh.filter(x => x !== v) : [...f.pmh, v])
  const toggleFh = (v) => set('fh', f.fh.includes(v) ? f.fh.filter(x => x !== v) : [...f.fh, v])

  const rosData = (() => {
    try { return typeof f.ros === 'string' ? JSON.parse(f.ros || '{}') : (f.ros || {}) } catch { return {} }
  })()
  const getRos = (key) => Array.isArray(rosData[key]) ? rosData[key] : (rosData[key] ? [rosData[key]] : [])
  const toggleRosItem = (system, item) => {
    const current = getRos(system)
    const next = current.includes(item) ? current.filter(x => x !== item) : [...current, item]
    const d = { ...rosData, [system]: next }
    set('ros', d)
  }

  const handleInvestigationImages = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const records = [...(f.records || [])]
        if (!records.length) records.push({ date: new Date().toISOString().slice(0, 10) })
        const last = records.length - 1
        const images = [...(records[last].invImages || []), ev.target.result]
        records[last] = { ...records[last], invImages: images }
        setF({ ...f, records })
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleImagingImages = (e, key) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const records = [...(f.records || [])]
        if (!records.length) records.push({ date: new Date().toISOString().slice(0, 10) })
        const last = records.length - 1
        const images = [...(records[last].imgImages || []), ev.target.result]
        const keys = [...(records[last].imgImageKeys || []), key]
        records[last] = { ...records[last], imgImages: images, imgImageKeys: keys }
        setF({ ...f, records })
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeInvImage = (idx) => {
    const records = [...(f.records || [])]
    if (!records.length) return
    const last = records.length - 1
    const images = [...(records[last].invImages || [])]
    images.splice(idx, 1)
    records[last] = { ...records[last], invImages: images }
    setF({ ...f, records })
  }

  const removeImgImageByKey = (key, gi) => {
    const records = [...(f.records || [])]
    if (!records.length) return
    const last = records.length - 1
    const allImages = [...(records[last].imgImages || [])]
    const allKeys = [...(records[last].imgImageKeys || [])]
    const indices = allKeys.map((k, i) => k === key ? i : -1).filter(i => i >= 0)
    const globalIdx = indices[gi]
    if (globalIdx === undefined) return
    allImages.splice(globalIdx, 1)
    allKeys.splice(globalIdx, 1)
    records[last] = { ...records[last], imgImages: allImages, imgImageKeys: allKeys }
    setF({ ...f, records })
  }

  const openImgLightboxByKey = (key, gi) => {
    const rec = f.records?.[f.records.length - 1]
    if (!rec) return
    const allImages = rec.imgImages || []
    const allKeys = rec.imgImageKeys || []
    const filtered = allImages.filter((_, i) => allKeys[i] === key)
    setLightbox({ images: filtered, index: gi })
  }

  const invImages = f.records?.[f.records.length - 1]?.invImages || []

  const updateRecord = (field, value) => {
    const records = [...(f.records || [])]
    if (!records.length) records.push({ date: new Date().toISOString().slice(0, 10) })
    records[records.length - 1] = { ...records[records.length - 1], [field]: value }
    setF({ ...f, records })
  }
  const r = f.records?.[f.records.length - 1] || {}

  const Row = ({ fieldKey, label, children }) => editMode ? (
    <EditableRow editMode={editMode} sectionKey="" fieldKey={fieldKey} label={label} onLabelEdit={() => { }}>
      {children}
    </EditableRow>
  ) : <div className="form-group">{children}</div>

  const renderSection = (secName) => {
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

    if (secName === 'personal') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('personal', 'name') && <Row fieldKey="name" label="الاسم الكامل"><input placeholder="الاسم الكامل *" value={f.name} onChange={e => set('name', e.target.value)} /></Row>}
        {!isRowHidden('personal', 'age') && <Row fieldKey="age" label="العمر والجنس"><div className="form-row"><div className="form-group"><input type="number" placeholder="العمر" value={f.age || ''} onChange={e => set('age', parseInt(e.target.value) || 0)} /></div><div className="form-group"><select value={f.gender} onChange={e => set('gender', e.target.value)}><option value="">الجنس</option>{genders.map(g => <option key={g}>{g}</option>)}</select></div></div></Row>}
        {!isRowHidden('personal', 'phone') && <Row fieldKey="phone" label="رقم الهاتف"><input placeholder="رقم الهاتف" value={f.phone} onChange={e => set('phone', e.target.value)} /></Row>}
        {!isRowHidden('personal', 'address') && <Row fieldKey="address" label="العنوان"><input placeholder="العنوان" value={f.address} onChange={e => set('address', e.target.value)} /></Row>}
        {!isRowHidden('personal', 'blood') && <Row fieldKey="blood" label="فصيلة الدم والمهنة"><div className="form-row"><div className="form-group"><select value={f.bloodType} onChange={e => set('bloodType', e.target.value)}><option value="">فصيلة الدم</option>{bloodTypes.map(b => <option key={b}>{b}</option>)}</select></div><div className="form-group"><input placeholder="المهنة" value={f.occupation} onChange={e => set('occupation', e.target.value)} /></div></div></Row>}
        {!isRowHidden('personal', 'emergency') && <Row fieldKey="emergency" label="جهة اتصال طارئة"><input placeholder="جهة اتصال طارئة" value={f.emergency} onChange={e => set('emergency', e.target.value)} /></Row>}
        {(customRows['personal'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input value={cr.value} onChange={e => updateRowValue('personal', cr.key, e.target.value)} /><button onClick={() => deleteRow('personal', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'chief') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('chief', 'hpi') && <Row fieldKey="hpi" label="الشكوى الرئيسية"><input placeholder="الشكوى الرئيسية" value={f.hpi} onChange={e => set('hpi', e.target.value)} /></Row>}
        {(customRows['chief'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input value={cr.value} onChange={e => updateRowValue('chief', cr.key, e.target.value)} /><button onClick={() => deleteRow('chief', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'socrates') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('socrates', 'socratesText') && <Row fieldKey="socratesText" label="SOCRATES Analysis">
          <textarea placeholder={socratesPlaceholder} value={r.socratesText || ''} onChange={e => updateRecord('socratesText', e.target.value)} style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre' }} />
        </Row>}
        {(customRows['socrates'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input value={cr.value} onChange={e => updateRowValue('socrates', cr.key, e.target.value)} /><button onClick={() => deleteRow('socrates', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
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
          <textarea placeholder="أي ملاحظات أو أعراض أخرى غير مدرجة في القائمة..." value={r.rosNotes || ''} onChange={e => updateRecord('rosNotes', e.target.value)} style={{ minHeight: 60 }} />
        </div>
      </EditAccordion>
    )
    if (secName === 'pmh') return (
      <EditAccordion key={secName} {...sectionProps}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{pmhOptions.map(p => <label key={p} className={`tag ${f.pmh.includes(p) ? 'tag-selected' : 'tag-default'}`}><input type="checkbox" checked={f.pmh.includes(p)} onChange={() => togglePmh(p)} style={{ display: 'none' }} />{p}</label>)}</div>
        <div className="form-group" style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>📝 ملاحظات إضافية (Additional Notes)</label>
          <textarea placeholder="أمراض سابقة أخرى, جراحات, عمليات, أمراض وراثية..." value={r.pmhNotes || ''} onChange={e => updateRecord('pmhNotes', e.target.value)} style={{ minHeight: 60 }} />
        </div>
      </EditAccordion>
    )
    if (secName === 'drughistory') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('drughistory', 'chronicMeds') && <Row fieldKey="chronicMeds" label="الأدوية الحالية"><textarea placeholder="مثال: ميتفورمين 500mg مرتين يومياً..." value={f.chronicMeds} onChange={e => set('chronicMeds', e.target.value)} style={{ minHeight: 60 }} /></Row>}
        {!isRowHidden('drughistory', 'drugAllergies') && <Row fieldKey="drugAllergies" label="الحساسية الدوائية"><textarea placeholder="مثال: بنسيلين (طفح جلدي)..." value={f.drugAllergies} onChange={e => set('drugAllergies', e.target.value)} style={{ minHeight: 60 }} /></Row>}
        {(customRows['drughistory'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><textarea value={cr.value} onChange={e => updateRowValue('drughistory', cr.key, e.target.value)} style={{ minHeight: 50 }} /><button onClick={() => deleteRow('drughistory', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'fh') return (
      <EditAccordion key={secName} {...sectionProps}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{fhOptions.map(p => <label key={p} className={`tag ${f.fh.includes(p) ? 'tag-selected' : 'tag-default'}`}><input type="checkbox" checked={f.fh.includes(p)} onChange={() => toggleFh(p)} style={{ display: 'none' }} />{p}</label>)}</div>
      </EditAccordion>
    )
    if (secName === 'exam') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('exam', 'vitals') && <Row fieldKey="vitals" label="العلامات الحيوية"><div className="form-row"><div className="form-group"><input placeholder="BP" value={r.bp || ''} onChange={e => updateRecord('bp', e.target.value)} /></div><div className="form-group"><input placeholder="HR" value={r.hr || ''} onChange={e => updateRecord('hr', e.target.value)} /></div></div><div className="form-row"><div className="form-group"><input placeholder="RR" value={r.rr || ''} onChange={e => updateRecord('rr', e.target.value)} /></div><div className="form-group"><input placeholder="Temp" value={r.temp || ''} onChange={e => updateRecord('temp', e.target.value)} /></div></div><div className="form-row"><div className="form-group"><input placeholder="SpO2" value={r.spo2 || ''} onChange={e => updateRecord('spo2', e.target.value)} /></div><div className="form-group"><input placeholder="Weight" value={r.weight || ''} onChange={e => updateRecord('weight', e.target.value)} /></div></div></Row>}
        {!isRowHidden('exam', 'cv') && <Row fieldKey="cv" label="الجهاز القلبي والتنفسي"><div className="form-group"><input placeholder="CVS" value={f.examCardio} onChange={e => set('examCardio', e.target.value)} /></div><div className="form-group"><input placeholder="Resp" value={f.examChest} onChange={e => set('examChest', e.target.value)} /></div></Row>}
        {!isRowHidden('exam', 'abd') && <Row fieldKey="abd" label="البطن والجهاز العصبي"><div className="form-group"><input placeholder="Abdomen" value={f.examAbdomen} onChange={e => set('examAbdomen', e.target.value)} /></div><div className="form-group"><input placeholder="CNS" value={f.examCNS} onChange={e => set('examCNS', e.target.value)} /></div><div className="form-group"><input placeholder="MSK" value={f.examMSK} onChange={e => set('examMSK', e.target.value)} /></div></Row>}
        {(customRows['exam'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input value={cr.value} onChange={e => updateRowValue('exam', cr.key, e.target.value)} /><button onClick={() => deleteRow('exam', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'investigation') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('investigation', 'results') && <Row fieldKey="results" label="نتائج الفحوصات المخبرية"><textarea placeholder="مثال: CBC: Hb 12, WBC 8000..." value={r.investigations || ''} onChange={e => updateRecord('investigations', e.target.value)} style={{ minHeight: 80 }} /></Row>}
        {!isRowHidden('investigation', 'upload') && <div className="form-group"><div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 8 }}>📷 رفع أو تصوير نتائج الفحوصات</label><div style={{ display: 'flex', gap: 8, marginBottom: 8 }}><label style={{ flex: 1, padding: '8px 12px', background: 'var(--royal)', color: 'white', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 12, fontWeight: 600 }}>📁 رفع صورة<input type="file" accept="image/*" multiple onChange={e => handleInvestigationImages(e)} style={{ display: 'none' }} /></label><label style={{ flex: 1, padding: '8px 12px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 12, fontWeight: 600 }}>📸 تصوير<input type="file" accept="image/*" capture="environment" onChange={e => handleInvestigationImages(e)} style={{ display: 'none' }} /></label></div><ImageGrid images={invImages} onRemove={removeInvImage} onOpen={(i) => setLightbox({ images: invImages, index: i })} /></div></div>}
        {(customRows['investigation'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><textarea value={cr.value} onChange={e => updateRowValue('investigation', cr.key, e.target.value)} style={{ minHeight: 50 }} /><button onClick={() => deleteRow('investigation', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    if (secName === 'imaging') return (
      <EditAccordion key={secName} {...sectionProps}>
        {imagingTypes.map(item => (
          <div key={item.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', flex: 1 }}>{item.label}</span>
              <label style={{ padding: '4px 10px', background: 'var(--royal)', color: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>📁 رفع<input type="file" accept="image/*" multiple onChange={e => handleImagingImages(e, item.key)} style={{ display: 'none' }} /></label>
              <label style={{ padding: '4px 10px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>📸 تصوير<input type="file" accept="image/*" capture="environment" onChange={e => handleImagingImages(e, item.key)} style={{ display: 'none' }} /></label>
            </div>
            <ImageGrid images={(f.records?.[f.records.length - 1]?.imgImages || []).filter((_, i) => (f.records?.[f.records.length - 1]?.imgImageKeys || [])[i] === item.key)} onRemove={(gi) => removeImgImageByKey(item.key, gi)} onOpen={(gi) => openImgLightboxByKey(item.key, gi)} />
          </div>
        ))}
      </EditAccordion>
    )
    if (secName === 'treatment') return (
      <EditAccordion key={secName} {...sectionProps}>
        {!isRowHidden('treatment', 'dx') && <Row fieldKey="dx" label="التشخيص الأساسي"><input placeholder="التشخيص" value={r.primaryDx || ''} onChange={e => updateRecord('primaryDx', e.target.value)} /></Row>}
        {!isRowHidden('treatment', 'rx') && <Row fieldKey="rx" label="خطة العلاج"><textarea placeholder="مثال: Amoxicillin 500mg TDS x 7 days..." value={r.medications || ''} onChange={e => updateRecord('medications', e.target.value)} style={{ minHeight: 60 }} /></Row>}
        {!isRowHidden('treatment', 'followup') && <Row fieldKey="followup" label="ملاحظات المتابعة"><input placeholder="مثال: مراجعة بعد أسبوع" value={r.management || ''} onChange={e => updateRecord('management', e.target.value)} /></Row>}
        {(customRows['treatment'] || []).map(cr => <div key={cr.key} className="form-group" style={{ position: 'relative' }}><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{cr.label}</label><input value={cr.value} onChange={e => updateRowValue('treatment', cr.key, e.target.value)} /><button onClick={() => deleteRow('treatment', cr.key)} style={{ position: 'absolute', top: 0, left: 0, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9 }}>✕</button></div>)}
      </EditAccordion>
    )
    const cf = customFields.find(c => c.key === secName)
    if (cf) return (
      <EditAccordion key={secName} {...sectionProps} title={'📝 ' + cf.title}>
        {cf.fields.map(field => (
          <div key={field.key} className="form-group" style={{ position: 'relative' }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>{field.label}</label>
            <input placeholder={field.label} value={f[field.key] || ''} onChange={e => set(field.key, e.target.value)} />
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
      <div className="page-inner">
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
