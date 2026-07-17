import { useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { useEffect } from 'react'

export default function ComplaintPage({ user }) {
  const [text, setText] = useState('')
  const [myComplaints, setMyComplaints] = useState([])
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!user?.username) return
    const q = query(collection(db, 'complaints'), where('by', '==', user.username), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setMyComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [user?.username])

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await addDoc(collection(db, 'complaints'), {
        text: text.trim(),
        by: user.username || 'مستخدم',
        date: new Date().toISOString(),
        status: 'جديد'
      })
      setText('')
      setToast('تم إرسال شكواك بنجاح')
      setTimeout(() => setToast(''), 3000)
    } catch (e) {
      console.error(e)
      setToast('حدث خطأ أثناء الإرسال')
      setTimeout(() => setToast(''), 3000)
    }
    setSending(false)
  }

  return (
    <div className="page-inner">
      {toast && <div style={{ background: 'var(--success)', color: 'white', padding: '10px 16px', borderRadius: 8, marginBottom: 12, textAlign: 'center', fontSize: 13 }}>{toast}</div>}

      <div className="section">
        <div className="section-title"><span className="icon">💬</span> تقديم شكوى أو اقتراح</div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 10px' }}>شاركنا ملاحظاتك أو اقتراحاتك لتحسين الخدمة</p>
        <textarea
          placeholder="اكتب شكواك أو اقتراحك هنا..."
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ width: '100%', padding: 12, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', minHeight: 120, resize: 'vertical', fontSize: 14, direction: 'rtl' }}
        />
        <button className="btn btn-primary btn-full" style={{ marginTop: 10 }} onClick={send} disabled={sending || !text.trim()}>
          {sending ? '⏳ جاري الإرسال...' : '📤 إرسال الشكوى'}
        </button>
      </div>

      {myComplaints.length > 0 && (
        <div className="section">
          <div className="section-title"><span className="icon">📋</span> شكواي ({myComplaints.length})</div>
          {myComplaints.map(c => (
            <div key={c.id} style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, marginBottom: 8, borderRight: `3px solid ${c.status === 'جديد' ? 'var(--gold)' : 'var(--success)'}` }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{c.text}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
                <span>{new Date(c.date).toLocaleDateString('ar-EG')}</span>
                <span style={{ color: c.status === 'جديد' ? 'var(--gold)' : 'var(--success)', fontWeight: 600 }}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
