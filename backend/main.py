from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import json
import os

from database import get_db, init_db
from models import (
    UserCreate, UserLogin, PatientCreate, PatientUpdate,
    ClinicDay, SurgeryDay
)

app = FastAPI(title="Suda Clinic API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DASHBOARD_PATH = os.path.join(os.path.dirname(__file__), "templates", "dashboard.html")


@app.on_event("startup")
async def startup():
    await init_db()


@app.post("/api/auth/register")
async def register(user: UserCreate):
    conn = await get_db()
    existing = await conn.execute("SELECT id FROM users WHERE username=?", (user.username,))
    if await existing.fetchone():
        raise HTTPException(400, "اسم المستخدم موجود بالفعل")
    await conn.execute(
        "INSERT INTO users (name,email,phone,clinic,username,password,specialty) VALUES (?,?,?,?,?,?,?)",
        (user.name, user.email, user.phone, user.clinic, user.username, user.password, user.specialty)
    )
    await conn.commit()
    return {"message": "تم إنشاء الحساب"}


@app.post("/api/auth/login")
async def login(creds: UserLogin):
    conn = await get_db()
    row = await conn.execute("SELECT * FROM users WHERE username=? AND password=?", (creds.username, creds.password))
    user = await row.fetchone()
    if not user:
        raise HTTPException(401, "بيانات الدخول غير صحيحة")
    return {"user": dict(user)}


@app.get("/api/patients")
async def list_patients():
    conn = await get_db()
    rows = await conn.execute("SELECT * FROM patients ORDER BY id DESC")
    all_rows = await rows.fetchall()
    return [{"id": str(r["id"]), **json.loads(r["data"])} for r in all_rows]


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str):
    conn = await get_db()
    row = await conn.execute("SELECT * FROM patients WHERE id=?", (int(patient_id),))
    r = await row.fetchone()
    if not r:
        raise HTTPException(404, "المريض غير موجود")
    return {"id": str(r["id"]), **json.loads(r["data"])}


@app.post("/api/patients")
async def create_patient(patient: PatientCreate):
    conn = await get_db()
    data = json.dumps(patient.model_dump(), ensure_ascii=False)
    cursor = await conn.execute("INSERT INTO patients (data) VALUES (?)", (data,))
    await conn.commit()
    return {"message": "تم حفظ المريض", "id": str(cursor.lastrowid)}


@app.put("/api/patients/{patient_id}")
async def update_patient(patient_id: str, update: PatientUpdate):
    conn = await get_db()
    row = await conn.execute("SELECT data FROM patients WHERE id=?", (int(patient_id),))
    r = await row.fetchone()
    if not r:
        raise HTTPException(404, "المريض غير موجود")
    data = json.loads(r["data"])
    for k, v in update.model_dump().items():
        if v is not None:
            data[k] = v
    await conn.execute("UPDATE patients SET data=? WHERE id=?", (json.dumps(data, ensure_ascii=False), int(patient_id)))
    await conn.commit()
    return {"message": "تم التحديث"}


@app.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: str):
    conn = await get_db()
    await conn.execute("DELETE FROM patients WHERE id=?", (int(patient_id),))
    await conn.commit()
    return {"message": "تم الحذف"}


@app.get("/api/patients/search/{query}")
async def search_patients(query: str):
    conn = await get_db()
    rows = await conn.execute("SELECT * FROM patients")
    all_rows = await rows.fetchall()
    q = query.lower()
    results = []
    for r in all_rows:
        d = json.loads(r["data"])
        if q in d.get("name", "").lower() or q in d.get("phone", "").lower() or q in d.get("address", "").lower():
            results.append({"id": str(r["id"]), **d})
    return results


@app.get("/api/clinics")
async def list_clinics():
    conn = await get_db()
    rows = await conn.execute("SELECT * FROM clinics ORDER BY id DESC")
    return [{"id": str(r["id"]), "date": r["date"], "place": r["place"], "patients": json.loads(r["patients"])} for r in await rows.fetchall()]


@app.post("/api/clinics")
async def create_clinic(clinic: ClinicDay):
    conn = await get_db()
    existing = await conn.execute("SELECT * FROM clinics WHERE date=? AND place=?", (clinic.date, clinic.place))
    ex = await existing.fetchone()
    if ex:
        pts = json.loads(ex["patients"]) + [p for p in clinic.patients]
        await conn.execute("UPDATE clinics SET patients=? WHERE id=?", (json.dumps(pts, ensure_ascii=False), ex["id"]))
    else:
        await conn.execute("INSERT INTO clinics (date,place,patients) VALUES (?,?,?)",
            (clinic.date, clinic.place, json.dumps(clinic.patients, ensure_ascii=False)))
    await conn.commit()
    return {"message": "تم الحفظ"}


