import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore'

export default function ComplaintPage({ user }) {
  const [text, setText] = useState('')
  const [myComplaints, setMyComplaints] = useState([])
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [replyText, setReplyText] = useState({})

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

  const replyToAdmin = async (id) => {
    const text = replyText[id]?.trim()
    if (!text) return
    await updateDoc(doc(db, 'complaints', id), {
      userReply: text,
      userReplyDate: new Date().toISOString(),
      status: 'جديد'
    })
    setReplyText({ ...replyText, [id]: '' })
    setToast('تم إرسال ردك')
    setTimeout(() => setToast(''), 3000)
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
            <div key={c.id} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, marginBottom: 10, borderRight: `3px solid ${c.status === 'جديد' ? 'var(--gold)' : c.status === 'تم الحل' ? 'var(--success)' : 'var(--royal)'}` }}>
              <div style={{ fontSize: 14, marginBottom: 6, lineHeight: 1.6 }}>{c.text}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
                <span>{new Date(c.date).toLocaleDateString('ar-EG')} {new Date(c.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{
                  color: c.status === 'جديد' ? 'var(--gold)' : c.status === 'تم الحل' ? 'var(--success)' : 'var(--royal)',
                  fontWeight: 700,
                  background: c.status === 'جديد' ? '#fff8e1' : c.status === 'تم الحل' ? '#e8f5e9' : '#e3f2fd',
                  padding: '2px 8px',
                  borderRadius: 4
                }}>
                  {c.status === 'جديد' ? '⏳ جديد' : c.status === 'تم الحل' ? '✅ تم الحل' : '💬 بانتظار ردك'}
                </span>
              </div>

              {c.adminReply && (
                <div style={{ background: '#e3f2fd', padding: 10, borderRadius: 8, marginBottom: 8, borderRight: '3px solid var(--royal)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--royal)', marginBottom: 4 }}>💬 رد المدير:</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{c.adminReply}</div>
                  {c.replyDate && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{new Date(c.replyDate).toLocaleDateString('ar-EG')}</div>}
                </div>
              )}

              {c.status === 'تم الحل' && (
                <div style={{ background: '#e8f5e9', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>✅ تم حل المشكلة بنجاح</span>
                  {c.resolvedDate && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{new Date(c.resolvedDate).toLocaleDateString('ar-EG')}</div>}
                </div>
              )}

              {c.adminReply && c.status !== 'تم الحل' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    placeholder="رد على المدير..."
                    value={replyText[c.id] || ''}
                    onChange={e => setReplyText({ ...replyText, [c.id]: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && replyToAdmin(c.id)}
                    style={{ flex: 1, padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => replyToAdmin(c.id)}>📤 رد</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
