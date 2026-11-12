import Swal from 'sweetalert2';
import { UserPersonnel, AttendanceRecord, SystemSettings, AttendanceSymbol } from '../types';
import { INITIAL_SYSTEM_SETTINGS, INITIAL_USERS, generateSeedAttendance } from '../data/initialData';
import { toISODate, isWeekend } from '../utils/thaiDate';
import { getHolidaysForYear, getHolidaysForMonth } from '../data/thaiHolidays';

const STORAGE_KEY_SETTINGS = 'thai_gov_attendance_settings_v1';
const STORAGE_KEY_USERS = 'thai_gov_attendance_users_v1';
const STORAGE_KEY_LOGS = 'thai_gov_attendance_logs_v1';
const STORAGE_KEY_NOTES = 'thai_gov_monthly_notes_v1';

let serverDbEnabled = false;
let syncQueue: Promise<void> = Promise.resolve();

function enqueueApiSync(task: () => Promise<void>): void {
  if (!serverDbEnabled) return;
  syncQueue = syncQueue
    .then(() => task())
    .catch(err => {
      console.warn('MariaDB sync error:', err);
    });
}

async function apiJson(url: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API ${method} ${url} failed (${res.status})`);
  }
  return res.json();
}

function persistLogsLocally(logs: AttendanceRecord[]): AttendanceRecord[] {
  const cleanLogs = logs.filter(l => l && l.date && !isWeekend(l.date));
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(cleanLogs));
  return cleanLogs;
}

export interface FullBackupData {
  version: number;
  exportedAt: string;
  settings: SystemSettings;
  users: UserPersonnel[];
  attendanceLogs: AttendanceRecord[];
  monthlyNotes: Record<string, string>;
}

export const storageService = {
  isServerDbEnabled(): boolean {
    return serverDbEnabled;
  },

  async initFromServer(): Promise<{ dbConnected: boolean; migratedFromLocal: boolean }> {
    try {
      const data = await apiJson('/api/bootstrap', 'GET');
      if (!data?.dbConnected) {
        serverDbEnabled = false;
        return { dbConnected: false, migratedFromLocal: false };
      }

      serverDbEnabled = true;

      if (data.isEmpty) {
        const localPayload = {
          settings: this.getSettings(),
          users: this.getUsers(),
          attendanceLogs: this.getAttendanceLogs(),
          monthlyNotes: this.getMonthlyNotes(),
        };
        await apiJson('/api/import-all', 'POST', localPayload);
        return { dbConnected: true, migratedFromLocal: true };
      }

      if (data.settings) {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ ...INITIAL_SYSTEM_SETTINGS, ...data.settings }));
      }
      if (Array.isArray(data.users) && data.users.length > 0) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(data.users));
      }
      if (Array.isArray(data.attendanceLogs)) {
        persistLogsLocally(data.attendanceLogs);
      }
      if (data.monthlyNotes && typeof data.monthlyNotes === 'object') {
        localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(data.monthlyNotes));
      }

      return { dbConnected: true, migratedFromLocal: false };
    } catch {
      serverDbEnabled = false;
      return { dbConnected: false, migratedFromLocal: false };
    }
  },

  exportFullBackup(): FullBackupData {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      users: this.getUsers(),
      attendanceLogs: this.getAttendanceLogs(),
      monthlyNotes: this.getMonthlyNotes(),
    };
  },

  async importFullBackup(backup: Partial<FullBackupData>): Promise<void> {
    if (backup.settings) {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ ...INITIAL_SYSTEM_SETTINGS, ...backup.settings }));
    }
    if (Array.isArray(backup.users)) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(backup.users));
    }
    if (Array.isArray(backup.attendanceLogs)) {
      persistLogsLocally(backup.attendanceLogs);
    }
    if (backup.monthlyNotes && typeof backup.monthlyNotes === 'object') {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(backup.monthlyNotes));
    }

    if (serverDbEnabled) {
      await syncQueue;
      await apiJson('/api/import-all', 'POST', {
        settings: this.getSettings(),
        users: this.getUsers(),
        attendanceLogs: this.getAttendanceLogs(),
        monthlyNotes: this.getMonthlyNotes(),
      });
    }
  },

  async pushLocalToServer(): Promise<boolean> {
    try {
      await syncQueue;
      const res = await apiJson('/api/import-all', 'POST', {
        settings: this.getSettings(),
        users: this.getUsers(),
        attendanceLogs: this.getAttendanceLogs(),
        monthlyNotes: this.getMonthlyNotes(),
      });
      if (res?.mode === 'mariadb' || res?.ok) {
        const health = await apiJson('/api/health', 'GET');
        serverDbEnabled = Boolean(health?.dbConnected);
        return Boolean(health?.dbConnected);
      }
      return false;
    } catch {
      return false;
    }
  },

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
    enqueueApiSync(() => apiJson('/api/settings', 'PUT', settings));
  },

  getUsers(): UserPersonnel[] {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
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
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(combined));
        return combined;
      }

      return migrated;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: UserPersonnel[]): void {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    enqueueApiSync(() => apiJson('/api/users', 'PUT', { users }));
  },

  getAttendanceLogs(): AttendanceRecord[] {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) {
      const initialUsers = this.getUsers();
      const seedLogs = generateSeedAttendance(initialUsers).filter(l => !isWeekend(l.date));
      persistLogsLocally(seedLogs);
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
    const cleanLogs = persistLogsLocally(logs);
    enqueueApiSync(() => apiJson('/api/attendance/replace-all', 'PUT', { logs: cleanLogs }));
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
    const upserted: AttendanceRecord[] = [];

    targetUserIds.forEach(userId => {
      const idx = logs.findIndex(l => l.userId === userId && l.date === dateStr);
      if (idx >= 0) {
        logs[idx].symbol = 'ห';
        logs[idx].note = name;
        logs[idx].checkInTime = undefined;
        logs[idx].checkOutTime = undefined;
        logs[idx].isLate = false;
        logs[idx].updatedAt = new Date().toISOString();
        upserted.push(logs[idx]);
      } else {
        const rec: AttendanceRecord = {
          id: `att_${userId}_${dateStr}`,
          userId,
          date: dateStr,
          symbol: 'ห',
          note: name,
          recordedBy: 'วันหยุดราชการ',
          updatedAt: new Date().toISOString()
        };
        logs.push(rec);
        upserted.push(rec);
      }
    });
    persistLogsLocally(logs);
    enqueueApiSync(() => apiJson('/api/attendance/bulk-upsert', 'POST', { records: upserted }));
  },

  /**
   * ยกเลิก/ลบวันหยุดราชการสำหรับวันที่เลือก
   * @param dateStr วันที่ในรูปแบบ YYYY-MM-DD
   * @param revertToNormal หากเป็น true จะเปลี่ยนสัญลักษณ์กลับเป็น '/' (มาทำงานปกติ) สำหรับทุกคน หากเป็น false จะลบ record ทิ้ง
   */
  removePublicHoliday(dateStr: string, revertToNormal: boolean = true): void {
    const logs = this.getAttendanceLogs();
    const allUsers = this.getUsers();
    const upserted: AttendanceRecord[] = [];

    // 1. กวาดล้างและเปลี่ยนทุก record ใน logs ที่มี date === dateStr และ symbol === 'ห' ให้เป็น '/'
    logs.forEach(l => {
      if (l.date === dateStr && l.symbol === 'ห') {
        l.symbol = '/';
        l.note = undefined;
        l.updatedAt = new Date().toISOString();
      }
    });

    // 2. ให้แน่ใจว่าบุคลากรทุกคนใน allUsers มี record '/' สำหรับวันนี้
    if (revertToNormal) {
      allUsers.forEach(u => {
        const userLogs = logs.filter(l => l.userId === u.id && l.date === dateStr);
        if (userLogs.length > 0) {
          userLogs.forEach(l => {
            l.symbol = '/';
            l.note = undefined;
            l.updatedAt = new Date().toISOString();
            upserted.push(l);
          });
        } else {
          const rec: AttendanceRecord = {
            id: `att_${u.id}_${dateStr}`,
            userId: u.id,
            date: dateStr,
            symbol: '/',
            note: undefined,
            recordedBy: 'วันปฏิบัติงานปกติ',
            updatedAt: new Date().toISOString()
          };
          logs.push(rec);
          upserted.push(rec);
        }
      });
    }

    // 3. กรองและตัดทิ้ง record 'ห' ใดๆ ที่อาจตกค้างบน dateStr ให้หมดสิ้น 100%
    const cleanLogs = logs.filter(l => !(l.date === dateStr && l.symbol === 'ห'));
    persistLogsLocally(cleanLogs);
    enqueueApiSync(async () => {
      await apiJson('/api/attendance/bulk-delete', 'POST', { holidayDate: dateStr });
      if (upserted.length > 0) {
        await apiJson('/api/attendance/bulk-upsert', 'POST', { records: upserted });
      }
    });
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
    const upserted: AttendanceRecord[] = [];
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
          upserted.push(logs[idx]);
        } else {
          const rec: AttendanceRecord = {
            id: `att_${userId}_${h.date}`,
            userId,
            date: h.date,
            symbol: 'ห',
            note: h.name,
            recordedBy: 'วันหยุดราชการประจำปี',
            updatedAt: new Date().toISOString()
          };
          logs.push(rec);
          upserted.push(rec);
        }
      });
    });

    persistLogsLocally(logs);
    enqueueApiSync(() => apiJson('/api/attendance/bulk-upsert', 'POST', { records: upserted }));
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

    persistLogsLocally(logs);
    enqueueApiSync(() => apiJson('/api/attendance/bulk-upsert', 'POST', { records: [updatedRecord] }));
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
    const upserted: AttendanceRecord[] = [];
    validDates.forEach(dateStr => {
      const idx = logs.findIndex(l => l.userId === userId && l.date === dateStr);
      const checkIn = symbol === '/' ? '08:25' : (symbol === 'ส' ? '08:45' : undefined);
      const checkOut = (symbol === '/' || symbol === 'ส') ? '16:30' : undefined;
      const isLate = symbol === 'ส';

      if (idx >= 0) {
        logs[idx].symbol = symbol;
        logs[idx].checkInTime = checkIn;
        logs[idx].checkOutTime = checkOut;
        logs[idx].isLate = isLate;
        if (note) logs[idx].note = note;
        logs[idx].updatedAt = new Date().toISOString();
        upserted.push(logs[idx]);
      } else {
        const rec: AttendanceRecord = {
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
        };
        logs.push(rec);
        upserted.push(rec);
      }
    });
    persistLogsLocally(logs);
    enqueueApiSync(() => apiJson('/api/attendance/bulk-upsert', 'POST', { records: upserted }));
  },

  /**
   * ลบการลงเวลาสำหรับหลายวันที่เลือก
   */
  deleteAttendanceMultipleDays(userId: string, dateStrings: string[]): void {
    const logs = this.getAttendanceLogs();
    const dateSet = new Set(dateStrings);
    const filtered = logs.filter(l => !(l.userId === userId && dateSet.has(l.date)));
    persistLogsLocally(filtered);
    enqueueApiSync(() => apiJson('/api/attendance/bulk-delete', 'POST', { userId, dates: dateStrings }));
  },

  /**
   * บันทึกมาทำงานทั้งหมดสำหรับวันที่เลือก
   */
  markAllPresent(dateStr: string, userIds: string[]): void {
    if (isWeekend(dateStr)) return; // เสาร์-อาทิตย์ ไม่ต้องลงเวลา
    const logs = this.getAttendanceLogs();
    const upserted: AttendanceRecord[] = [];
    userIds.forEach(userId => {
      const idx = logs.findIndex(l => l.userId === userId && l.date === dateStr);
      if (idx >= 0) {
        logs[idx].symbol = '/';
        logs[idx].checkInTime = logs[idx].checkInTime || '08:20';
        logs[idx].checkOutTime = logs[idx].checkOutTime || '16:30';
        logs[idx].isLate = false;
        logs[idx].updatedAt = new Date().toISOString();
        upserted.push(logs[idx]);
      } else {
        const rec: AttendanceRecord = {
          id: `att_${userId}_${dateStr}`,
          userId,
          date: dateStr,
          symbol: '/',
          checkInTime: '08:20',
          checkOutTime: '16:30',
          isLate: false,
          recordedBy: 'บันทึกพร้อมกันทั้งกลุ่ม',
          updatedAt: new Date().toISOString()
        };
        logs.push(rec);
        upserted.push(rec);
      }
    });
    persistLogsLocally(logs);
    enqueueApiSync(() => apiJson('/api/attendance/bulk-upsert', 'POST', { records: upserted }));
  },

  /**
   * บันทึกหรือดึงหมายเหตุประจำเดือนของบุคลากร
   */
  getMonthlyNotes(): Record<string, string> {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
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
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
    enqueueApiSync(() => apiJson('/api/monthly-note', 'PUT', { userId, yearBE, month, note }));
  },

  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_USERS);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    localStorage.removeItem(STORAGE_KEY_NOTES);
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
