import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const addPatientDuration = new Trend('add_patient_duration');
const searchDuration = new Trend('search_duration');
const complaintsCounter = new Counter('complaints_sent');

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // ramp up to 100 users
    { duration: '1m',  target: 400 },   // ramp up to 400 users
    { duration: '2m',  target: 400 },   // stay at 400 users
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'https://suda-patient-record.web.app';
const API_BASE = 'https://firestore.googleapis.com/v1/projects/suda-patient-record/databases/(default)/documents';

const firstNames = ['أحمد', 'محمد', 'علي', 'فاطمة', 'خالد', 'سارة', 'عمر', 'نورة', 'حسن', 'ليلى'];
const lastNames = ['العلي', 'محمد', 'أحمد', 'ال Saleh', 'خالد', 'عمر', 'حسن', 'يوسف', 'إبراهيم', 'الحسن'];
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const genders = ['ذكر', 'أنثى'];
const symptoms = [
  'صداع نصفي', 'آلام أسفل الظهر', 'آلام الصدر', 'ضيق تنفس',
  'غثيان', 'دوار', 'حمى', 'سعال', 'إسهال', 'ارهاق'
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone() {
  return '09' + Math.floor(Math.random() * 90000000 + 10000000);
}

function randomAge() {
  return Math.floor(Math.random() * 80 + 1);
}

function generatePatientName() {
  return `${randomFrom(firstNames)} ${randomFrom(lastNames)}`;
}

function generateUsername() {
  const id = Math.floor(Math.random() * 9000 + 1000);
  return `user_${id}`;
}

export default function () {
  const userNum = __VU;
  const username = `user_${userNum}`;
  const password = 'test1234';

  // ─── 1. LOAD HOMEPAGE ───
  group('Load Homepage', () => {
    const res = http.get(BASE_URL);
    check(res, {
      'homepage status 200': (r) => r.status === 200,
      'homepage has content': (r) => r.body.includes('Suda'),
    });
    errorRate.add(res.status !== 200);
  });

  sleep(Math.random() * 2 + 1);

  // ─── 2. LOGIN ───
  group('Login', () => {
    const start = Date.now();
    const payload = JSON.stringify({
      fields: {
        username: { stringValue: username },
        password: { stringValue: password },
      }
    });

    // Try to access Firestore directly (simulates what the app does)
    const res = http.get(`${API_BASE}/users`, {
      headers: { 'Content-Type': 'application/json' },
    });
    loginDuration.add(Date.now() - start);
    check(res, { 'login request succeeded': (r) => r.status === 200 });
  });

  sleep(Math.random() * 3 + 1);

  // ─── 3. VIEW PATIENT LIST ───
  group('View Patient List', () => {
    const res = http.get(`${API_BASE}/patients`, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(res, { 'patients loaded': (r) => r.status === 200 });
    searchDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  sleep(Math.random() * 2 + 1);

  // ─── 4. ADD PATIENT ───
  group('Add Patient', () => {
    const start = Date.now();
    const patientData = {
      fields: {
        name: { stringValue: generatePatientName() },
        age: { integerValue: randomAge() },
        gender: { stringValue: randomFrom(genders) },
        phone: { stringValue: randomPhone() },
        address: { stringValue: `شارع ${randomFrom(['التحرير', 'السلام', 'الشهداء', 'ال independence', 'الثورة'])}` },
        bloodType: { stringValue: randomFrom(bloodTypes) },
        occupation: { stringValue: randomFrom(['طبيب', 'مهندس', 'معلم', 'طالب', 'موظف', 'حرفي']) },
        emergency: { stringValue: randomPhone() },
        hpi: { stringValue: `شكوى: ${randomFrom(symptoms)}` },
        chronicMeds: { stringValue: Math.random() > 0.5 ? 'لا يوجد' : 'باراسيتامول' },
        drugAllergies: { stringValue: Math.random() > 0.7 ? 'لا يوجد' : 'بينوسيلين' },
        createdBy: { stringValue: username },
        userId: { stringValue: username },
        records: { arrayValue: { values: [] } },
      }
    };

    const res = http.post(`${API_BASE}/patients`, JSON.stringify(patientData), {
      headers: { 'Content-Type': 'application/json' },
    });
    addPatientDuration.add(Date.now() - start);
    check(res, { 'patient created': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  sleep(Math.random() * 3 + 1);

  // ─── 5. VIEW PATIENT DETAILS ───
  group('View Patient Details', () => {
    const listRes = http.get(`${API_BASE}/patients`);
    if (listRes.status === 200) {
      try {
        const data = JSON.parse(listRes.body);
        if (data.documents && data.documents.length > 0) {
          const patientId = data.documents[0].name.split('/').pop();
          const res = http.get(`${API_BASE}/patients/${patientId}`);
          check(res, { 'patient details loaded': (r) => r.status === 200 });
        }
      } catch (e) {}
    }
  });

  sleep(Math.random() * 2 + 1);

  // ─── 6. SEARCH ───
  group('Search Patients', () => {
    const res = http.get(`${API_BASE}/patients`);
    check(res, { 'search completed': (r) => r.status === 200 });
    searchDuration.add(res.timings.duration);
  });

  sleep(Math.random() * 2 + 1);

  // ─── 7. ADD MEDICAL RECORD ───
  group('Add Medical Record', () => {
    const listRes = http.get(`${API_BASE}/patients`);
    if (listRes.status === 200) {
      try {
        const data = JSON.parse(listRes.body);
        if (data.documents && data.documents.length > 0) {
          const doc = data.documents[Math.floor(Math.random() * data.documents.length)];
          const patientId = doc.name.split('/').pop();
          const existingRecords = doc.fields?.records?.arrayValue?.values || [];

          const newRecord = {
            mapValue: {
              fields: {
                date: { stringValue: new Date().toISOString().split('T')[0] },
                chiefComplaint: { stringValue: randomFrom(symptoms) },
                primaryDx: { stringValue: randomFrom(['تشخيص أولي', 'متابعة', 'حالة طارئة', 'استشارة']) },
                treatmentPlan: { stringValue: randomFrom(['متابعة', 'فحوصات', 'إحالة', 'علاج دوائي']) },
              }
            }
          };

          existingRecords.push(newRecord);

          const res = http.patch(`${API_BASE}/patients/${patientId}?updateMask.paths=records`, JSON.stringify({
            fields: { records: { arrayValue: { values: existingRecords } } }
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
          check(res, { 'record added': (r) => r.status === 200 });
        }
      } catch (e) {}
    }
  });

  sleep(Math.random() * 2 + 1);

  // ─── 8. SUBMIT COMPLAINT ───
  group('Submit Complaint', () => {
    const complaints = [
      'التطبيق بطيء قليلاً',
      'أحتاج تحسين سرعة التحميل',
      'ممتاز جداً',
      'يوجد مشكلة في عرض الصور',
      'أقترح إضافة ميزة جديدة',
    ];

    const res = http.post(`${API_BASE}/complaints`, JSON.stringify({
      fields: {
        text: { stringValue: randomFrom(complaints) },
        by: { stringValue: username },
        date: { stringValue: new Date().toISOString() },
        status: { stringValue: 'جديد' },
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(res, { 'complaint sent': (r) => r.status === 200 });
    complaintsCounter.add(1);
  });

  sleep(Math.random() * 2 + 1);

  // ─── 9. LOAD STATS ───
  group('View Statistics', () => {
    const res = http.get(`${API_BASE}/patients`);
    check(res, { 'stats loaded': (r) => r.status === 200 });
  });

  sleep(Math.random() * 1 + 1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const errRate = data.metrics.errors?.values?.rate || 0;
  const failedReqs = data.metrics.http_req_failed?.values?.count || 0;

  const summary = `
╔══════════════════════════════════════════╗
║         K6 LOAD TEST RESULTS            ║
╠══════════════════════════════════════════╣
║  Total Requests:      ${String(totalReqs).padStart(10)}       ║
║  Failed Requests:     ${String(failedReqs).padStart(10)}       ║
║  Error Rate:          ${(errRate * 100).toFixed(2).padStart(9)}%       ║
║  P95 Response Time:   ${p95.toFixed(0).padStart(8)} ms      ║
║  Avg Response Time:   ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(0).padStart(8)} ms      ║
║  Max Response Time:   ${(data.metrics.http_req_duration?.values?.max || 0).toFixed(0).padStart(8)} ms      ║
╠══════════════════════════════════════════╣
║  Complaints Sent:     ${String(data.metrics.complaints_sent?.values?.count || 0).padStart(10)}       ║
╠══════════════════════════════════════════╣
║  Status: ${errRate < 0.1 ? '✅ PASS' : '❌ FAIL'}                            ║
╚══════════════════════════════════════════╝
`;

  console.log(summary);

  return {
    'stdout': summary,
    'k6-results.json': JSON.stringify(data, null, 2),
  };
}
