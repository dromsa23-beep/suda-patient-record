const ENTITY_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;' }
const XSS_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /expression\(/gi,
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /<applet[\s\S]*?>/gi,
  /<form[\s\S]*?>/gi,
  /<svg[\s\S]*?on\w+/gi,
  /<img[^>]+onerror/gi,
  /<link[^>]+href\s*=\s*["']?\s*javascript:/gi,
]

export function sanitize(str) {
  if (typeof str !== 'string') return str
  let clean = str
  XSS_PATTERNS.forEach(p => { clean = clean.replace(p, '') })
  clean = clean.replace(/[&<>"'/]/g, c => ENTITY_MAP[c] || c)
  return clean
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeObject)
  const result = {}
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') result[key] = sanitize(val)
    else if (Array.isArray(val)) result[key] = val.map(v => typeof v === 'string' ? sanitize(v) : sanitizeObject(v))
    else if (val && typeof val === 'object') result[key] = sanitizeObject(val)
    else result[key] = val
  }
  return result
}

export function sanitizeInput(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function clearHtml(str) {
  if (typeof str !== 'string') return str
  return str.replace(/<[^>]*>/g, '')
}

export function isValidUrl(str) {
  try {
    const url = new URL(str)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

export function sanitizeForInnerHtml(html) {
  if (typeof html !== 'string') return html
  let clean = html
  XSS_PATTERNS.forEach(p => { clean = clean.replace(p, '') })
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
  clean = clean.replace(/\s+on\w+\s*=\s*\S+/gi, '')
  return clean
}
