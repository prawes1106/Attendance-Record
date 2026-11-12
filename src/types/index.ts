export type AttendanceSymbol = '/' | 'ศ' | 'ป' | 'ก' | 'ค' | 'อ' | 'พ' | 'ร' | 'ส' | 'ข' | 'ห';

export interface SymbolDefinition {
  symbol: AttendanceSymbol;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
  isLeave: boolean;
}

export type DepartmentGroup = 
  | 'ข้าราชการ+ลูกจ้าง'
  | 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ'
  | 'อาจารย์';

export type PositionType =
  | 'พนักงานมหาวิทยาลัย'
  | 'พนักงานมหาวิทยาลัย (เปลี่ยนสถานภาพ)'
  | 'พนักงานมหาวิทยาลัย(เปลี่ยนสถานภาพ)'
  | 'งานมหาวิทยาลัย(เปลี่ยสถานภาพ)'
  | 'งานมหาวิทยาลัย(เปลี่ยนสถานภาพ)'
  | 'พนักงานมหาวิทยาลัยเงินรายได้'
  | 'พนักงานมหาวิทยาลัยเงินงบประมาณ'
  | 'ลูกจ้างประจำ'
  | 'ข้าราชการ'
  | 'ข้าราชการพลเรือนในสถาบันอุดมศึกษา'
  | 'พนักงานราชการ'
  | 'อาจารย์'
  | 'ผู้ช่วยศาสตราจารย์'
  | 'รองศาสตราจารย์'
  | 'ศาสตราจารย์';

export const POSITIONS_BY_GROUP: Record<DepartmentGroup, PositionType[]> = {
  'ข้าราชการ+ลูกจ้าง': [
    'ลูกจ้างประจำ',
    'พนักงานมหาวิทยาลัยเงินงบประมาณ',
    'พนักงานมหาวิทยาลัย (เปลี่ยนสถานภาพ)',
    
  ],
  'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ': [
    'พนักงานมหาวิทยาลัยเงินรายได้',
    
  ],
  'อาจารย์': [
    'พนักงานมหาวิทยาลัย',
    'พนักงานมหาวิทยาลัย (เปลี่ยนสถานภาพ)',
    'ข้าราชการ',
    
   
  ]
};

export interface UserPersonnel {
  id: string;
  employeeCode?: string; // รหัสบุคลากร (ไม่บังคับ/นำออกจากตารางแสดงผล)
  citizenId?: string; // เลขประจำตัวประชาชน (นำออกจากฟอร์มเพิ่มบุคลากร)
  title: string;
  firstName: string;
  lastName: string;
  departmentGroup: DepartmentGroup;
  position: PositionType;
  academicRank?: string; // e.g. ผศ., รศ., ศ., อาจารย์
  accumulatedLeaveDays: number; // วันลาพักผ่อนสะสมยกมา
  yearlyQuotaDays: number; // สิทธิ์วันลาพักผ่อนปีนี้ (เช่น 10 วัน)
  totalLeaveEntitled: number; // รวมสิทธิ์วันลาพักผ่อน (สะสม + ปีนี้)
  usedLeaveDays: number; // วันลาพักผ่อนที่ใช้ไปแล้วในปีงบประมาณนี้
  phone: string;
  email: string;
  avatarUrl?: string;
  startDate: string; // วันที่เริ่มปฏิบัติราชการ
  status: 'active' | 'inactive';
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  symbol: AttendanceSymbol;
  checkInTime?: string; // e.g. 08:24
  checkOutTime?: string; // e.g. 16:35
  isLate?: boolean;
  note?: string;
  recordedBy?: string; // บันทึกโดยใคร
  updatedAt: string;
}

export interface SystemSettings {
  agencyName: string; // ชื่อหน่วยงาน/คณะ เช่น คณะเกษตร มหาวิทยาลัยเกษตรศาสตร์
  departmentSubName: string; // หน่วยงานย่อย เช่น ภาควิชากีฏวิทยา / สำนักงานเลขานุการ
  responsibleOfficerName: string; // เจ้าหน้าที่หน่วยงานที่รับผิดชอบ
  responsibleOfficerPosition: string; // ตำแหน่งเจ้าหน้าที่
  responsibleOfficerPhone: string; // เบอร์โทร
  supervisorName: string; // ผู้บังคับบัญชาชั้นต้น
  supervisorPosition: string; // ตำแหน่งผู้บังคับบัญชาชั้นต้น
  signatureNote: string; // ข้อความรับรอง
  logoType: 'garuda' | 'university' | 'custom';
  customLogoUrl?: string;
  workStartTime: string; // "08:30"
  workEndTime: string; // "16:30"
  lateGraceMinutes: number; // 08:31 เป็นต้นไป
  currentFiscalYear: number; // พ.ศ. เช่น 2568 หรือ 2569
}

export interface FiscalYearInfo {
  yearBE: number; // เช่น 2568
  yearCE: number; // เช่น 2025
  startDate: string; // "2024-10-01"
  endDate: string; // "2025-09-30"
}
