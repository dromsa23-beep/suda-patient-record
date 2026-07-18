import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { patients as patientsApi } from '../api'
import { rosLabels, imgLabels, detailTabs } from '../constants'
import { Lightbox, FieldBlock, RecordCard, ImageGrid, EmptyState } from './shared'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

async function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function downloadPatientPdf(p, patientId) {
  try {
    const pdfRef = document.getElementById('pdf-export-area')
    if (!pdfRef) return
    pdfRef.style.position = 'absolute'
    pdfRef.style.left = '0'
    pdfRef.style.top = '0'
    pdfRef.style.zIndex = '-1'
    pdfRef.style.display = 'block'
    await new Promise(r => setTimeout(r, 200))

    const canvas = await html2canvas(pdfRef, {
      scale: 2, useCORS: true, allowTaint: true,
      backgroundColor: '#ffffff', logging: false,
      width: pdfRef.scrollWidth, height: pdfRef.scrollHeight,
    })

    pdfRef.style.left = '-9999px'

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 5
    const contentW = pageW - margin * 2
    const imgH = (canvas.height * contentW) / canvas.width
    const sliceH = pageH - margin * 2

    let srcY = 0
    let first = true
    while (srcY < canvas.height) {
      if (!first) pdf.addPage()
      first = false
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvas.width
      tempCanvas.height = Math.min(sliceH * (canvas.width / contentW), canvas.height - srcY)
      const ctx = tempCanvas.getContext('2d')
      ctx.drawImage(canvas, 0, srcY, canvas.width, tempCanvas.height, 0, 0, canvas.width, tempCanvas.height)
      const sliceImgH = (tempCanvas.height * contentW) / canvas.width
      pdf.addImage(tempCanvas.toDataURL('image/jpeg', 0.85), 'JPEG', margin, margin, contentW, sliceImgH)
      srcY += tempCanvas.height
    }

    pdf.save(`patient_${p.name || patientId}.pdf`)
  } catch (e) {
    console.error('PDF export error:', e)
    alert('حدث خطأ أثناء إنشاء ملف PDF')
  }
}

