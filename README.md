# Suda Patient Record

نظام إدارة سجلات المرضى - طب عام

## الميزات

- تسجيل وتعديل بيانات المرضى
- التاريخ المرضي الشامل (PMH, FH, Drug History, ROS)
- تحليل SOCRATES للشكوى
- الكشف السريري
- الفحوصات المخبرية والأشعة
- الوصفات الطبية
- إدارة العيادات والعمليات
- إحصائيات وتقارير
- واجهة عربية كاملة

## التقنيات

- **Backend:** FastAPI + SQLite
- **Frontend:** React + Vite
- **Design:** CSS Custom Properties + Visual Branding

## التشغيل

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## البناء للإنتاج

```bash
cd frontend
npm run build
```

## النشر على Netlify

1. أنشئ مستودع على GitHub
2. ارفع الكود
3. اربط المستودع بـ Netlify
4. أعدّ الإعدادات:
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`

## الرخصة

MIT
