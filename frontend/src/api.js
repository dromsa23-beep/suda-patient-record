import { db, auth as firebaseAuth } from './firebase';
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'firebase/auth';
import { setDoc } from 'firebase/firestore';

const MAX_SESSIONS = 3;

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

const authAPI = {
  login: async (data) => {
    const email = data.username + '@suda.app';
    let cred = null;

    try {
      cred = await signInWithEmailAndPassword(firebaseAuth, email, data.password);
    } catch (firebaseError) {
      const usersSnap = await getDocs(collection(db, 'users'));
      const legacyUser = usersSnap.docs.find(d => {
        const u = d.data();
        return u.username === data.username && u.password === data.password;
      });
      if (legacyUser) {
        try {
          cred = await createUserWithEmailAndPassword(firebaseAuth, email, data.password);
          const lu = legacyUser.data();
          const uid = cred.user.uid;
          await addDoc(collection(db, 'users'), {
            name: lu.name, username: lu.username, email: lu.email, phone: lu.phone,
            clinic: lu.clinic, specialty: lu.specialty, role: lu.role || 'user',
            approved: lu.approved, subscriptionStart: lu.subscriptionStart,
            subscriptionEnd: lu.subscriptionEnd, createdAt: lu.createdAt, uid,
            migrated: true
          });
        } catch (migErr) {
          if (migErr.code === 'auth/email-already-in-use') {
            try {
              cred = await signInWithEmailAndPassword(firebaseAuth, email, data.password);
            } catch { throw { response: { data: { detail: 'حدث خطأ. يرجى المحاولة مرة أخرى أو تغيير كلمة المرور' } } }; }
          } else {
            throw { response: { data: { detail: 'خطأ في الترحيل: ' + migErr.message } } };
          }
        }
      } else {
        throw { response: { data: { detail: 'اسم المستخدم أو كلمة المرور خاطئة' } } };
      }
    }

    const uid = cred.user.uid;
    const usersSnap2 = await getDocs(collection(db, 'users'));
    const userDoc = usersSnap2.docs.find(d => d.data().uid === uid);
    if (!userDoc) {
      await signOut(firebaseAuth);
      throw { response: { data: { detail: 'الحساب غير موجود في النظام' } } };
    }
    const u = userDoc.data();
    if (u.approved === false) {
      await signOut(firebaseAuth);
      throw { response: { data: { detail: 'حسابك في انتظار موافقة الإدارة. للاستفسار الاتصال على 00249127320208' } } };
    }
    if (u.subscriptionEnd) {
      const now = new Date();
      const end = new Date(u.subscriptionEnd);
      if (now > end) {
        await signOut(firebaseAuth);
        throw { response: { data: { detail: 'انتهى اشتراكك. يرجى تجديد الاشتراك للاستمرار في استخدام التطبيق' } } };
      }
    }
    const sessionsSnap = await getDocs(query(collection(db, 'sessions'), where('uid', '==', uid)));
    const activeSessions = sessionsSnap.docs.filter(d => {
      const s = d.data();
      return s.expiresAt > Date.now();
    });
    if (activeSessions.length >= MAX_SESSIONS) {
      await signOut(firebaseAuth);
      throw { response: { data: { detail: 'الحد الأقصى لتسجيل الدخول هو ' + MAX_SESSIONS + ' أجهزة. يرجى تسجيل الخروج من جهاز آخر.' } } };
    }
    const deviceId = localStorage.getItem('suda_device_id') || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    localStorage.setItem('suda_device_id', deviceId);
    const existingDevice = sessionsSnap.docs.find(d => d.data().deviceId === deviceId);
    if (existingDevice) {
      await updateDoc(doc(db, 'sessions', existingDevice.id), { expiresAt: Date.now() + 24 * 60 * 60 * 1000, lastActive: Date.now() });
    } else {
      await addDoc(collection(db, 'sessions'), { uid, deviceId, createdAt: Date.now(), expiresAt: Date.now() + 24 * 60 * 60 * 1000, lastActive: Date.now() });
    }
    return { data: { user: { id: uid, ...u, userDocId: userDoc.id } } };
  },
  register: async (data) => {
    const snap = await getDocs(collection(db, 'users'));
    const exists = snap.docs.find(d => d.data().username === data.username);
    if (exists) throw { response: { data: { detail: 'اسم المستخدم موجود بالفعل' } } };
    const email = data.username + '@suda.app';
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(firebaseAuth, email, data.password);
    } catch (e) {
      throw { response: { data: { detail: 'خطأ في إنشاء الحساب: ' + e.message } } };
    }
    const uid = cred.user.uid;
    const now = new Date();
    const subEnd = new Date(now);
    subEnd.setMonth(subEnd.getMonth() + 1);
    const userData = {
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      clinic: data.clinic || '',
      username: data.username,
      specialty: data.specialty || '',
      uid,
      approved: false,
      role: 'user',
      subscriptionStart: now.toISOString(),
      subscriptionEnd: subEnd.toISOString(),
      createdAt: now.toISOString()
    };
    await setDoc(doc(db, 'users', uid), userData);
    await signOut(firebaseAuth);
    return { data: { message: 'تم التسجيل' } };
  },
  logout: async () => {
    const user = firebaseAuth.currentUser;
    if (user) {
      const deviceId = localStorage.getItem('suda_device_id');
      if (deviceId) {
        const snap = await getDocs(query(collection(db, 'sessions'), where('uid', '==', user.uid)));
        for (const d of snap.docs) {
          if (d.data().deviceId === deviceId) {
            await deleteDoc(doc(db, 'sessions', d.id));
          }
        }
      }
      await signOut(firebaseAuth);
    }
  },
  initAdmin: async () => {
    const snap = await getDocs(collection(db, 'admins'));
    if (snap.empty) {
      const defaultAdmin = { username: 'admin', password: 'admin123', name: 'المدير العام', role: 'superadmin', createdAt: new Date().toISOString() };
      await addDoc(collection(db, 'admins'), defaultAdmin);
    }
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
