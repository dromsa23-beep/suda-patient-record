import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { patients as patientsApi } from '../api'
import { rosLabels, imgLabels, detailTabs } from '../constants'
import { Lightbox, FieldBlock, RecordCard, ImageGrid, EmptyState } from './shared'
import jsPDF from 'jspdf'

function downloadPatientPdf(p) {
  try {
    const docPdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const pageW = 210, margin = 15, contentW = pageW - margin * 2
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
        const imgW = contentW, imgH = imgW * 0.6
        if (y + imgH > 275) { docPdf.addPage(); y = 20 }
        docPdf.addImage(base64, 'JPEG', margin, y, imgW, imgH)
        y += imgH + 5
      } catch (e) { console.warn('Image skip:', e) }
    }

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

    addSection('Personal Information', [
      `Name: ${p.name}`, `Age: ${p.age} years`, `Gender: ${p.gender}`,
      `Phone: ${p.phone}`, `Address: ${p.address || '—'}`, `Blood Type: ${p.bloodType || '—'}`,
      `Occupation: ${p.occupation || '—'}`, `Emergency: ${p.emergency || '—'}`,
    ].join('\n'))

    if (p.hpi) addSection('Chief Complaint (HPI)', p.hpi)
    if (p.chronicMeds) addSection('Chronic Medications', p.chronicMeds)
    if (p.drugAllergies) addSection('Drug Allergies', p.drugAllergies)
    if (p.socialHistory) addSection('Social History', p.socialHistory)
    if (p.surgicalHistory) addSection('Surgical History', p.surgicalHistory)
    if (p.pmh?.length) addSection('Past Medical History', p.pmh.map(m => `• ${m}`).join('\n'))
    if (p.fh?.length) addSection('Family History', p.fh.map(f => `• ${f}`).join('\n'))

    const rosItems = Object.entries(p.ros || {}).filter(([, v]) => v?.length)
    if (rosItems.length) addSection('Review of Systems', rosItems.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n'))

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
        if (r.investigations) addText(`Investigations: ${r.investigations}`, 10)
        if (r.invImages?.length) r.invImages.forEach((img, j) => addImageToPdf(img, `Investigation Image (${i + 1}.${j + 1})`))
        if (r.imgImages?.length) r.imgImages.forEach((img, j) => addImageToPdf(img, `Imaging (${i + 1}.${j + 1})`))
        y += 3
      })
    }

    if (p.exams?.length) {
      addSection('Lab Results', p.exams.map(e => `${e.name}: ${e.result || '—'} (normal: ${e.normalRange || '—'})`).join('\n'))
    }
    if (p.diseases?.length) {
      addSection('Diseases', p.diseases.map(d => `• ${d.name} [${d.status}]`).join('\n'))
    }

    docPdf.save(`patient_${p.name || p.id}.pdf`)
  } catch (e) {
    console.error('PDF export error:', e)
    alert('حدث خطأ أثناء إنشاء ملف PDF')
  }
}

export default function DetailsPage() {
  const [patient, setPatient] = useState(null)
  const [tab, setTab] = useState('history')
  const [lightbox, setLightbox] = useState({ images: [], index: null })
  const navigate = useNavigate()
  const { id } = useParams()
  useEffect(() => { patientsApi.get(id).then(r => setPatient(r.data)).catch(() => navigate('/search')) }, [id])
  if (!patient) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }} className="pulse-loading">جاري التحميل...</div>
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
            <button className="btn btn-sm" style={{ flex: 1, background: 'var(--success)', color: 'white' }} onClick={() => downloadPatientPdf(patient)}>📄 تحميل PDF</button>
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
    </div>
  )
}
