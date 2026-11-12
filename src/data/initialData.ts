import { UserPersonnel, AttendanceRecord, SystemSettings } from '../types';
import { toISODate } from '../utils/thaiDate';

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  agencyName: 'คณะวิศวกรรมศาสตร์',
  departmentSubName: 'ภาควิชาวิศวกรรมเครื่องกล',
  responsibleOfficerName: 'นางสุภาวดี เกษมพุก',
  responsibleOfficerPosition: 'นักทรัพยากรบุคคลชำนาญการ',
  responsibleOfficerPhone: '02-561-1234 ต่อ 1402',
  supervisorName: 'ผศ ดร.อรรถพร วิเศษสินธฺ์',
  supervisorPosition: 'หัวหน้าภาควิชาวิศวกรรมเครื่องกล',
  signatureNote: 'ขอรับรองว่าการลงเวลาปฏิบัติราชการและสรุปวันลาเป็นความจริงทุกประการ',
  logoType: 'garuda',
  customLogoUrl: '',
  workStartTime: '08:30',
  workEndTime: '16:30',
  lateGraceMinutes: 1, // หลัง 08:30 ถือว่าสาย
  currentFiscalYear: 2568 // ปีงบประมาณ 2568 (1 ต.ค. 2567 - 30 ก.ย. 2568)
};

export const INITIAL_USERS: UserPersonnel[] = [
  // 1. ลูกจ้างประจำ
  {
    id: 'u_sn',
    title: 'นาย',
    firstName: 'สุนัน',
    lastName: 'ภิณโทแก้ว',
    departmentGroup: 'ข้าราชการ+ลูกจ้าง',
    position: 'ลูกจ้างประจำ',
    accumulatedLeaveDays: 10,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 20,
    usedLeaveDays: 0,
    phone: '081-112-2334',
    email: 'sunan.p@ku.ac.th',
    startDate: '2012-04-01',
    status: 'active'
  },
  {
    id: 'u_sw',
    title: 'นาย',
    firstName: 'สุวัตร',
    lastName: 'เกษมพุก',
    departmentGroup: 'ข้าราชการ+ลูกจ้าง',
    position: 'ลูกจ้างประจำ',
    accumulatedLeaveDays: 8,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 18,
    usedLeaveDays: 0,
    phone: '082-223-3445',
    email: 'suwat.k@ku.ac.th',
    startDate: '2014-06-15',
    status: 'active'
  },

  // 2. พนักงานมหาวิทยาลัยเงินงบประมาณ
  {
    id: 'u_pp',
    title: 'นาย',
    firstName: 'ประพัทริ์',
    lastName: 'คุ้มปลีวงศ์',
    departmentGroup: 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    position: 'พนักงานมหาวิทยาลัยเงินงบประมาณ',
    accumulatedLeaveDays: 12,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 22,
    usedLeaveDays: 0,
    phone: '083-334-4556',
    email: 'prapat.k@ku.ac.th',
    startDate: '2016-02-01',
    status: 'active'
  },
  {
    id: 'u_st',
    title: 'นาย',
    firstName: 'สุธีร์',
    lastName: 'คตดี',
    departmentGroup: 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    position: 'พนักงานมหาวิทยาลัยเงินงบประมาณ',
    accumulatedLeaveDays: 6,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 16,
    usedLeaveDays: 0,
    phone: '084-445-5667',
    email: 'suthee.k@ku.ac.th',
    startDate: '2018-09-01',
    status: 'active'
  },
  {
    id: 'u_ps',
    title: 'นาย',
    firstName: 'พงษ์ศักดิ์',
    lastName: 'รุจิพิช',
    departmentGroup: 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    position: 'พนักงานมหาวิทยาลัยเงินงบประมาณ',
    accumulatedLeaveDays: 15,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 25,
    usedLeaveDays: 0,
    phone: '085-556-6778',
    email: 'pongsak.r@ku.ac.th',
    startDate: '2015-11-16',
    status: 'active'
  },
  {
    id: 'u_lt',
    title: 'นาย',
    firstName: 'เลิศ',
    lastName: 'ทองเจือ',
    departmentGroup: 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    position: 'พนักงานมหาวิทยาลัยเงินงบประมาณ',
    accumulatedLeaveDays: 14,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 24,
    usedLeaveDays: 0,
    phone: '086-667-7889',
    email: 'lert.t@ku.ac.th',
    startDate: '2017-03-01',
    status: 'active'
  },
  {
    id: 'u_mr',
    title: 'นาย',
    firstName: 'มารุศ',
    lastName: 'ชาวไร่',
    departmentGroup: 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    position: 'พนักงานมหาวิทยาลัยเงินงบประมาณ',
    accumulatedLeaveDays: 5,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 15,
    usedLeaveDays: 0,
    phone: '087-778-8990',
    email: 'marut.c@ku.ac.th',
    startDate: '2020-01-15',
    status: 'active'
  },

  // 3. งานมหาวิทยาลัย(เปลี่ยสถานภาพ)
  {
    id: 'u_ws',
    title: 'นาย',
    firstName: 'วสรรค์',
    lastName: 'ใจซื่อกุล',
    departmentGroup: 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    position: 'งานมหาวิทยาลัย(เปลี่ยสถานภาพ)',
    accumulatedLeaveDays: 10,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 20,
    usedLeaveDays: 0,
    phone: '088-889-9001',
    email: 'wasan.j@ku.ac.th',
    startDate: '2019-05-01',
    status: 'active'
  },
  {
    id: 'u_ac',
    title: 'นาย',
    firstName: 'อนุชา',
    lastName: 'พิสุทธิพงษ์บูรณ์',
    departmentGroup: 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    position: 'งานมหาวิทยาลัย(เปลี่ยสถานภาพ)',
    accumulatedLeaveDays: 9,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 19,
    usedLeaveDays: 0,
    phone: '089-990-0112',
    email: 'anucha.p@ku.ac.th',
    startDate: '2021-02-15',
    status: 'active'
  },
  {
    id: 'u_sm',
    title: 'นาย',
    firstName: 'สุเมธ',
    lastName: 'เชื้อสุดใจ',
    departmentGroup: 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    position: 'งานมหาวิทยาลัย(เปลี่ยสถานภาพ)',
    accumulatedLeaveDays: 7,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 17,
    usedLeaveDays: 0,
    phone: '080-001-1223',
    email: 'sumeth.c@ku.ac.th',
    startDate: '2022-07-01',
    status: 'active'
  },

  // 4. กลุ่มอาจารย์
  {
    id: 'u001',
    title: 'ผศ.ดร.',
    firstName: 'ธีรเดช',
    lastName: 'จินดารัตน์',
    departmentGroup: 'อาจารย์',
    position: 'ผู้ช่วยศาสตราจารย์',
    academicRank: 'ผู้ช่วยศาสตราจารย์',
    accumulatedLeaveDays: 8,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 18,
    usedLeaveDays: 2,
    phone: '081-445-8921',
    email: 'teeradej.j@ku.ac.th',
    startDate: '2018-06-01',
    status: 'active'
  },
  {
    id: 'u002',
    title: 'อ.ดร.',
    firstName: 'นันทนา',
    lastName: 'พงษ์สุวรรณ',
    departmentGroup: 'อาจารย์',
    position: 'อาจารย์',
    academicRank: 'อาจารย์',
    accumulatedLeaveDays: 5,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 15,
    usedLeaveDays: 0,
    phone: '089-123-4567',
    email: 'nantana.p@ku.ac.th',
    startDate: '2020-08-16',
    status: 'active'
  }
];

