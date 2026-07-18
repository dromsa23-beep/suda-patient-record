class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = {}
  }

  _clean(key) {
    const now = Date.now()
    if (!this.requests[key]) this.requests[key] = []
    this.requests[key] = this.requests[key].filter(t => now - t < this.windowMs)
  }

  isAllowed(key) {
    this._clean(key)
    if (this.requests[key].length >= this.maxRequests) return false
    this.requests[key].push(Date.now())
    return true
  }

  remaining(key) {
    this._clean(key)
    return Math.max(0, this.maxRequests - (this.requests[key]?.length || 0))
  }

  retryAfter(key) {
    this._clean(key)
    if (!this.requests[key]?.length) return 0
    const oldest = this.requests[key][0]
    return Math.max(0, this.windowMs - (Date.now() - oldest))
  }
}

export const loginLimiter = new RateLimiter(5, 60000)
export const registerLimiter = new RateLimiter(3, 300000)
export const patientLimiter = new RateLimiter(10, 60000)
export const complaintLimiter = new RateLimiter(5, 60000)
export const searchLimiter = new RateLimiter(30, 60000)
export const downloadLimiter = new RateLimiter(5, 60000)
export const adminLimiter = new RateLimiter(20, 60000)

export function checkRateLimit(limiter, key) {
  if (!limiter.isAllowed(key)) {
    const wait = Math.ceil(limiter.retryAfter(key) / 1000)
    return { allowed: false, wait, remaining: limiter.remaining(key) }
  }
  return { allowed: true, remaining: limiter.remaining(key) }
}

export function getDeviceId() {
  let id = localStorage.getItem('suda_device_id')
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('suda_device_id', id)
  }
  return id
}

export function rateLimitToast(wait) {
  return `⏳ انتظر ${wait} ثانية قبل المحاولة التالية`
}
