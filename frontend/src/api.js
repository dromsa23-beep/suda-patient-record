import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const API = axios.create({ baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : '/api' });

let backendAvailable = null;

async function checkBackend() {
  if (backendAvailable !== null) return backendAvailable;
  try {
    await axios.get(`${BACKEND_URL || ''}/api/app-details`, { timeout: 3000 });
    backendAvailable = true;
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

function getDB() {
  try { return JSON.parse(localStorage.getItem('sudaDB') || '{}') }
  catch { return {} }
}
function saveDB(db) { localStorage.setItem('sudaDB', JSON.stringify(db)) }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

const localAuth = {
  login: async (data) => {
    const db = getDB();
    const users = db.users || [];
    const user = users.find(u => u.username === data.username && u.password === data.password);
    if (!user) throw { response: { data: { detail: 'اسم المستخدم أو كلمة المرور خاطئة' } } };
    const { password, ...safe } = user;
    return { data: { user: safe } };
  },
  register: async (data) => {
    const db = getDB();
    if (!db.users) db.users = [];
    if (db.users.find(u => u.username === data.username)) throw { response: { data: { detail: 'اسم المستخدم موجود بالفعل' } } };
    const user = { id: genId(), ...data, createdAt: new Date().toISOString() };
    db.users.push(user);
    saveDB(db);
    return { data: { message: 'تم التسجيل' } };
  },
};

const localPatients = {
  list: async () => { const db = getDB(); return { data: db.patients || [] }; },
  get: async (id) => { const db = getDB(); const p = (db.patients || []).find(x => x.id === id); if (!p) throw new Error('Not found'); return { data: p }; },
  create: async (data) => { const db = getDB(); if (!db.patients) db.patients = []; const p = { id: genId(), ...data, createdAt: new Date().toISOString() }; db.patients.push(p); saveDB(db); return { data: p }; },
  update: async (id, data) => { const db = getDB(); const idx = (db.patients || []).findIndex(x => x.id === id); if (idx < 0) throw new Error('Not found'); db.patients[idx] = { ...db.patients[idx], ...data }; saveDB(db); return { data: db.patients[idx] }; },
  delete: async (id) => { const db = getDB(); db.patients = (db.patients || []).filter(x => x.id !== id); saveDB(db); return { data: { message: 'deleted' } }; },
  search: async (q) => { const db = getDB(); const list = (db.patients || []).filter(p => p.name?.includes(q) || p.phone?.includes(q) || p.id?.includes(q)); return { data: list }; },
};

const localClinics = {
  list: async () => { const db = getDB(); return { data: db.clinics || [] }; },
  create: async (data) => { const db = getDB(); if (!db.clinics) db.clinics = []; const c = { id: genId(), ...data }; db.clinics.push(c); saveDB(db); return { data: c }; },
  delete: async (id) => { const db = getDB(); db.clinics = (db.clinics || []).filter(x => x.id !== id); saveDB(db); return { data: { message: 'deleted' } }; },
};

const localSurgeries = {
  list: async () => { const db = getDB(); return { data: db.surgeries || [] }; },
  create: async (data) => { const db = getDB(); if (!db.surgeries) db.surgeries = []; const s = { id: genId(), ...data }; db.surgeries.push(s); saveDB(db); return { data: s }; },
  delete: async (id) => { const db = getDB(); db.surgeries = (db.surgeries || []).filter(x => x.id !== id); saveDB(db); return { data: { message: 'deleted' } }; },
};

const localStats = {
  get: async () => {
    const db = getDB();
    const patients = db.patients || [];
    const ages = patients.map(p => parseInt(p.age) || 0).filter(a => a > 0);
    const diseases = {};
    const exams = {};
    patients.forEach(p => {
      (p.records || []).forEach(r => {
        if (r.primaryDx) diseases[r.primaryDx] = (diseases[r.primaryDx] || 0) + 1;
        if (r.investigations) exams[r.investigations] = (exams[r.investigations] || 0) + 1;
      });
      (p.diseases || []).forEach(d => { if (d.name) diseases[d.name] = (diseases[d.name] || 0) + 1; });
    });
    return {
      data: {
        total: patients.length,
        avgAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
        male: patients.filter(p => p.gender === 'ذكر').length,
        female: patients.filter(p => p.gender === 'أنثى').length,
        topDiseases: Object.entries(diseases).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
        topExams: Object.entries(exams).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      }
    };
  },
};

export const auth = {
  login: async (data) => (await checkBackend()) ? API.post('/auth/login', data) : localAuth.login(data),
  register: async (data) => (await checkBackend()) ? API.post('/auth/register', data) : localAuth.register(data),
};

export const patients = {
  list: async () => (await checkBackend()) ? API.get('/patients') : localPatients.list(),
  get: async (id) => (await checkBackend()) ? API.get(`/patients/${id}`) : localPatients.get(id),
  create: async (data) => (await checkBackend()) ? API.post('/patients', data) : localPatients.create(data),
  update: async (id, data) => (await checkBackend()) ? API.put(`/patients/${id}`, data) : localPatients.update(id, data),
  delete: async (id) => (await checkBackend()) ? API.delete(`/patients/${id}`) : localPatients.delete(id),
  search: async (q) => (await checkBackend()) ? API.get(`/patients/search/${encodeURIComponent(q)}`) : localPatients.search(q),
};

export const clinics = {
  list: async () => (await checkBackend()) ? API.get('/clinics') : localClinics.list(),
  create: async (data) => (await checkBackend()) ? API.post('/clinics', data) : localClinics.create(data),
  delete: async (id) => (await checkBackend()) ? API.delete(`/clinics/${id}`) : localClinics.delete(id),
};

export const surgeries = {
  list: async () => (await checkBackend()) ? API.get('/surgeries') : localSurgeries.list(),
  create: async (data) => (await checkBackend()) ? API.post('/surgeries', data) : localSurgeries.create(data),
  delete: async (id) => (await checkBackend()) ? API.delete(`/surgeries/${id}`) : localSurgeries.delete(id),
};

export const stats = {
  get: async () => (await checkBackend()) ? API.get('/stats') : localStats.get(),
};

export default API;