@app.delete("/api/clinics/{clinic_id}")
async def delete_clinic(clinic_id: str):
    conn = await get_db()
    await conn.execute("DELETE FROM clinics WHERE id=?", (int(clinic_id),))
    await conn.commit()
    return {"message": "تم الحذف"}


@app.get("/api/surgeries")
async def list_surgeries():
    conn = await get_db()
    rows = await conn.execute("SELECT * FROM surgeries ORDER BY id DESC")
    return [{"id": str(r["id"]), "date": r["date"], "patients": json.loads(r["patients"])} for r in await rows.fetchall()]


@app.post("/api/surgeries")
async def create_surgery(surgery: SurgeryDay):
    conn = await get_db()
    existing = await conn.execute("SELECT * FROM surgeries WHERE date=?", (surgery.date,))
    ex = await existing.fetchone()
    if ex:
        pts = json.loads(ex["patients"]) + [p for p in surgery.patients]
        await conn.execute("UPDATE surgeries SET patients=? WHERE id=?", (json.dumps(pts, ensure_ascii=False), ex["id"]))
    else:
        await conn.execute("INSERT INTO surgeries (date,patients) VALUES (?,?)",
            (surgery.date, json.dumps(surgery.patients, ensure_ascii=False)))
    await conn.commit()
    return {"message": "تم الحفظ"}


@app.delete("/api/surgeries/{surgery_id}")
async def delete_surgery(surgery_id: str):
    conn = await get_db()
    await conn.execute("DELETE FROM surgeries WHERE id=?", (int(surgery_id),))
    await conn.commit()
    return {"message": "تم الحذف"}


@app.get("/api/stats")
async def get_stats():
    conn = await get_db()
    rows = await conn.execute("SELECT data FROM patients")
    all_rows = await rows.fetchall()
    patients = [json.loads(r["data"]) for r in all_rows]
    total = len(patients)
    avg_age = sum(p.get("age", 0) for p in patients) / total if total else 0
    male = sum(1 for p in patients if p.get("gender") == "ذكر")
    disease_count = {}
    exam_count = {}
    for p in patients:
        for d in p.get("diseases", []):
            disease_count[d["name"]] = disease_count.get(d["name"], 0) + 1
        for e in p.get("exams", []):
            exam_count[e["name"]] = exam_count.get(e["name"], 0) + 1
    top_diseases = sorted(disease_count.items(), key=lambda x: x[1], reverse=True)[:10]
    top_exams = sorted(exam_count.items(), key=lambda x: x[1], reverse=True)[:10]
    return {
        "total": total, "avgAge": round(avg_age, 1), "male": male, "female": total - male,
        "topDiseases": [{"name": k, "count": v} for k, v in top_diseases],
        "topExams": [{"name": k, "count": v} for k, v in top_exams],
    }