// Helper to generate seed attendance records for the current month and week
export function generateSeedAttendance(users: UserPersonnel[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // สร้างบันทึกย้อนหลัง 15 วันทำการในเดือนปัจจุบัน เพื่อให้เห็นตัวอย่างสัญลักษณ์ต่าง ๆ
  for (let day = 1; day <= today.getDate(); day++) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // ข้ามเสาร์-อาทิตย์

    const dateStr = toISODate(d);

    users.forEach((user, index) => {
      // กระจายสถานะเพื่อแสดงตัวอย่างสัญลักษณ์ตามระเบียบราชการ
      let symbol: AttendanceRecord['symbol'] = '/';
      let checkInTime: string | undefined = '08:15';
      let checkOutTime: string | undefined = '16:35';
      let isLate = false;
      let note = '';

      if (day === 4) {
        // วันหยุดราชการตามภาพตัวอย่าง: วันเข้าพรรษา (รวมช่องแนวตั้งทุกแถว)
        symbol = 'ห';
        checkInTime = undefined;
        checkOutTime = undefined;
        note = 'วันเข้าพรรษา';
      } else if (user.id === 'u008') {
        // อาจารย์เอกชัย ลาศึกษาต่อ ปริญญาเอก
        symbol = 'ศ';
        checkInTime = undefined;
        checkOutTime = undefined;
        note = 'ศึกษาต่อระดับปริญญาเอก มหาวิทยาลัยโตเกียว';
      } else if (user.id === 'u004' && day === 3) {
        symbol = 'ป';
        checkInTime = undefined;
        checkOutTime = undefined;
        note = 'ไข้หวัดใหญ่ มีใบรับรองแพทย์';
      } else if (user.id === 'u003' && day === 2) {
        symbol = 'ก';
        checkInTime = undefined;
        checkOutTime = undefined;
        note = 'ติดต่อราชการที่ว่าการอำเภอ';
      } else if (user.id === 'u001' && day === 5) {
        symbol = 'ร';
        checkInTime = '08:00';
        checkOutTime = '17:00';
        note = 'ไปราชการตรวจประเมินคุณภาพการศึกษา ม.เชียงใหม่';
      } else if (user.id === 'u006' && day === 1) {
        symbol = 'พ';
        checkInTime = undefined;
        checkOutTime = undefined;
        note = 'ลาพักผ่อนประจำปี';
      } else if (user.id === 'u005' && day === 4) {
        symbol = 'ส';
        checkInTime = '08:42';
        checkOutTime = '16:30';
        isLate = true;
        note = 'การจราจรติดขัดเนื่องจากฝนตกหนัก';
      } else {
        // วันปกติ มาทำงาน
        symbol = '/';
        const randomMinute = 15 + (index * 2);
        checkInTime = `08:${String(randomMinute).padStart(2, '0')}`;
        checkOutTime = '16:35';
      }

      records.push({
        id: `att_${user.id}_${dateStr}`,
        userId: user.id,
        date: dateStr,
        symbol,
        checkInTime,
        checkOutTime,
        isLate,
        note,
        recordedBy: 'ระบบลงเวลาอัตโนมัติ',
        updatedAt: new Date().toISOString()
      });
    });
  }

  return records;
}
