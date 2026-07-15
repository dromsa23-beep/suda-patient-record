export const emptyPatient = {
  name: '', age: 0, gender: '', phone: '', address: '', bloodType: '', occupation: '', emergency: '', notes: '',
  hpi: '', pmh: [], fh: [], ros: {}, chronicMeds: '', drugAllergies: '', socialHistory: '', surgicalHistory: '',
  generalAppearance: null, examCardio: '', examChest: '', examAbdomen: '', examCNS: '', examMSK: '',
  records: [], exams: [], diseases: [], investigations: []
}

export const specialtyList = [
  "طب عام", "طب الأسرة", "طب الأطفال", "طب القلب", "طب الكلى", "طب الكبد", "طب الجهاز الهضمي",
  "طب الغدد الصماء", "طب الرئة", "طب المفاصل والروماتيزم", "طب الأم والولادة", "طب العيون",
  "طب الأذن والأنف والحنجرة", "طب الجلدية", "طب الأعصاب", "طب النفسية", "طب الأسنان",
  "طب العلاج الطبيعي", "طب الطوارئ", "طب التخدير", "طب الأشعة", "طب المختبرات", "طب الباطنية",
  "طب الجراحة العامة", "طب جراحة القلب", "طب جراحة العظام", "طب جراحة المسالك البولية",
  "طب جراحة التجميل", "طب القلب التداخلي", "طب الأورام", "طب الغدد الدرقية", "طب السكري",
  "طب الدم", "طب الحساسية", "طب المناعة", "طب الوراثة", "طب التغذية", "طب العقم"
]

export const pmhOptions = [
  "سكري", "ضغط دم", "أمراض قلب", "فشل قلب", "ربو", "سل", "التهاب كبدي", "فشل كلوي", "نقرس",
  "Lupus", "SLE", "التهاب مفاصل", "التهاب أمعاء", "احتشاء سابق", "سكتة دماغية", "وذمة",
  "فقر الدم", "نقص فيتامين د", "نقص فيتامين b12", "التهاب مسالك بولية", "حصوات كلى",
  "التهاب جيوب أنفية", "حساسية", "صداع نصفي", "صرع", "اكتئاب", "قلق", "أرق", "انسداد تنفسي نوم"
]

export const fhOptions = [
  "سكري", "ضغط دم", "أمراض قلب", "سكتة دماغية", "سرطان", "ربو", "Alzheimer", "Parkinson",
  "Lupus", "Huntington", "فقر الدم المنجلي", "نقص التخثر"
]

export const rosSystemOptions = {
  eyes: ['Double vision', 'Eye pain', 'Redness', 'Blurred vision', 'Tearing', 'Itching'],
  ears: ['Tinnitus', 'Hearing loss', 'Ear pain', 'Dizziness', 'Congestion'],
  nose: ['Congestion', 'Runny nose', 'Allergy', 'Nosebleed', 'Loss of smell'],
  throat: ['Throat inflammation', 'Difficulty swallowing', 'Mouth pain', 'Gum bleeding'],
  respiratory: ['Cough', 'Shortness of breath', 'Wheezing', 'Sputum', 'Blood in sputum'],
  cardiovascular: ['Chest pain', 'Palpitations', 'Leg swelling', 'Dizziness', 'Fatigue'],
  gi: ['Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Indigestion', 'Bloating', 'Heartburn', 'Blood in stool'],
  neuro: ['Headache', 'Dizziness', 'Numbness', 'Weakness', 'Seizures', 'Loss of consciousness'],
  msk: ['Joint pain', 'Joint stiffness', 'Swelling', 'Muscle pain'],
  haem: ['Bruising', 'Nosebleed', 'Anemia'],
  constitutional: ['Fever', 'Night sweats', 'Weight loss', 'Weight gain', 'Fatigue'],
  psych: ['Depression', 'Anxiety', 'Insomnia', 'Stress'],
  renal: ['Burning urination', 'Frequent urination', 'Blood in urine', 'Stones', 'Urinary incontinence'],
}

export const rosLabels = {
  eyes: '👁️ Eyes', ears: '👂 Ears', nose: '👃 Nose & Sinuses', throat: '🗣️ Throat & Mouth',
  respiratory: '🫁 Respiratory', cardiovascular: '❤️ Cardiovascular', gi: '🩻 Gastrointestinal',
  neuro: '🧠 Neurological', msk: '🦴 Musculoskeletal', haem: '🩸 Haematological',
  constitutional: '🌡️ Constitutional', psych: '🧠 Psychiatric', renal: '泌 Genitourinary'
}

export const imgLabels = {
  xray: '🩻 X-Ray', ultrasound: '🔊 Ultrasound', ct: '📡 CT Scan', mri: '🧲 MRI', otherImaging: '📋 Other Imaging'
}

export const sectionLabels = {
  personal: '👤 البيانات الشخصية (Personal Data)',
  chief: '🗣️ الشكوى الرئيسية (Chief Complaint)',
  socrates: '🔍 تحليل الشكوى (HPI)',
  ros: '🔬 مراجعة الأجهزة (Systemic Review)',
  pmh: '📋 التاريخ المرضي (PMH)',
  drughistory: '💊 التاريخ الدوائي (Drug History)',
  fh: '👨‍👩‍👧‍👦 التاريخ العائلي (Family History)',
  exam: '🩻 الكشف السريري (Clinical Examination)',
  investigation: '🔬 الفحوصات (Investigation)',
  imaging: '📷 الأشعة (Imaging)',
  treatment: '💊 الوصفة الطبية (Prescription)'
}

export const defaultSectionOrder = [
  'personal', 'chief', 'socrates', 'ros', 'pmh', 'drughistory', 'fh', 'exam', 'investigation', 'imaging', 'treatment'
]

export const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export const genders = ['ذكر', 'أنثى']

export const socratesPlaceholder = `Site: محل الألم (مثال: أسفل البطن)
Onset: البداية (مثال: مفاجئ, منذ 3 أيام)
Character: الطابع (مثال: حاد, خانق)
Radiation: الانتشار (مثال: ينتشر للظهر)
Associated: المصاحبة (مثال: غثيان, حمى)
Timing: التوقيت (مثال: مستمر, صباحاً)
Exacerbating: المزيد (مثال: مع الحركة)
Severity: الشدة (1-10)`

export const imagingTypes = [
  { key: 'xray', label: '🩻 الأشعة السينية (X-Ray)' },
  { key: 'ultrasound', label: '🔊 الموجات فوق الصوتية (Ultrasound)' },
  { key: 'ct', label: '📡 التصوير المقطعي (CT Scan)' },
  { key: 'mri', label: '🧲 الرنين المغناطيسي (MRI)' },
  { key: 'otherImaging', label: '📋 أشعة أخرى (ECG, Echo...)' }
]

export const detailTabs = [
  { k: 'history', l: '📋 التاريخ المرضي' },
  { k: 'exam', l: '🩻 الكشف' },
  { k: 'investigations', l: '🔬 الفحوصات' },
  { k: 'imaging', l: '📷 الأشعة' },
  { k: 'treatments', l: '💊 العلاجات' }
]

export const navItems = [
  { path: '/', icon: '🏠', label: 'الرئيسية' },
  { path: '/search', icon: '🔍', label: 'بحث' },
  { path: '/add', icon: '➕', label: 'إضافة' },
  { path: '/surgery', icon: '🩺', label: 'عمليات' },
  { path: '/clinic', icon: '🏥', label: 'عيادة' },
  { path: '/stats', icon: '📊', label: 'إحصائيات' }
]