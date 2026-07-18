import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { complaintLimiter, checkRateLimit, getDeviceId, rateLimitToast } from '../rateLimiter'

export default function ComplaintPage({ user }) {
  const [text, setText] = useState('')
  const [myComplaints, setMyComplaints] = useState([])
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [replyText, setReplyText] = useState({})
  const [openChat, setOpenChat] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (!user?.username) return
    const q = query(collection(db, 'complaints'), where('by', '==', user.username), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setMyComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [user?.username])

  useEffect(() => {
    if (openChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [openChat, myComplaints])

  const getMessages = (c) => {
    if (c.messages?.length) return c.messages
    return [{ sender: 'user', senderName: c.by || 'مستخدم', text: c.text, date: c.date }]
  }

  const send = async () => {
    if (!text.trim()) return
    const deviceId = getDeviceId()
    const rate = checkRateLimit(complaintLimiter, deviceId)
    if (!rate.allowed) {
      setToast(rateLimitToast(rate.wait))
      setTimeout(() => setToast(''), 3000)
      return
    }
    setSending(true)
    try {
      await addDoc(collection(db, 'complaints'), {
        text: text.trim(),
        by: user.username || 'مستخدم',
        date: new Date().toISOString(),
        status: 'جديد',
        messages: [{
          sender: 'user',
          senderName: user.name || user.username,
          text: text.trim(),
          date: new Date().toISOString()
        }]
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

  const replyToAdmin = async (complaintId) => {
    const msg = replyText[complaintId]?.trim()
    if (!msg) return
    await updateDoc(doc(db, 'complaints', complaintId), {
      messages: arrayUnion({
        sender: 'user',
        senderName: user.name || user.username,
        text: msg,
        date: new Date().toISOString()
      }),
      status: 'جديد'
    })
    setReplyText({ ...replyText, [complaintId]: '' })
  }

  const getStatusInfo = (status) => {
    if (status === 'جديد') return { bg: '#fff8e1', color: '#f9a825', label: '⏳ جديد' }
    if (status === 'تم الحل') return { bg: '#e8f5e9', color: '#2e7d32', label: '✅ تم الحل' }
    return { bg: '#e3f2fd', color: '#1565c0', label: '💬...' }
  }

  const ComplaintCard = ({ c }) => {
    const st = getStatusInfo(c.status)
    const isOpen = openChat === c.id
    const messages = getMessages(c)

    return (
      <div style={{ marginBottom: 12, background: 'var(--bg)', borderRadius: 12, overflow: 'hidden', border: isOpen ? '2px solid var(--royal)' : '1px solid var(--border)' }}>
        {/* Header */}
        <div
          onClick={() => setOpenChat(isOpen ? null : c.id)}
          style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{c.text}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {new Date(c.date).toLocaleDateString('ar-EG')} {new Date(c.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} · {messages.length} رسالة
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>{st.label}</span>
        </div>

        {/* Chat Thread */}
        {isOpen && (
          <div style={{ borderTop: '1px solid var(--border)', background: 'white' }}>
            <div style={{ maxHeight: 400, overflowY: 'auto', padding: 12 }}>
              {messages.map((m, i) => {
                const isUser = m.sender === 'user'
                const isSystem = m.sender === 'system'
                if (isSystem) {
                  return (
                    <div key={i} style={{ textAlign: 'center', margin: '10px 0' }}>
                      <span style={{ fontSize: 11, background: '#e8f5e9', color: 'var(--success)', padding: '4px 14px', borderRadius: 10 }}>{m.text}</span>
                    </div>
                  )
                }
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, textAlign: isUser ? 'left' : 'right' }}>
                        {isUser ? 'أنت' : 'المدير'} · {new Date(m.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isUser ? 'var(--royal)' : '#f0f0f0',
                        color: isUser ? 'white' : 'var(--text-1)',
                        fontSize: 13,
                        lineHeight: 1.6,
                        wordBreak: 'break-word'
                      }}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Input */}
            {c.status !== 'تم الحل' && (
              <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                <input
                  placeholder="اكتب رد..."
                  value={replyText[c.id] || ''}
                  onChange={e => setReplyText({ ...replyText, [c.id]: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && replyToAdmin(c.id)}
                  style={{ flex: 1, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => replyToAdmin(c.id)}>📤</button>
              </div>
            )}

            {c.status === 'تم الحل' && (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)', textAlign: 'center', background: '#e8f5e9' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>✅ تم حل المشكلة بنجاح</span>
                {c.resolvedDate && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{new Date(c.resolvedDate).toLocaleDateString('ar-EG')}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-inner">
      {toast && <div style={{ background: 'var(--success)', color: 'white', padding: '10px 16px', borderRadius: 8, marginBottom: 12, textAlign: 'center', fontSize: 13 }}>{toast}</div>}

      <div className="section">
        <div className="section-title"><span className="icon">💬</span> شكوى جديدة</div>
        <textarea
          placeholder="اكتب شكواك أو اقتراحك هنا..."
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ width: '100%', padding: 12, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', minHeight: 100, resize: 'vertical', fontSize: 14, direction: 'rtl' }}
        />
        <button className="btn btn-primary btn-full" style={{ marginTop: 10 }} onClick={send} disabled={sending || !text.trim()}>
          {sending ? '⏳ جاري الإرسال...' : '📤 إرسال'}
        </button>
      </div>

      {myComplaints.length > 0 && (
        <div className="section">
          <div className="section-title"><span className="icon">📋</span> شكواي ({myComplaints.length})</div>
          {myComplaints.map(c => <ComplaintCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}