@app.get("/", response_class=HTMLResponse)
async def dashboard():
    with open(DASHBOARD_PATH, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/app-details")
async def get_app_details():
    return {
        "app": {
            "name": "Suda Patient Record System",
            "version": "1.0.0",
            "description": "نظام إدارة سجلات المرضى - Suda Clinic Management System",
            "developer": "Suda Team",
            "lastUpdated": "2026-06-13"
        },
        "features": {
            "patient_management": {
                "title": "إدارة المرضى",
                "features": [
                    "إضافة مريض جديد ببيانات شاملة",
                    "تعديل بيانات المريض",
                    "بحث بالاسم أو رقم الهاتف أو العنوان",
                    "حذف المريض",
                    "عرض تفاصيل المريض بـ 5 تبويبات"
                ]
            },
            "medical_history": {
                "title": "التاريخ المرضي",
                "features": [
                    "SOCRATES Analysis - تحليل الشكوى",
                    "Past Medical History - التاريخ المرضي مع خيارات جاهزة",
                    "Family History - التاريخ العائلي",
                    "Drug History - التاريخ الدوائي",
                    "Systemic Review - مراجعة الأجهزة مع 13 جهاز"
                ]
            },
            "clinical_examination": {
                "title": "الكشف السريري",
                "features": [
                    "العلامات الحيوية (BP, HR, RR, Temp, SpO2, Weight)",
                    "فحص القلب والتنفس",
                    "فحص البطن والجهاز العصبي",
                    "فحص العضلات الهيكلية"
                ]
            },
            "investigations": {
                "title": "الفحوصات",
                "features": [
                    "نتائج الفحوصات المخبرية",
                    "رفع صور الفحوصات",
                    "تصوير بالكاميرا مباشرة"
                ]
            },
            "radiology": {
                "title": "الأشعة",
                "features": [
                    "X-Ray - الأشعة السينية",
                    "Ultrasound - الموجات فوق الصوتية",
                    "CT Scan - التصوير المقطعي",
                    "MRI - الرنين المغناطيسي",
                    "أشعة أخرى (ECG, Echo...)",
                    "رفع/تصوير الأشعة لكل نوع"
                ]
            },
            "prescription": {
                "title": "الوصفة الطبية",
                "features": [
                    "التشخيص الأساسي",
                    "خطة العلاج",
                    "ملاحظات المتابعة"
                ]
            },
            "form_editor": {
                "title": "محرر النماذج",
                "features": [
                    "وضع تعديل متقدم",
                    "إضافة/حذف/تعديل الأقسام",
                    "إضافة/حذف/تعديل السطور",
                    "إعادة ترتيب الأقسام",
                    "إضافة أقسام مخصصة",
                    "إضافة حقول مخصصة"
                ]
            },
            "imaging": {
                "title": "الصور",
                "features": [
                    "رفع صور من الجهاز",
                    "تصوير بالكاميرا",
                    "عرض الصور بملء الشاشة",
                    "تنقل بين الصور"
                ]
            },
            "surgery": {
                "title": "العمليات",
                "features": [
                    "إضافة يوم عمليات",
                    "قائمة المرضى بالعمليات",
                    "بحث في العمليات"
                ]
            },
            "clinic": {
                "title": "العيادة",
                "features": [
                    "عيادة جديدة",
                    "عيادات سابقة",
                    "بحث حي في المرضى",
                    "إرسال SMS"
                ]
            },
            "statistics": {
                "title": "الإحصائيات",
                "features": [
                    "إجمالي المرضى",
                    "متوسط العمر",
                    "توزيع الجنس",
                    "أكثر الأمراض شيوعاً",
                    "أكثر الفحوصات"
                ]
            }
        },
        "api_endpoints": {
            "auth": {
                "POST /api/auth/register": "تسجيل حساب جديد",
                "POST /api/auth/login": "تسجيل الدخول"
            },
            "patients": {
                "GET /api/patients": "قائمة جميع المرضى",
                "GET /api/patients/{id}": "تفاصيل مريض",
                "POST /api/patients": "إضافة مريض جديد",
                "PUT /api/patients/{id}": "تحديث بيانات مريض",
                "DELETE /api/patients/{id}": "حذف مريض",
                "GET /api/patients/search/{query}": "بحث عن مريض"
            },
            "clinics": {
                "GET /api/clinics": "قائمة العيادات",
                "POST /api/clinics": "إضافة عيادة",
                "DELETE /api/clinics/{id}": "حذف عيادة"
            },
            "surgeries": {
                "GET /api/surgeries": "قائمة العمليات",
                "POST /api/surgeries": "إضافة عملية",
                "DELETE /api/surgeries/{id}": "حذف عملية"
            },
            "stats": {
                "GET /api/stats": "إحصائيات النظام"
            },
            "app": {
                "GET /api/app-details": "تفاصيل التطبيق والميزات"
            }
        },
        "test_accounts": [
            {"username": "admin", "password": "admin123", "role": "مدير"}
        ],
        "sample_data": {
            "patient": {
                "name": "محمد أحمد علي",
                "age": 35,
                "gender": "ذكر",
                "phone": "+966501234567",
                "address": "الرياض، المملكة العربية السعودية",
                "bloodType": "O+",
                "occupation": "مهندس",
                "emergency": "+966509876543",
                "hpi": "ألم في أسفل البطن منذ 3 أيام",
                "pmh": ["سكري", "ضغط دم"],
                "chronicMeds": "ميتفورمين 500mg مرتين يومياً\nأملوديبين 5mg مرة يومياً",
                "drugAllergies": "بنسيلين (طفح جلدي)",
                "ros": {
                    "respiratory": ["Cough", "Shortness of breath"],
                    "gi": ["Nausea"]
                },
                "records": [{
                    "date": "2026-06-13",
                    "chiefComplaint": "ألم أسفل البطن",
                    "socratesText": "Site: أسفل البطن\nOnset: منذ 3 أيام\nCharacter: مستمر\nAssociated: غثيان خفيف",
                    "bp": "120/80",
                    "hr": "72",
                    "rr": "18",
                    "temp": "37.2",
                    "spo2": "98",
                    "weight": "75",
                    "investigations": "CBC: Hb 13, WBC 7500\nU&E: Normal\nUrine: Clear",
                    "primaryDx": "التهاب مسالك بولية",
                    "medications": "Ciprofloxacin 500mg BID x 7 days\nParacetamol 1g PRN"
                }]
            }
        },
        "tech_stack": {
            "frontend": "React + Vite + React Router",
            "backend": "FastAPI (Python)",
            "database": "SQLite",
            "ui": "RTL Arabic Interface"
        },
        "urls": {
            "frontend_dev": "http://localhost:5173",
            "backend_api": "http://localhost:8000/api",
            "dashboard": "http://localhost:8000",
            "app_details": "http://localhost:8000/api/app-details"
        }
    }


@app.get("/api/docs", response_class=HTMLResponse)
async def api_docs():
    return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Suda API Documentation</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f2f5f9; color: #040f1e; line-height: 1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; }
        h1 { text-align: center; color: #040f1e; margin: 20px 0; font-size: 28px; }
        h2 { color: #0b3b6b; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #c9a84c; }
        h3 { color: #185fa5; margin: 15px 0 8px; }
        .endpoint { background: white; border-radius: 10px; padding: 15px; margin: 10px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .method { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-weight: bold; font-size: 12px; margin-left: 8px; }
        .get { background: #28a745; }
        .post { background: #007bff; }
        .put { background: #ffc107; color: #333; }
        .delete { background: #dc3545; }
        .path { font-family: monospace; font-size: 14px; color: #333; }
        .desc { color: #666; font-size: 14px; margin-top: 5px; }
        .method-req { background: #040f1e; color: #c9a84c; padding: 10px; border-radius: 6px; margin: 10px 0; font-family: monospace; font-size: 13px; white-space: pre-wrap; overflow-x: auto; }
        a { color: #0b3b6b; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .badge { background: #c9a84c; color: #040f1e; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 5px; }
        .feature-list { columns: 2; column-gap: 20px; }
        .feature-list li { margin: 5px 0; font-size: 14px; }
        @media(max-width:768px) { .feature-list { columns: 1; } }
    </style>
</head>
<body>
<div class="container">
    <h1>🏥 Suda Patient Record - API Documentation</h1>
    <p style="text-align:center;color:#666;margin-bottom:30px">Suda Clinic Management System v1.0.0</p>
    
    <div style="background:white;border-radius:12px;padding:20px;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <h2>📋 Quick Start</h2>
        <ol style="padding-right:20px">
            <li>Register: <code>POST /api/auth/register</code></li>
            <li>Login: <code>POST /api/auth/login</code></li>
            <li>Add Patient: <code>POST /api/patients</code></li>
            <li>List Patients: <code>GET /api/patients</code></li>
        </ol>
        <p style="margin-top:10px"><strong>Test Account:</strong> <span class="badge">admin</span> <span class="badge">admin123</span></p>
    </div>

    <h2>🔐 Authentication</h2>
    <div class="endpoint">
        <span class="method post">POST</span> <span class="path">/api/auth/register</span>
        <p class="desc">تسجيل حساب جديد</p>
        <div class="method-req">{
  "name": "Dr. Ahmed",
  "email": "ahmed@clinic.com",
  "phone": "+966501234567",
  "clinic": "Suda Clinic",
  "username": "ahmed",
  "password": "123456",
  "specialty": "طب عام"
}</div>
    </div>
    <div class="endpoint">
        <span class="method post">POST</span> <span class="path">/api/auth/login</span>
        <p class="desc">تسجيل الدخول</p>
        <div class="method-req">{
  "username": "admin",
  "password": "admin123"
}</div>
    </div>

    <h2>👥 Patients</h2>
    <div class="endpoint">
        <span class="method get">GET</span> <span class="path">/api/patients</span>
        <p class="desc">قائمة جميع المرضى</p>
    </div>
    <div class="endpoint">
        <span class="method get">GET</span> <span class="path">/api/patients/{id}</span>
        <p class="desc">تفاصيل مريض محدد</p>
    </div>
    <div class="endpoint">
        <span class="method post">POST</span> <span class="path">/api/patients</span>
        <p class="desc">إضافة مريض جديد</p>
        <div class="method-req">{
  "name": "محمد أحمد",
  "age": 35,
  "gender": "ذكر",
  "phone": "+966501234567",
  "address": "الرياض",
  "bloodType": "O+",
  "occupation": "مهندس",
  "emergency": "+966509876543",
  "hpi": "ألم في أسفل البطن منذ 3 أيام",
  "pmh": ["سكري", "ضغط دم"],
  "chronicMeds": "ميتفورمين 500mg مرتين يومياً",
  "records": [{
    "date": "2026-06-13",
    "chiefComplaint": "ألم أسفل البطن",
    "investigations": "CBC: Normal",
    "primaryDx": "التهاب مسالك بولية",
    "medications": "Ciprofloxacin 500mg BID x 7 days"
  }]
}</div>
    </div>
    <div class="endpoint">
        <span class="method put">PUT</span> <span class="path">/api/patients/{id}</span>
        <p class="desc">تحديث بيانات المريض</p>
    </div>
    <div class="endpoint">
        <span class="method delete">DELETE</span> <span class="path">/api/patients/{id}</span>
        <p class="desc">حذف المريض</p>
    </div>
    <div class="endpoint">
        <span class="method get">GET</span> <span class="path">/api/patients/search/{query}</span>
        <p class="desc">بحث عن مريض بالاسم أو الهاتف أو العنوان</p>
    </div>

    <h2>🏥 Clinics</h2>
    <div class="endpoint">
        <span class="method get">GET</span> <span class="path">/api/clinics</span>
        <p class="desc">قائمة العيادات</p>
    </div>
    <div class="endpoint">
        <span class="method post">POST</span> <span class="path">/api/clinics</span>
        <p class="desc">إضافة عيادة</p>
        <div class="method-req">{
  "date": "2026-06-13",
  "place": "Suda Clinic",
  "patients": [
    {"name": "محمد", "age": 35, "gender": "ذكر"}
  ]
}</div>
    </div>
    <div class="endpoint">
        <span class="method delete">DELETE</span> <span class="path">/api/clinics/{id}</span>
        <p class="desc">حذف عيادة</p>
    </div>

    <h2>🩺 Surgeries</h2>
    <div class="endpoint">
        <span class="method get">GET</span> <span class="path">/api/surgeries</span>
        <p class="desc">قائمة العمليات</p>
    </div>
    <div class="endpoint">
        <span class="method post">POST</span> <span class="path">/api/surgeries</span>
        <p class="desc">إضافة عملية</p>
        <div class="method-req">{
  "date": "2026-06-13",
  "patients": [
    {"name": "أحمد", "procedure": "استئ appendStringAppendix", "phone": "+966501234567"}
  ]
}</div>
    </div>
    <div class="endpoint">
        <span class="method delete">DELETE</span> <span class="path">/api/surgeries/{id}</span>
        <p class="desc">حذف عملية</p>
    </div>

    <h2>📊 Statistics</h2>
    <div class="endpoint">
        <span class="method get">GET</span> <span class="path">/api/stats</span>
        <p class="desc">إحصائيات النظام</p>
        <div class="method-req">Response:
{
  "total": 10,
  "avgAge": 32.5,
  "male": 6,
  "female": 4,
  "topDiseases": [{"name": "سكري", "count": 3}],
  "topExams": [{"name": "CBC", "count": 8}]
}</div>
    </div>

    <h2>📱 App Details</h2>
    <div class="endpoint">
        <span class="method get">GET</span> <span class="path">/api/app-details</span>
        <p class="desc">تفاصيل التطبيق والميزات والتقنيات</p>
    </div>
    <div class="endpoint">
        <span class="method get">GET</span> <span class="path">/api/docs</span>
        <p class="desc">توثيق API هذا</p>
    </div>

    <h2>🔗 Quick Links</h2>
    <ul style="list-style:none;padding:0">
        <li style="margin:8px 0"><a href="/api/app-details" target="_blank">📱 App Details</a></li>
        <li style="margin:8px 0"><a href="/api/patients" target="_blank">👥 All Patients</a></li>
        <li style="margin:8px 0"><a href="/api/stats" target="_blank">📊 Statistics</a></li>
        <li style="margin:8px 0"><a href="/api/clinics" target="_blank">🏥 Clinics</a></li>
        <li style="margin:8px 0"><a href="/api/surgeries" target="_blank">🩺 Surgeries</a></li>
    </ul>

    <h2>🛠️ Tech Stack</h2>
    <ul style="padding-right:20px">
        <li><strong>Frontend:</strong> React + Vite + React Router</li>
        <li><strong>Backend:</strong> FastAPI (Python)</li>
        <li><strong>Database:</strong> SQLite</li>
        <li><strong>UI:</strong> RTL Arabic Interface</li>
    </ul>

    <p style="text-align:center;margin:30px 0;color:#999">Suda Patient Record System v1.0.0 © 2026</p>
</div>
</body>
</html>
""")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