export default function DetailsPage({ user }) {
  const [patient, setPatient] = useState(null)
  const [tab, setTab] = useState('history')
  const [lightbox, setLightbox] = useState({ images: [], index: null })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { id } = useParams()
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    withTimeout(patientsApi.get(id), 15000).then(r => {
      if (!cancelled) { setPatient(r.data); setLoading(false) }
    }).catch(e => {
      console.error('Patient load error:', e)
      if (!cancelled) { setError(e.message === 'timeout' ? 'timeout' : 'error'); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [id])
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}>
    <div className="pulse-loading" style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
    <p style={{ color: 'var(--text-3)' }}>جاري تحميل بيانات المريض...</p>
  </div>
  if (error) return <div style={{ textAlign: 'center', padding: 40 }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
    <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>
      {error === 'timeout' ? 'انتهت مهلة التحميل' : 'لا يمكن تحميل بيانات المريض'}
    </p>
    <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 12 }}>تحقق من اتصال الإنترنت وأعد المحاولة</p>
    <button className="btn btn-primary" onClick={() => { setLoading(true); setError(null); patientsApi.get(id).then(r => { setPatient(r.data); setLoading(false) }).catch(() => { setError('error'); setLoading(false) }) }}>🔄 إعادة المحاولة</button>
    <button className="btn btn-outline" style={{ marginRight: 8 }} onClick={() => navigate('/search')}>العودة للبحث</button>
  </div>
  const r = patient.records?.[patient.records.length - 1]
  const allInvImages = (patient.records || []).flatMap(rec => rec.invImages || [])
  const allImgImages = (patient.records || []).flatMap(rec => rec.imgImages || [])
  const allImgImageKeys = (patient.records || []).flatMap(rec => rec.imgImageKeys || [])
  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

  return (
    <div>
      <Lightbox images={lightbox.images} index={lightbox.index} onClose={(idx) => idx !== undefined ? setLightbox({ ...lightbox, index: idx }) : setLightbox({ images: [], index: null })} />
      <div className="header" style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="patient-avatar" style={{ width: 44, height: 44, fontSize: 18 }}>{getInitials(patient.name)}</div>
            <div><h1>{patient.name}</h1><p>{patient.age} سنة | {patient.gender}</p></div>
          </div>
          <button className="back-btn" onClick={() => navigate('/search')} style={{ position: 'static', transform: 'none' }}>‹</button>
        </div>
      </div>
      <div className="page-inner">
        <div className="section" style={{ padding: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
            <span>📞 {patient.phone}</span>
            <span>📍 {patient.address}</span>
            <span>🩸 {patient.bloodType}</span>
            <span>💼 {patient.occupation}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/add/${patient.id}`)}>✏️ تعديل</button>
            <button className="btn btn-sm" style={{ flex: 1, background: 'var(--success)', color: 'white' }} onClick={() => downloadPatientPdf(patient, patient.id)}>📄 تحميل PDF</button>
          </div>
        </div>
        <div className="pill-tabs">
          {detailTabs.map(t => (
            <button key={t.k} className={`pill-tab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>
          ))}
        </div>

        {tab === 'history' && <div>
          {patient.hpi && <FieldBlock label="📝 قصة المرض" value={patient.hpi} />}
          {patient.pmh?.length > 0 && <FieldBlock label="📋 PMH" value={patient.pmh.join(' · ')} />}
          {patient.ros && Object.keys(patient.ros || {}).filter(k => patient.ros[k]?.length).length > 0 && (
            <div className="field-block">
              <div className="field-label">🔬 مراجعة الأجهزة</div>
              <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 8 }}>
                {Object.keys(rosLabels).filter(k => patient.ros[k]?.length).map(k => (
                  <div key={k} style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{rosLabels[k]}: </span>
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{(Array.isArray(patient.ros[k]) ? patient.ros[k] : [patient.ros[k]]).join(' · ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {patient.surgicalHistory && <FieldBlock label="🏥 التاريخ الجراحي" value={patient.surgicalHistory} />}
          {patient.socialHistory && <FieldBlock label="👥 التاريخ الاجتماعي" value={patient.socialHistory} />}
          {patient.chronicMeds && <FieldBlock label="💊 الأدوية المزمنة" value={patient.chronicMeds} />}
          {patient.drugAllergies && <FieldBlock label="⚠️ الحساسية" value={patient.drugAllergies} />}
          {patient.records?.map((rec, i) => <RecordCard key={i} record={rec} idx={i} />)}
          {!patient.hpi && !patient.pmh?.length && !patient.records?.length && <EmptyState icon="📋" text="لا توجد بيانات" />}
        </div>}

        {tab === 'exam' && <div>
          {r && <>
            {r.bp && <FieldBlock label="📊 العلامات الحيوية" value={`BP:${r.bp} HR:${r.hr || ''} RR:${r.rr || ''} T:${r.temp || ''} SpO2:${r.spo2 || ''}% وزن:${r.weight || ''}kg`} />}
            {r.cvs && <FieldBlock label="❤️ CVS" value={r.cvs} />}
            {r.resp && <FieldBlock label="🫁 Resp" value={r.resp} />}
            {r.abd && <FieldBlock label="🩻 Abd" value={r.abd} />}
          </>}
          {patient.examCardio && <FieldBlock label="❤️ القلب" value={patient.examCardio} />}
          {patient.examChest && <FieldBlock label="🫁 الصدر" value={patient.examChest} />}
          {patient.examAbdomen && <FieldBlock label="🩻 البطن" value={patient.examAbdomen} />}
          {patient.examCNS && <FieldBlock label="🧠 CNS" value={patient.examCNS} />}
          {patient.examMSK && <FieldBlock label="🦴 MSK" value={patient.examMSK} />}
          {!r && !patient.examCardio && !patient.examChest && <EmptyState icon="🩻" text="لا توجد بيانات كشف" />}
        </div>}

        {tab === 'investigations' && <div>
          {r?.investigations && <div className="record-card" style={{ marginBottom: 8 }}><div style={{ fontWeight: 600, marginBottom: 4 }}>🔬 نتائج الفحوصات</div><div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.investigations}</div></div>}
          {allInvImages.length > 0 && <div style={{ marginTop: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>📷 صور الفحوصات ({allInvImages.length})</div><ImageGrid images={allInvImages} onOpen={(i) => setLightbox({ images: allInvImages, index: i })} /></div>}
          {patient.exams?.map((e, i) => <div key={i} className="record-card"><div style={{ fontWeight: 600 }}>{e.name}</div><div style={{ fontSize: 13 }}>النتيجة: {e.result || '---'}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>الطبيعي: {e.normalRange || '---'}</div></div>)}
          {patient.investigations?.map((inv, i) => <div key={i} className="record-card" style={{ borderRight: `3px solid ${inv.result ? 'var(--royal)' : 'var(--danger)'}` }}><span style={{ fontWeight: 600 }}>{inv.name}</span> {inv.result ? <span style={{ fontSize: 12, color: 'var(--royal)' }}>{inv.result}</span> : <span style={{ fontSize: 11, color: 'var(--danger)' }}>بدون نتيجة</span>}</div>)}
          {!patient.exams?.length && !patient.investigations?.length && !r?.investigations && !allInvImages.length && <EmptyState icon="🔬" text="لا توجد فحوصات" />}
        </div>}

        {tab === 'imaging' && <div>
          {allImgImages.length > 0 ? Object.keys(imgLabels).map(key => {
            const filtered = allImgImages.filter((_, i) => allImgImageKeys[i] === key)
            if (!filtered.length) return null
            return <div key={key} style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>{imgLabels[key]}</div><ImageGrid images={filtered} onOpen={(i) => setLightbox({ images: filtered, index: i })} /></div>
          }).filter(Boolean) : <EmptyState icon="📷" text="لا توجد أشعة" />}
        </div>}

        {tab === 'treatments' && <div>
          {patient.diseases?.map((d, i) => (
            <div key={i} className="record-card" style={{ borderRight: `3px solid ${d.status === 'نشط' ? 'var(--danger)' : 'var(--success)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{d.name}</span>
                <span className={`tag ${d.status === 'نشط' ? 'tag-active' : 'tag-inactive'}`}>{d.status}</span>
              </div>
            </div>
          ))}
          {patient.records?.filter(r => r.primaryDx || r.management || r.medications).map((rec, i) => (
            <div key={i} className="record-card">
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>📅 {rec.date}</div>
              {rec.primaryDx && <div style={{ background: 'var(--navy)', color: 'white', padding: '4px 8px', borderRadius: 4, marginBottom: 4, fontSize: 13 }}>✅ {rec.primaryDx}</div>}
              {rec.management && <FieldBlock label="📋 خطة العلاج" value={rec.management} />}
              {rec.medications && <FieldBlock label="💊 الأدوية" value={rec.medications} />}
            </div>
          ))}
          {!patient.diseases?.length && <EmptyState icon="💊" text="لا توجد بيانات علاجية" />}
        </div>}
      </div>

      {/* Hidden PDF export area */}
      <div id="pdf-export-area" style={{ position: 'absolute', left: '-9999px', top: 0, width: 800, background: 'white', padding: 30, fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
        <div style={{ background: '#29417a', color: 'white', padding: '16px 24px', borderRadius: 10, marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>سجل المريض: {patient.name}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9 }}>تاريخ التصدير: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        <div style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 10px', color: '#29417a', borderBottom: '2px solid #29417a', paddingBottom: 6 }}>البيانات الشخصية</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
            <div><strong>الاسم:</strong> {patient.name}</div>
            <div><strong>العمر:</strong> {patient.age} سنة</div>
            <div><strong>الجنس:</strong> {patient.gender}</div>
            <div><strong>الهاتف:</strong> {patient.phone}</div>
            <div><strong>العنوان:</strong> {patient.address || '—'}</div>
            <div><strong>فصيلة الدم:</strong> {patient.bloodType || '—'}</div>
            <div><strong>المهنة:</strong> {patient.occupation || '—'}</div>
            <div><strong>رقم الطوارئ:</strong> {patient.emergency || '—'}</div>
          </div>
        </div>

        {patient.hpi && <div style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', color: '#29417a', borderBottom: '2px solid #29417a', paddingBottom: 6 }}>الشكوى الرئيسية</h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{patient.hpi}</p>
        </div>}

        {patient.pmh?.length > 0 && <div style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', color: '#29417a', borderBottom: '2px solid #29417a', paddingBottom: 6 }}>التاريخ المرضي السابق</h3>
          <div style={{ fontSize: 14 }}>{patient.pmh.map((m, i) => <span key={i} style={{ display: 'inline-block', background: 'white', padding: '3px 10px', borderRadius: 6, margin: 3, border: '1px solid #ddd' }}>{m}</span>)}</div>
        </div>}

        {patient.ros && Object.keys(patient.ros || {}).filter(k => patient.ros[k]?.length).length > 0 && (
          <div style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px', color: '#29417a', borderBottom: '2px solid #29417a', paddingBottom: 6 }}>مراجعة الأجهزة</h3>
            {Object.keys(rosLabels).filter(k => patient.ros[k]?.length).map(k => (
              <div key={k} style={{ marginBottom: 4, fontSize: 13 }}>
                <strong>{rosLabels[k]}:</strong> {(Array.isArray(patient.ros[k]) ? patient.ros[k] : [patient.ros[k]]).join(' · ')}
              </div>
            ))}
          </div>
        )}

        {patient.chronicMeds && <div style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', color: '#29417a', borderBottom: '2px solid #29417a', paddingBottom: 6 }}>الأدوية المزمنة</h3>
          <p style={{ margin: 0, fontSize: 14 }}>{patient.chronicMeds}</p>
        </div>}

        {patient.drugAllergies && <div style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', color: '#29417a', borderBottom: '2px solid #29417a', paddingBottom: 6 }}>الحساسية الدوائية</h3>
          <p style={{ margin: 0, fontSize: 14 }}>{patient.drugAllergies}</p>
        </div>}

        {patient.records?.map((rec, i) => (
          <div key={i} style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16, borderRight: '4px solid #29417a' }}>
            <h3 style={{ margin: '0 0 8px', color: '#29417a' }}>السجل #{i + 1} — {rec.date}</h3>
            {rec.primaryDx && <div style={{ background: '#29417a', color: 'white', padding: '4px 12px', borderRadius: 6, display: 'inline-block', marginBottom: 6, fontSize: 13 }}>التشخيص: {rec.primaryDx}</div>}
            {rec.chiefComplaint && <p style={{ margin: '4px 0', fontSize: 13 }}><strong>الشكوى:</strong> {rec.chiefComplaint}</p>}
            {rec.treatmentPlan && <p style={{ margin: '4px 0', fontSize: 13 }}><strong>خطة العلاج:</strong> {rec.treatmentPlan}</p>}
            {rec.followUp && <p style={{ margin: '4px 0', fontSize: 13 }}><strong>المتابعة:</strong> {rec.followUp}</p>}
            {rec.investigations && <p style={{ margin: '4px 0', fontSize: 13 }}><strong>الفحوصات:</strong> {rec.investigations}</p>}
            {rec.invImages?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong style={{ fontSize: 12 }}>صور الفحوصات:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {rec.invImages.map((img, j) => <img key={j} src={img} alt="" style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />)}
                </div>
              </div>
            )}
            {rec.imgImages?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong style={{ fontSize: 12 }}>الأشعة:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {rec.imgImages.map((img, j) => <img key={j} src={img} alt="" style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />)}
                </div>
              </div>
            )}
          </div>
        ))}

        {patient.exams?.length > 0 && <div style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', color: '#29417a', borderBottom: '2px solid #29417a', paddingBottom: 6 }}>الفحوصات المخبرية</h3>
          {patient.exams.map((e, i) => <div key={i} style={{ marginBottom: 4, fontSize: 13 }}><strong>{e.name}:</strong> {e.result || '—'} (طبيعي: {e.normalRange || '—'})</div>)}
        </div>}

        {patient.diseases?.length > 0 && <div style={{ background: '#f8f9fb', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', color: '#29417a', borderBottom: '2px solid #29417a', paddingBottom: 6 }}>الأمراض</h3>
          {patient.diseases.map((d, i) => <div key={i} style={{ marginBottom: 4, fontSize: 14 }}>• {d.name} <span style={{ color: d.status === 'نشط' ? 'red' : 'green', fontWeight: 600 }}>[{d.status}]</span></div>)}
        </div>}
      </div>
    </div>
  )
}
