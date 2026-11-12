import { AttendanceSymbol, SymbolDefinition } from '../types';

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_DAYS_FULL = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

export const THAI_DAYS_SHORT = [
  'อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'
];

export const ATTENDANCE_SYMBOLS: Record<AttendanceSymbol, SymbolDefinition> = {
  '/': {
    symbol: '/',
    name: 'มาทำงาน',
    description: 'มาปฏิบัติราชการตามเวลาปกติ',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    isLeave: false
  },
  'ศ': {
    symbol: 'ศ',
    name: 'ศึกษาต่อ',
    description: 'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    isLeave: true
  },
  'ป': {
    symbol: 'ป',
    name: 'ลาป่วย',
    description: 'ลาป่วยตามระเบียบการลาของทางราชการ',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    isLeave: true
  },
  'ก': {
    symbol: 'ก',
    name: 'ลากิจ',
    description: 'ลากิจส่วนตัวตามความจำเป็น',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    isLeave: true
  },
  'ค': {
    symbol: 'ค',
    name: 'ลาคลอด',
    description: 'ลาคลอดบุตรตามระเบียบ',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-300',
    isLeave: true
  },
  'อ': {
    symbol: 'อ',
    name: 'ลาอุปสมบท',
    description: 'ลาอุปสมบท หรือลาไปประกอบพิธีฮัจย์',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    isLeave: true
  },
  'พ': {
    symbol: 'พ',
    name: 'ลาพักร้อน',
    description: 'ลาพักผ่อนประจำปีงบประมาณ',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    isLeave: true
  },
  'ร': {
    symbol: 'ร',
    name: 'ราชการ',
    description: 'ไปปฏิบัติราชการภายนอก / ประชุม สัมมนา',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    isLeave: false
  },
  'ส': {
    symbol: 'ส',
    name: 'มาสาย',
    description: 'มาปฏิบัติราชการหลังเวลาที่กำหนด (หลัง 08:30 น.)',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    isLeave: false
  },
  'ข': {
    symbol: 'ข',
    name: 'ขาดงาน',
    description: 'ไม่มาปฏิบัติราชการโดยมิได้ขอลาตามระเบียบ',
    color: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    badgeClass: 'bg-red-200 text-red-900 border-red-400 font-bold',
    isLeave: false
  },
  'ห': {
    symbol: 'ห',
    name: 'วันหยุด',
    description: 'วันหยุดราชการ / วันหยุดนักขัตฤกษ์',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    badgeClass: 'bg-red-100 text-red-700 border-red-300 font-bold',
    isLeave: false
  }
};

/**
 * คำนวณปีงบประมาณ พ.ศ. จากวันที่ที่กำหนด
 * การนับเวลาให้นับตามปีงบประมาณ โดยเริ่มจาก 1 ตุลาคม พ.ศ. ก่อนหน้า ถึง วันที่ 30 กันยายน พ.ศ. ปัจจุบัน
 */
export function getFiscalYear(dateInput: Date | string): number {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const month = d.getMonth() + 1; // 1-12
  const ceYear = d.getFullYear();
  const beYear = ceYear + 543;

  // ถ้าเดือนเป็น ตุลาคม (10), พฤศจิกายน (11), ธันวาคม (12) จะนับเป็นปีงบประมาณของ พ.ศ. ถัดไป
  if (month >= 10) {
    return beYear + 1;
  }
  return beYear;
}

/**
 * คำนวณช่วงวันที่ของปีงบประมาณ
 * เช่น ปี 2568 (CE 2025) -> เริ่ม 2024-10-01 ถึง 2025-09-30
 */
export function getFiscalYearRange(fiscalYearBE: number): {
  startCE: string;
  endCE: string;
  startBEText: string;
  endBEText: string;
} {
  const ceYear = fiscalYearBE - 543;
  const prevCeYear = ceYear - 1;
  return {
    startCE: `${prevCeYear}-10-01`,
    endCE: `${ceYear}-09-30`,
    startBEText: `1 ตุลาคม พ.ศ. ${fiscalYearBE - 1}`,
    endBEText: `30 กันยายน พ.ศ. ${fiscalYearBE}`
  };
}

/**
 * แปลงวันที่เป็นข้อความภาษาไทย เช่น "วันพฤหัสบดีที่ 5 พฤศจิกายน พ.ศ. 2569"
 */
export function formatThaiDate(dateInput: Date | string, format: 'full' | 'medium' | 'short' = 'medium'): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const dayName = THAI_DAYS_FULL[d.getDay()];
  const day = d.getDate();
  const monthIndex = d.getMonth();
  const beYear = d.getFullYear() + 543;

  if (format === 'full') {
    return `${dayName}ที่ ${day} ${THAI_MONTHS_FULL[monthIndex]} พ.ศ. ${beYear}`;
  } else if (format === 'short') {
    return `${day} ${THAI_MONTHS_SHORT[monthIndex]} ${beYear.toString().slice(-2)}`;
  }
  return `${day} ${THAI_MONTHS_FULL[monthIndex]} พ.ศ. ${beYear}`;
}

/**
 * รูปแบบ เดือน พ.ศ. เช่น "พฤศจิกายน พ.ศ. 2569"
 */
export function formatThaiMonthYear(yearCE: number, monthIndex: number): string {
  const beYear = yearCE + 543;
  return `${THAI_MONTHS_FULL[monthIndex]} พ.ศ. ${beYear}`;
}

/**
 * เช็คว่าเป็นวันหยุดเสาร์-อาทิตย์ หรือไม่
 */
export function isWeekend(dateInput: Date | string): boolean {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = d.getDay();
  return day === 0 || day === 6; // 0=Sunday, 6=Saturday
}

/**
 * ดึงจำนวนวันทั้งหมดในเดือนที่กำหนด
 */
export function getDaysInMonth(yearCE: number, monthIndex: number): number {
  return new Date(yearCE, monthIndex + 1, 0).getDate();
}

/**
 * คืนค่า YYYY-MM-DD
 */
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
