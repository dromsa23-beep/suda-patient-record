import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

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
    if (user.approved === false) throw { response: { data: { detail: 'حسابك في انتظار موافقة الإدارة. للاستفسار الاتصال على 00249127320208' } } };
    if (user.subscriptionEnd) {
      const now = new Date();
      const end = new Date(user.subscriptionEnd);
      if (now > end) throw { response: { data: { detail: 'انتهى اشتراكك. يرجى تجديد الاشتراك للاستمرار في استخدام التطبيق' } } };
    }
    const { password, ...safe } = user;
    return { data: { user: safe } };
  },
  register: async (data) => {
    const db = getDB();
    if (!db.users) db.users = [];
    if (db.users.find(u => u.username === data.username)) throw { response: { data: { detail: 'اسم المستخدم موجود بالفعل' } } };
    const now = new Date();
    const subEnd = new Date(now);
    subEnd.setMonth(subEnd.getMonth() + 1);
    const user = { id: genId(), ...data, approved: false, subscriptionStart: now.toISOString(), subscriptionEnd: subEnd.toISOString(), createdAt: now.toISOString() };
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
  login: localAuth.login,
  register: localAuth.register,
};

export const patients = {
  list: localPatients.list,
  get: localPatients.get,
  create: localPatients.create,
  update: localPatients.update,
  delete: localPatients.delete,
  search: localPatients.search,
};

export const clinics = {
  list: localClinics.list,
  create: localClinics.create,
  delete: localClinics.delete,
};

export const surgeries = {
  list: localSurgeries.list,
  create: localSurgeries.create,
  delete: localSurgeries.delete,
};

export const stats = {
  get: localStats.get,
};

export default null;
