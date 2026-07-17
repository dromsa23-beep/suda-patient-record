import { db, auth as firebaseAuth } from './firebase';
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, setDoc
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'firebase/auth';

const MAX_SESSIONS = 3;

const authAPI = {
  login: async (data) => {
    const snap = await getDocs(collection(db, 'users'));
    const userDoc = snap.docs.find(d => {
      const u = d.data();
      return u.username === data.username && u.password === data.password;
    });
    if (!userDoc) throw { response: { data: { detail: 'اسم المستخدم أو كلمة المرور خاطئة' } } };
    const u = userDoc.data();
    if (u.approved === false) {
      throw { response: { data: { detail: 'حسابك في انتظار موافقة الإدارة. للاستفسار الاتصال على 00249127320208' } } };
    }
    if (u.subscriptionEnd) {
      if (new Date(u.subscriptionEnd) < new Date()) {
        throw { response: { data: { detail: 'انتهى اشتراكك. يرجى تجديد الاشتراك' } } };
      }
    }
    return { data: { user: { id: userDoc.id, ...u } } };
  },

  register: async (data) => {
    const snap = await getDocs(collection(db, 'users'));
    const exists = snap.docs.find(d => d.data().username === data.username);
    if (exists) throw { response: { data: { detail: 'اسم المستخدم موجود بالفعل' } } };
    const now = new Date();
    const subEnd = new Date(now);
    subEnd.setMonth(subEnd.getMonth() + 1);
    const userData = {
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      clinic: data.clinic || '',
      username: data.username,
      password: data.password,
      specialty: data.specialty || '',
      approved: false,
      role: 'user',
      subscriptionStart: now.toISOString(),
      subscriptionEnd: subEnd.toISOString(),
      createdAt: now.toISOString()
    };
    await addDoc(collection(db, 'users'), userData);
    return { data: { message: 'تم التسجيل' } };
  },

  logout: async () => {
    localStorage.removeItem('sudaUser');
    try { await signOut(firebaseAuth); } catch {}
  },

  initAdmin: async () => {
    try {
      const snap = await getDocs(collection(db, 'admins'));
      if (snap.empty) {
        await addDoc(collection(db, 'admins'), { username: 'admin', password: 'admin123', name: 'المدير العام', role: 'superadmin', createdAt: new Date().toISOString() });
      }
    } catch {}
  }
};

const patientsApi = {
  list: async () => {
    const snap = await getDocs(collection(db, 'patients'));
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  },
  get: async (id) => {
    const ref = doc(db, 'patients', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Not found');
    return { data: { id: snap.id, ...snap.data() } };
  },
  create: async (data) => {
    const docRef = await addDoc(collection(db, 'patients'), { ...data, createdAt: new Date().toISOString() });
    return { data: { id: docRef.id, ...data } };
  },
  update: async (id, data) => {
    const ref = doc(db, 'patients', id);
    await updateDoc(ref, data);
    return { data: { id, ...data } };
  },
  delete: async (id) => {
    await deleteDoc(doc(db, 'patients', id));
    return { data: { message: 'deleted' } };
  },
  search: async (q) => {
    const snap = await getDocs(collection(db, 'patients'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.name?.includes(q) || p.phone?.includes(q) || p.id?.includes(q));
    return { data: list };
  },
};

const clinicsApi = {
  list: async () => {
    const snap = await getDocs(collection(db, 'clinics'));
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  },
  create: async (data) => {
    const docRef = await addDoc(collection(db, 'clinics'), data);
    return { data: { id: docRef.id, ...data } };
  },
  delete: async (id) => {
    await deleteDoc(doc(db, 'clinics', id));
    return { data: { message: 'deleted' } };
  },
};

const surgeriesApi = {
  list: async () => {
    const snap = await getDocs(collection(db, 'surgeries'));
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  },
  create: async (data) => {
    const docRef = await addDoc(collection(db, 'surgeries'), data);
    return { data: { id: docRef.id, ...data } };
  },
  delete: async (id) => {
    await deleteDoc(doc(db, 'surgeries', id));
    return { data: { message: 'deleted' } };
  },
};

const statsApi = {
  get: async () => {
    const snap = await getDocs(collection(db, 'patients'));
    const patients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

export const auth = authAPI;
export const patients = patientsApi;
export const clinics = clinicsApi;
export const surgeries = surgeriesApi;
export const stats = statsApi;
export default null;
