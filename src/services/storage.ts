import Swal from 'sweetalert2';
import { UserPersonnel, AttendanceRecord, SystemSettings, AttendanceSymbol } from '../types';
import { INITIAL_SYSTEM_SETTINGS, INITIAL_USERS, generateSeedAttendance } from '../data/initialData';
import { toISODate, isWeekend } from '../utils/thaiDate';
import { getHolidaysForYear, getHolidaysForMonth } from '../data/thaiHolidays';

const STORAGE_KEY_SETTINGS = 'thai_gov_attendance_settings_v1';
const STORAGE_KEY_USERS = 'thai_gov_attendance_users_v1';
const STORAGE_KEY_LOGS = 'thai_gov_attendance_logs_v1';

export const storageService = {
  getSettings(): SystemSettings {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return INITIAL_SYSTEM_SETTINGS;
    try {
      return { ...INITIAL_SYSTEM_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return INITIAL_SYSTEM_SETTINGS;
    }
  },

  saveSettings(settings: SystemSettings): void {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  },

  getUsers(): UserPersonnel[] {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      this.saveUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    try {
      const parsed: any[] = JSON.parse(raw);
      // Migrate old department groups to the 3 groups
      const migrated = parsed.map(u => {
        let grp = u.departmentGroup;
        if (grp === 'พนักงานมหาวิทยาลัย' || grp === 'พนักงานเงินรายได้' || grp === 'พนักงานราชการ') {
          grp = 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ';
        }
        return { ...u, departmentGroup: grp } as UserPersonnel;
      });

      // If screenshot users (e.g. u_sn or งานมหาวิทยาลัย(เปลี่ยสถานภาพ)) are not yet present, merge them
      const hasScreenshotStaff = migrated.some(u => u.id === 'u_sn' || u.position === 'งานมหาวิทยาลัย(เปลี่ยสถานภาพ)');
      if (!hasScreenshotStaff) {
        const combined = [...INITIAL_USERS, ...migrated.filter(p => !INITIAL_USERS.some(iu => iu.id === p.id))];
        this.saveUsers(combined);
        return combined;
      }

      return migrated;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: UserPersonnel[]): void {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  },

  getAttendanceLogs(): AttendanceRecord[] {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) {
      const initialUsers = this.getUsers();
      const seedLogs = generateSeedAttendance(initialUsers).filter(l => !isWeekend(l.date));
      this.saveAttendanceLogs(seedLogs);
      return seedLogs;
    }
    try {
      const parsed: AttendanceRecord[] = JSON.parse(raw);
      // เสาร์-อาทิตย์ ไม่ต้องลงเวลา: กรองข้อมูลเสาร์-อาทิตย์ออก
      const valid = parsed.filter(l => l && l.date && !isWeekend(l.date));
      return valid;
    } catch {
      return [];
    }
  },

  saveAttendanceLogs(logs: AttendanceRecord[]): void {
    // เสาร์-อาทิตย์ ไม่ต้องลงเวลา: บันทึกเฉพาะวันทำการ
    const cleanLogs = logs.filter(l => l && l.date && !isWeekend(l.date));
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(cleanLogs));
  },

  /**
   * กำหนดหรือแก้ไขวันหยุดราชการสำหรับวันที่เลือก (บันทึก ห พร้อมชื่อวันหยุดให้กับบุคลากรทุกคน)
   */
  setPublicHoliday(dateStr: string, holidayName: string, userIds?: string[]): void {
    if (isWeekend(dateStr)) return;
    const logs = this.getAttendanceLogs();
    const allUsers = this.getUsers();
    const targetUserIds = userIds && userIds.length > 0 ? userIds : allUsers.map(u => u.id);
    const name = holidayName.trim() || 'วันหยุดราชการ';

    targetUserIds.forEach(userId => {
      const idx = logs.findIndex(l => l.userId === userId && l.date === dateStr);
      if (idx >= 0) {
        logs[idx].symbol = 'ห';
        logs[idx].note = name;
        logs[idx].checkInTime = undefined;
        logs[idx].checkOutTime = undefined;
        logs[idx].isLate = false;
        logs[idx].updatedAt = new Date().toISOString();
      } else {
        logs.push({
          id: `att_${userId}_${dateStr}`,
          userId,
          date: dateStr,
          symbol: 'ห',
          note: name,
          recordedBy: 'วันหยุดราชการ',
          updatedAt: new Date().toISOString()
        });
      }
    });
    this.saveAttendanceLogs(logs);
  },

  /**
   * ยกเลิก/ลบวันหยุดราชการสำหรับวันที่เลือก
   * @param dateStr วันที่ในรูปแบบ YYYY-MM-DD
   * @param revertToNormal หากเป็น true จะเปลี่ยนสัญลักษณ์กลับเป็น '/' (มาทำงานปกติ) สำหรับทุกคน หากเป็น false จะลบ record ทิ้ง
   */
  removePublicHoliday(dateStr: string, revertToNormal: boolean = true): void {
    const logs = this.getAttendanceLogs();
    const allUsers = this.getUsers();

    if (revertToNormal) {
      // เมื่อยกเลิกวันหยุด ให้เปลี่ยนกลับเป็นวันปฏิบัติงานปกติ (/) สำหรับบุคลากรทุกคน
      allUsers.forEach(u => {
        const idx = logs.findIndex(l => l.userId === u.id && l.date === dateStr);
        if (idx >= 0) {
          logs[idx].symbol = '/';
          logs[idx].note = undefined;
          logs[idx].updatedAt = new Date().toISOString();
        } else {
          logs.push({
            id: `att_${u.id}_${dateStr}`,
            userId: u.id,
            date: dateStr,
            symbol: '/',
            note: undefined,
            recordedBy: 'วันปฏิบัติงานปกติ',
            updatedAt: new Date().toISOString()
          });
        }
      });
      this.saveAttendanceLogs(logs);
    } else {
      const filtered = logs.filter(l => !(l.date === dateStr && l.symbol === 'ห'));
      this.saveAttendanceLogs(filtered);
    }
  },

  /**
   * ดึงและซิงก์วันหยุดราชการประจำปีอัตโนมัติสำหรับบุคลากรทุกคน
   * @param yearCE ปี ค.ศ.
   * @param userIds รายชื่อบุคลากร (หากไม่ระบุจะใช้บุคลากรทุกคน)
   * @param monthZeroIndexed หากระบุ จะซิงก์เฉพาะเดือนนั้น (0-11) ถ้าไม่ระบุจะซิงก์ทั้งปี
   */
  syncAnnualPublicHolidays(yearCE: number, userIds?: string[], monthZeroIndexed?: number): number {
    const logs = this.getAttendanceLogs();
    const allUsers = this.getUsers();
    const targetUserIds = userIds && userIds.length > 0 ? userIds : allUsers.map(u => u.id);
    const holidays = monthZeroIndexed !== undefined
      ? getHolidaysForMonth(yearCE, monthZeroIndexed)
      : getHolidaysForYear(yearCE);

    let count = 0;
    holidays.forEach(h => {
      if (isWeekend(h.date)) return;
      count++;
      targetUserIds.forEach(userId => {
        const idx = logs.findIndex(l => l.userId === userId && l.date === h.date);
        if (idx >= 0) {
          logs[idx].symbol = 'ห';
          logs[idx].note = h.name;
          logs[idx].checkInTime = undefined;
          logs[idx].checkOutTime = undefined;
          logs[idx].isLate = false;
          logs[idx].updatedAt = new Date().toISOString();
        } else {
          logs.push({
            id: `att_${userId}_${h.date}`,
            userId,
            date: h.date,
            symbol: 'ห',
            note: h.name,
            recordedBy: 'วันหยุดราชการประจำปี',
            updatedAt: new Date().toISOString()
          });
        }
      });
    });

    this.saveAttendanceLogs(logs);
    return count;
  },

  /**
   * บันทึกหรืออัปเดตการลงเวลาประจำวัน
   */
  updateAttendance(
    userId: string,
    dateStr: string,
    updates: Partial<Omit<AttendanceRecord, 'id' | 'userId' | 'date'>>
  ): AttendanceRecord | null {
    // เสาร์-อาทิตย์ ไม่ต้องลงเวลา
    if (isWeekend(dateStr)) {
      return null;
    }

    const logs = this.getAttendanceLogs();
    const existingIndex = logs.findIndex(l => l.userId === userId && l.date === dateStr);

    let updatedRecord: AttendanceRecord;
    if (existingIndex >= 0) {
      updatedRecord = {
        ...logs[existingIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      logs[existingIndex] = updatedRecord;
    } else {
      updatedRecord = {
        id: `att_${userId}_${dateStr}`,
        userId,
        date: dateStr,
        symbol: updates.symbol || '/',
        checkInTime: updates.checkInTime,
        checkOutTime: updates.checkOutTime,
        isLate: updates.isLate ?? false,
        note: updates.note || '',
        recordedBy: updates.recordedBy || 'เจ้าหน้าที่ลงเวลา',
        updatedAt: new Date().toISOString()
      };
      logs.push(updatedRecord);
    }

    this.saveAttendanceLogs(logs);
    return updatedRecord;
  },

  /**
   * บันทึกสถานะการลงเวลาหลายวันพร้อมกันสำหรับบุคลากร 1 ท่าน
   */
  updateAttendanceMultipleDays(
    userId: string,
    dateStrings: string[],
    symbol: AttendanceSymbol,
    note?: string
  ): void {
    const validDates = dateStrings.filter(d => !isWeekend(d));
    if (validDates.length === 0) return;

    const logs = this.getAttendanceLogs();
    validDates.forEach(dateStr => {
      const idx = logs.findIndex(l => l.userId === userId && l.date === dateStr);
      let checkIn = symbol === '/' ? '08:25' : (symbol === 'ส' ? '08:45' : undefined);
      let checkOut = (symbol === '/' || symbol === 'ส') ? '16:30' : undefined;
      let isLate = symbol === 'ส';

      if (idx >= 0) {
        logs[idx].symbol = symbol;
        logs[idx].checkInTime = checkIn;
        logs[idx].checkOutTime = checkOut;
        logs[idx].isLate = isLate;
        if (note) logs[idx].note = note;
        logs[idx].updatedAt = new Date().toISOString();
      } else {
        logs.push({
          id: `att_${userId}_${dateStr}`,
          userId,
          date: dateStr,
          symbol,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          isLate,
          note: note || '',
          recordedBy: 'ลงเวลาหลายวัน',
          updatedAt: new Date().toISOString()
        });
      }
    });
    this.saveAttendanceLogs(logs);
  },

  /**
   * ลบการลงเวลาสำหรับหลายวันที่เลือก
   */
  deleteAttendanceMultipleDays(userId: string, dateStrings: string[]): void {
    const logs = this.getAttendanceLogs();
    const dateSet = new Set(dateStrings);
    const filtered = logs.filter(l => !(l.userId === userId && dateSet.has(l.date)));
    this.saveAttendanceLogs(filtered);
  },

  /**
   * บันทึกมาทำงานทั้งหมดสำหรับวันที่เลือก
   */
  markAllPresent(dateStr: string, userIds: string[]): void {
    if (isWeekend(dateStr)) return; // เสาร์-อาทิตย์ ไม่ต้องลงเวลา
    const logs = this.getAttendanceLogs();
    userIds.forEach(userId => {
      const idx = logs.findIndex(l => l.userId === userId && l.date === dateStr);
      if (idx >= 0) {
        logs[idx].symbol = '/';
        logs[idx].checkInTime = logs[idx].checkInTime || '08:20';
        logs[idx].checkOutTime = logs[idx].checkOutTime || '16:30';
        logs[idx].isLate = false;
        logs[idx].updatedAt = new Date().toISOString();
      } else {
        logs.push({
          id: `att_${userId}_${dateStr}`,
          userId,
          date: dateStr,
          symbol: '/',
          checkInTime: '08:20',
          checkOutTime: '16:30',
          isLate: false,
          recordedBy: 'บันทึกพร้อมกันทั้งกลุ่ม',
          updatedAt: new Date().toISOString()
        });
      }
    });
    this.saveAttendanceLogs(logs);
  },

  /**
   * บันทึกหรือดึงหมายเหตุประจำเดือนของบุคลากร
   */
  getMonthlyNotes(): Record<string, string> {
    const raw = localStorage.getItem('thai_gov_monthly_notes_v1');
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  getMonthlyNote(userId: string, yearBE: number, month: number): string {
    const notes = this.getMonthlyNotes();
    return notes[`${userId}_${yearBE}_${month}`] || '';
  },

  setMonthlyNote(userId: string, yearBE: number, month: number, note: string): void {
    const notes = this.getMonthlyNotes();
    const key = `${userId}_${yearBE}_${month}`;
    if (note.trim()) {
      notes[key] = note.trim();
    } else {
      delete notes[key];
    }
    localStorage.setItem('thai_gov_monthly_notes_v1', JSON.stringify(notes));
  },

  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_USERS);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    localStorage.removeItem('thai_gov_monthly_notes_v1');
  }
};

/**
 * SweetAlert2 Helpers with Thai Govt styling
 */
export const alertHelper = {
  toastSuccess(message: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      background: '#f8fafc',
      color: '#0f172a'
    });
  },

  toastInfo(message: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      background: '#f8fafc',
      color: '#0f172a'
    });
  },

  success(title: string, text?: string): Promise<any> {
    return Swal.fire({
      title,
      text,
      icon: 'success',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#1e3a8a', // Deep navy
      customClass: {
        popup: 'rounded-xl shadow-2xl font-sans'
      }
    });
  },

  error(title: string, text?: string): Promise<any> {
    return Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#dc2626',
      customClass: {
        popup: 'rounded-xl font-sans'
      }
    });
  },

  warning(title: string, text?: string): Promise<any> {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#eab308',
      customClass: {
        popup: 'rounded-xl font-sans'
      }
    });
  },

  info(title: string, text?: string): Promise<any> {
    return Swal.fire({
      title,
      text,
      icon: 'info',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#1e3a8a',
      customClass: {
        popup: 'rounded-xl font-sans'
      }
    });
  },

  confirm(title: string, text: string, confirmText = 'ยืนยันการทำรายการ'): Promise<boolean> {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#1e3a8a',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'rounded-xl font-sans'
      }
    }).then(result => result.isConfirmed);
  }
};
