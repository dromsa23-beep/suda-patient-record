from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: str
    phone: str
    clinic: str = ""
    username: str
    password: str
    specialty: str = ""


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str = ""
    name: str
    email: str
    phone: str
    clinic: str = ""
    username: str
    specialty: str = ""


class PatientRecord(BaseModel):
    date: str = ""
    chiefComplaint: str = ""
    site: str = ""
    onset: str = ""
    character: str = ""
    radiation: str = ""
    associated: str = ""
    timing: str = ""
    exacerbating: str = ""
    severity: str = ""
    pmh: List[str] = []
    fh: List[str] = []
    smoking: str = ""
    packYears: str = ""
    ros: str = ""
    bp: str = ""
    hr: str = ""
    rr: str = ""
    temp: str = ""
    spo2: str = ""
    weight: str = ""
    bloodGlucose: str = ""
    gcs: str = ""
    cvs: str = ""
    resp: str = ""
    abd: str = ""
    investigations: str = ""
    differential: str = ""
    primaryDx: str = ""
    management: str = ""
    medications: str = ""
    allergies: str = ""
    doctorName: str = ""
    doctorTitle: str = ""
    regNo: str = ""


class Exam(BaseModel):
    name: str
    result: str = ""
    normalRange: str = ""


class Disease(BaseModel):
    name: str
    date: str = ""
    status: str = "نشط"


class Investigation(BaseModel):
    name: str
    result: str = ""


class GeneralAppearance(BaseModel):
    well: bool = False
    unwell: bool = False
    distressed: bool = False
    pale: bool = False
    jaundiced: bool = False
    cyanosedCentral: bool = False
    cyanosedPeripheral: bool = False
    oedematous: bool = False
    wasted: bool = False
    obese: bool = False
    comfortable: bool = False
    inPain: bool = False
    clubbing: bool = False
    koilonychia: bool = False
    leukonychia: bool = False
    palmarErythema: bool = False


class PatientCreate(BaseModel):
    name: str
    age: int = 0
    gender: str = ""
    phone: str = ""
    address: str = ""
    bloodType: str = ""
    occupation: str = ""
    emergency: str = ""
    notes: str = ""
    hpi: str = ""
    pmh: List[str] = []
    fh: List[str] = []
    ros: List[dict] = []
    chronicMeds: str = ""
    drugAllergies: str = ""
    socialHistory: str = ""
    surgicalHistory: str = ""
    generalAppearance: Optional[GeneralAppearance] = None
    examCardio: str = ""
    examChest: str = ""
    examAbdomen: str = ""
    examCNS: str = ""
    examMSK: str = ""
    records: List[dict] = []
    exams: List[Exam] = []
    diseases: List[Disease] = []
    investigations: List[Investigation] = []


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bloodType: Optional[str] = None
    occupation: Optional[str] = None
    emergency: Optional[str] = None
    notes: Optional[str] = None
    hpi: Optional[str] = None
    pmh: Optional[List[str]] = None
    fh: Optional[List[str]] = None
    ros: Optional[List[dict]] = None
    chronicMeds: Optional[str] = None
    drugAllergies: Optional[str] = None
    socialHistory: Optional[str] = None
    surgicalHistory: Optional[str] = None
    generalAppearance: Optional[GeneralAppearance] = None
    examCardio: Optional[str] = None
    examChest: Optional[str] = None
    examAbdomen: Optional[str] = None
    examCNS: Optional[str] = None
    examMSK: Optional[str] = None
    records: Optional[List[dict]] = None
    exams: Optional[List[Exam]] = None
    diseases: Optional[List[Disease]] = None
    investigations: Optional[List[Investigation]] = None


class ClinicDay(BaseModel):
    date: str
    place: str = "العيادة"
    patients: List[dict] = []


class SurgeryDay(BaseModel):
    date: str
    patients: List[dict] = []
