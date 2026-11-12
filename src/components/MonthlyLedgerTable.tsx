import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { UserPersonnel, AttendanceRecord, SystemSettings, AttendanceSymbol, DepartmentGroup, POSITIONS_BY_GROUP } from '../types';
import {
  ATTENDANCE_SYMBOLS,
  THAI_MONTHS_FULL,
  formatThaiDate,
  getDaysInMonth,
  getFiscalYear,
  getFiscalYearRange,
  isWeekend
} from '../utils/thaiDate';
import { alertHelper, storageService } from '../services/storage';
import { MultiDayAttendanceModal } from './MultiDayAttendanceModal';
import { CumulativeLeaveModal } from './CumulativeLeaveModal';
import { getHolidaysForYear, getHolidaysForMonth } from '../data/thaiHolidays';

interface MonthlyLedgerTableProps {
  users: UserPersonnel[];
  attendanceLogs: AttendanceRecord[];
  settings: SystemSettings;
  onRefreshData: () => void;
  isPrintView?: boolean;
}

export const MonthlyLedgerTable: React.FC<MonthlyLedgerTableProps> = ({
  users,
  attendanceLogs,
  settings,
  onRefreshData,
  isPrintView = false
}) => {
  // Current month and year (matching BE 2569 in image as default, or current)
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // 10 = พฤศจิกายน (0-indexed: 0=Jan ... 10=Nov)
  const [selectedYearBE, setSelectedYearBE] = useState<number>(2569); // พ.ศ. 2569
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');

  // Multi-day modal target
  const [modalTarget, setModalTarget] = useState<{ user: UserPersonnel; day: number } | null>(null);

  // Cumulative leave modal target
  const [cumulativeModalTarget, setCumulativeModalTarget] = useState<{
    user: UserPersonnel;
    symbol: AttendanceSymbol;
    records: AttendanceRecord[];
  } | null>(null);

  const yearCE = selectedYearBE - 543;
  const daysInMonth = getDaysInMonth(yearCE, selectedMonth);

  // Available positions based on selected group
  const availablePositionsForFilter = selectedGroup === 'all'
    ? Array.from(new Set(Object.values(POSITIONS_BY_GROUP).flat()))
    : (POSITIONS_BY_GROUP[selectedGroup as DepartmentGroup] || []);

  // Filter users by selectedGroup and selectedPosition
  const filteredUsers = users.filter(user => {
    if (selectedGroup !== 'all' && user.departmentGroup !== selectedGroup) return false;
    if (selectedPosition !== 'all' && user.position !== selectedPosition) return false;
    return true;
  });

  // Canonical ordering for positions in table
  const positionOrder = [
    'ลูกจ้างประจำ',
    'ข้าราชการพลเรือนในสถาบันอุดมศึกษา',
    'พนักงานมหาวิทยาลัยเงินงบประมาณ',
    'งานมหาวิทยาลัย(เปลี่ยสถานภาพ)',
    'พนักงานมหาวิทยาลัย (เปลี่ยนสถานภาพ)',
    'พนักงานมหาวิทยาลัย(เปลี่ยนสถานภาพ)',
    'พนักงานมหาวิทยาลัย',
    'พนักงานมหาวิทยาลัยเงินรายได้',
    'พนักงานราชการ',
    'อาจารย์',
    'ผู้ช่วยศาสตราจารย์',
    'รองศาสตราจารย์',
    'ศาสตราจารย์'
  ];

  // Present positions sorted
  const presentPositions = Array.from(new Set(filteredUsers.map(u => u.position)))
    .sort((a, b) => {
      const idxA = positionOrder.indexOf(a);
      const idxB = positionOrder.indexOf(b);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });

  // Total rows in tbody (each present position has 1 banner row + user rows)
  const totalRowsInTbody = presentPositions.reduce((acc, pos) => {
    const count = filteredUsers.filter(u => u.position === pos).length;
    return acc + (count > 0 ? 1 + count : 0);
  }, 0);

  // Map attendance records: `userId_YYYY-MM-DD` -> AttendanceRecord
  const logsMap = new Map<string, AttendanceRecord>();
  attendanceLogs.forEach(log => {
    logsMap.set(`${log.userId}_${log.date}`, log);
  });

  // Set of dates marked as public holiday ('ห') — excluded from working day and cumulative leave counts
  const holidayDatesSet = new Set<string>();
  attendanceLogs.forEach(log => {
    if (log.symbol === 'ห' && !isWeekend(log.date)) {
      holidayDatesSet.add(log.date);
    }
  });

  // Calculate cumulative attendance counts from fiscal start (1 Oct) to current month
  // Fiscal year for selectedMonth and selectedYearBE:
  // If selectedMonth >= 9 (Oct, Nov, Dec), fiscal year is selectedYearBE + 1
  // If selectedMonth < 9, fiscal year is selectedYearBE
  const fiscalYearBE = selectedMonth >= 9 ? selectedYearBE + 1 : selectedYearBE;
  const fiscalStartCE = `${fiscalYearBE - 543 - 1}-10-01`;

  const getCumulativeCount = (userId: string, symbol: AttendanceSymbol): number => {
    // Current month end date
    const monthEndCE = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    
    return attendanceLogs.filter(log => {
      return (
        log.userId === userId &&
        log.symbol === symbol &&
        log.date >= fiscalStartCE &&
        log.date <= monthEndCE &&
        !isWeekend(log.date) &&
        !holidayDatesSet.has(log.date)
      );
    }).length;
  };

  const getCumulativeRecords = (userId: string, symbol: AttendanceSymbol): AttendanceRecord[] => {
    const monthEndCE = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    return attendanceLogs
      .filter(log => {
        return (
          log.userId === userId &&
          log.symbol === symbol &&
          log.date >= fiscalStartCE &&
          log.date <= monthEndCE &&
          !isWeekend(log.date) &&
          !holidayDatesSet.has(log.date)
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getMonthCount = (userId: string, symbol: AttendanceSymbol): number => {
    const monthPrefix = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}`;
    return attendanceLogs.filter(log => {
      return (
        log.userId === userId &&
        log.symbol === symbol &&
        log.date.startsWith(monthPrefix) &&
        !isWeekend(log.date) &&
        !holidayDatesSet.has(log.date)
      );
    }).length;
  };

  const handleEditNote = async (user: UserPersonnel) => {
    const currentNote = storageService.getMonthlyNote(user.id, selectedYearBE, selectedMonth);
    const result = await Swal.fire({
      title: `หมายเหตุประจำเดือน`,
      html: `
        <div class="text-left text-xs mb-3 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div><b>ชื่อ-สกุล:</b> ${user.title}${user.firstName} ${user.lastName}</div>
          <div><b>ตำแหน่ง:</b> ${user.position}</div>
          <div><b>เดือน:</b> ประจำเดือน${THAI_MONTHS_FULL[selectedMonth]} พ.ศ. ${selectedYearBE}</div>
        </div>
        <p class="text-left text-xs font-semibold text-slate-700 mb-1">ข้อความหมายเหตุ:</p>
      `,
      input: 'textarea',
      inputValue: currentNote,
      inputPlaceholder: 'กรอกหมายเหตุ เช่น โอนย้ายมาจากหน่วยงาน..., ช่วยราชการ, ลาคลอดต่อเนื่อง, หรือบันทึกอื่นๆ...',
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-floppy-disk mr-1"></i> บันทึกหมายเหตุ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#1e3a8a',
      cancelButtonColor: '#64748b',
      showDenyButton: Boolean(currentNote),
      denyButtonText: '<i class="fa-solid fa-trash mr-1"></i> ลบหมายเหตุ',
      denyButtonColor: '#dc2626',
      customClass: {
        popup: 'rounded-2xl font-sans'
      }
    });

    if (result.isConfirmed) {
      storageService.setMonthlyNote(user.id, selectedYearBE, selectedMonth, result.value || '');
      onRefreshData();
      alertHelper.toastSuccess('บันทึกหมายเหตุสำเร็จ');
    } else if (result.isDenied) {
      storageService.setMonthlyNote(user.id, selectedYearBE, selectedMonth, '');
      onRefreshData();
      alertHelper.toastSuccess('ลบหมายเหตุเรียบร้อย');
    }
  };

  const handleHolidayColumnClick = async (day: number, dateStr: string, currentHolidayName: string) => {
    const result = await Swal.fire({
      title: `จัดการวันหยุดราชการ`,
      html: `
        <div class="text-left text-xs mb-3 text-slate-600 bg-amber-50/80 p-3 rounded-xl border border-amber-200">
          <div class="font-bold text-amber-900 text-sm mb-1 flex items-center gap-1.5">
            <i class="fa-solid fa-umbrella-beach text-amber-600"></i>
            <span>วันที่ ${day} ${THAI_MONTHS_FULL[selectedMonth]} พ.ศ. ${selectedYearBE}</span>
          </div>
          <p class="text-slate-600 mt-1">วันหยุดนี้จะถูกรวมเป็นช่องแนวตั้ง (Merged Column) สีส้มอ่อน พร้อมตัวอักษรแนวตั้งตามรูปแบบบัญชีงบเดือนทางราชการ</p>
        </div>
        <div class="text-left mb-1 text-xs font-bold text-slate-700">ชื่อวันหยุดราชการ:</div>
      `,
      input: 'text',
      inputValue: currentHolidayName,
      inputPlaceholder: 'เช่น วันเข้าพรรษา, วันปิยมหาราช, วันสงกรานต์...',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '<i class="fa-solid fa-check mr-1"></i> บันทึกชื่อวันหยุด',
      denyButtonText: '<i class="fa-solid fa-trash-can mr-1"></i> ยกเลิกวันหยุดนี้',
      cancelButtonText: 'ปิด',
      confirmButtonColor: '#0b5ed7',
      denyButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'rounded-2xl font-sans'
      }
    });

    if (result.isConfirmed) {
      const newName = (result.value || '').trim() || 'วันหยุดราชการ';
      storageService.setPublicHoliday(dateStr, newName);
      onRefreshData();
      alertHelper.toastSuccess(`อัปเดตชื่อวันหยุดเป็น "${newName}" เรียบร้อย`);
    } else if (result.isDenied) {
      storageService.removePublicHoliday(dateStr, true);
      onRefreshData();
      alertHelper.toastSuccess(`ยกเลิกวันหยุดวันที่ ${day} กลับเป็นวันทำการปกติ (/) เรียบร้อย`);
    }
  };

  const handleOpenSetHolidayModal = async () => {
    const monthPrefix = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const existingHolidaysMap = new Map<string, string>();
    attendanceLogs
      .filter(l => l.date.startsWith(monthPrefix) && l.symbol === 'ห')
      .forEach(l => {
        if (!existingHolidaysMap.has(l.date)) {
          existingHolidaysMap.set(l.date, l.note?.trim() || 'วันหยุดราชการ');
        }
      });

    const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1)
      .filter(day => {
        const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return !isWeekend(dateStr);
      });

    const existingHolidaysList = Array.from(existingHolidaysMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    const existingHtml = existingHolidaysList.length > 0
      ? `
        <div class="mt-3 pt-3 border-t border-amber-200">
          <p class="font-bold text-amber-950 text-xs mb-1.5 flex items-center gap-1">
            <i class="fa-solid fa-list-check text-amber-600"></i>
            <span>วันหยุดที่กำหนดไว้แล้วในเดือนนี้ (${existingHolidaysList.length} วัน):</span>
          </p>
          <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            ${existingHolidaysList.map(([dStr, hName]) => {
              const dNum = parseInt(dStr.split('-')[2], 10);
              return `
                <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 text-xs">
                  <span class="font-medium text-slate-800">
                    <span class="font-bold text-red-600 mr-1.5">วันที่ ${dNum}:</span> ${hName}
                  </span>
                  <button type="button" class="swal-btn-delete-holiday text-red-600 hover:text-red-800 text-[11px] font-bold px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition" data-date="${dStr}" data-day="${dNum}">
                    <i class="fa-solid fa-trash-can mr-1"></i> ลบ
                  </button>
                </div>
              `;
            }).join('')}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">* คลิกปุ่ม "ลบ" เพื่อยกเลิกวันหยุดนั้นกลับเป็นวันทำงานปกติได้ทันที</p>
        </div>
      `
      : '';

    const { value: formValues } = await Swal.fire({
      title: 'กำหนดวันหยุดราชการ',
      html: `
        <div class="text-left text-xs text-slate-600 mb-3 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
          <p class="font-bold text-amber-950 mb-1">เลือกวันที่และระบุชื่อวันหยุดในเดือน ${THAI_MONTHS_FULL[selectedMonth]} พ.ศ. ${selectedYearBE}:</p>
          <p class="text-slate-600">เมื่อกำหนดแล้ว ตารางจะรวมช่องทุกแถวบุคลากรเป็นคอลัมน์สีส้มอ่อนพร้อมชื่อวันหยุดแนวตั้งอัตโนมัติ</p>
          ${existingHtml}
        </div>
        <div class="text-left space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">เลือกวันที่ต้องการเพิ่มเป็นวันหยุด (เฉพาะวันจันทร์ - ศุกร์):</label>
            <select id="swal-holiday-day" class="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500">
              ${dayOptions.map(d => {
                const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isExisting = existingHolidaysMap.has(dateStr);
                return `<option value="${d}">วันที่ ${d} ${THAI_MONTHS_FULL[selectedMonth]} (วัน${formatThaiDate(dateStr).split(' ')[0]})${isExisting ? ' [วันหยุดปัจจุบัน]' : ''}</option>`;
              }).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อวันหยุดราชการ / วันหยุดนักขัตฤกษ์:</label>
            <input id="swal-holiday-name" class="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500" placeholder="เช่น วันเข้าพรรษา, วันแม่แห่งชาติ, วันมาฆบูชา" value="วันเข้าพรรษา" />
          </div>
        </div>
      `,
      didOpen: (popup) => {
        const deleteButtons = popup.querySelectorAll('.swal-btn-delete-holiday');
        deleteButtons.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn as HTMLElement;
            const targetDate = target.getAttribute('data-date');
            const targetDay = target.getAttribute('data-day');
            if (targetDate) {
              storageService.removePublicHoliday(targetDate, true);
              onRefreshData();
              Swal.close();
              alertHelper.toastSuccess(`ยกเลิกวันหยุดวันที่ ${targetDay} เรียบร้อยแล้ว`);
            }
          });
        });
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-plus mr-1"></i> บันทึกวันหยุด',
      cancelButtonText: 'ปิด',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'rounded-2xl font-sans'
      },
      preConfirm: () => {
        const daySelect = document.getElementById('swal-holiday-day') as HTMLSelectElement;
        const nameInput = document.getElementById('swal-holiday-name') as HTMLInputElement;
        if (!daySelect || !nameInput) return null;
        return {
          day: parseInt(daySelect.value),
          holidayName: nameInput.value.trim() || 'วันหยุดราชการ'
        };
      }
    });

    if (formValues) {
      const { day, holidayName } = formValues;
      const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      storageService.setPublicHoliday(dateStr, holidayName);
      onRefreshData();
      alertHelper.toastSuccess(`กำหนดวันหยุด "${holidayName}" วันที่ ${day} ${THAI_MONTHS_FULL[selectedMonth]} สำเร็จ`);
    }
  };

  const handleSyncAnnualHolidays = async () => {
    const holidaysInYear = getHolidaysForYear(yearCE);
    const holidaysInMonth = getHolidaysForMonth(yearCE, selectedMonth);

    const { value: syncChoice } = await Swal.fire({
      title: 'ดึงวันหยุดราชการประจำปีอัตโนมัติ',
      html: `
        <div class="text-left text-xs text-slate-600 mb-3 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
          <p class="font-bold text-amber-950 text-sm mb-1 flex items-center gap-1.5">
            <i class="fa-solid fa-cloud-arrow-down text-amber-600"></i>
            <span>ระบบฐานข้อมูลวันหยุดราชการไทย พ.ศ. ${selectedYearBE} (ค.ศ. ${yearCE})</span>
          </p>
          <p class="text-slate-600">
            อ้างอิงตามประกาศสำนักนายกรัฐมนตรีและมติคณะรัฐมนตรี (ครม.) สำหรับปี พ.ศ. ${selectedYearBE}
          </p>
        </div>

        <div class="text-left text-xs text-slate-700 space-y-2 mb-3">
          <div class="font-bold flex items-center justify-between">
            <span>วันหยุดราชการในเดือน ${THAI_MONTHS_FULL[selectedMonth]} พ.ศ. ${selectedYearBE}:</span>
            <span class="text-amber-700 font-semibold">${holidaysInMonth.length} วัน</span>
          </div>
          ${holidaysInMonth.length > 0 ? `
            <ul class="list-disc list-inside bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 max-h-36 overflow-y-auto">
              ${holidaysInMonth.map(h => `<li><b>วันที่ ${h.day}:</b> ${h.name}</li>`).join('')}
            </ul>
          ` : `
            <p class="text-slate-400 italic bg-slate-50 p-2 rounded-lg border border-slate-200">ไม่มีวันหยุดนักขัตฤกษ์ในเดือนนี้</p>
          `}
        </div>

        <p class="text-left text-xs text-slate-700 font-bold mb-1.5">เลือกขอบเขตการดึงวันหยุด:</p>
        <div class="space-y-2 text-left text-xs">
          <label class="flex items-start gap-2.5 p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 cursor-pointer">
            <input type="radio" name="swal-sync-scope" value="month" checked class="accent-amber-600 w-4 h-4 mt-0.5" />
            <div>
              <div class="font-bold text-slate-800">ดึงเฉพาะเดือน ${THAI_MONTHS_FULL[selectedMonth]} พ.ศ. ${selectedYearBE} (${holidaysInMonth.length} วัน)</div>
              <div class="text-[11px] text-slate-500">บันทึกวันหยุดราชการเฉพาะในเดือนที่กำลังเปิดดูอยู่</div>
            </div>
          </label>
          <label class="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="swal-sync-scope" value="year" class="accent-amber-600 w-4 h-4 mt-0.5" />
            <div>
              <div class="font-bold text-slate-800">ดึงวันหยุดทั้งหมดตลอดปี พ.ศ. ${selectedYearBE} (${holidaysInYear.length} วัน)</div>
              <div class="text-[11px] text-slate-500">บันทึกวันหยุดราชการทั้ง 12 เดือนของปี พ.ศ. ${selectedYearBE} พร้อมกัน</div>
            </div>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-cloud-arrow-down mr-1"></i> ดึงวันหยุดและบันทึกลงตาราง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl font-sans' },
      preConfirm: () => {
        const selected = document.querySelector('input[name="swal-sync-scope"]:checked') as HTMLInputElement;
        return selected ? selected.value : 'month';
      }
    });

    if (syncChoice) {
      const isMonthOnly = syncChoice === 'month';
      const count = storageService.syncAnnualPublicHolidays(
        yearCE,
        users.map(u => u.id),
        isMonthOnly ? selectedMonth : undefined
      );
      onRefreshData();
      alertHelper.toastSuccess(
        isMonthOnly
          ? `ดึงวันหยุดเดือน ${THAI_MONTHS_FULL[selectedMonth]} (${count} วัน) เข้าสู่ระบบเรียบร้อยแล้ว`
          : `ดึงวันหยุดตลอดปี พ.ศ. ${selectedYearBE} (${count} วัน) เข้าสู่ระบบเรียบร้อยแล้ว`
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Title matching the uploaded image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <i className="fa-regular fa-calendar-days text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>บัญชีงบเดือนเวลาทำการ</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              ประจำเดือน{THAI_MONTHS_FULL[selectedMonth]} พ.ศ. {selectedYearBE}
            </p>
          </div>
        </div>

        {/* Quick legend on top-right */}
        <div className="hidden lg:flex items-center gap-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold">ตัวย่อ:</span>
          <span className="font-bold text-slate-800">/ = มา</span>
          <span className="text-purple-700 font-bold">ศ = ศึกษา</span>
          <span className="text-rose-700 font-bold">ป = ป่วย</span>
          <span className="text-amber-700 font-bold">ก = กิจ</span>
          <span className="text-pink-700 font-bold">ค = คลอด</span>
          <span className="text-orange-700 font-bold">อ = บวช</span>
          <span className="text-blue-700 font-bold">พ = พักผ่อน</span>
          <span className="text-cyan-700 font-bold">ร = ราชการ</span>
          <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">ห = วันหยุด</span>
        </div>
      </div>

      {/* 2. Top Filter Bar matching the exact pill/card in the image */}
      <div className="no-print bg-white rounded-xl shadow-xs border border-slate-200 p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-blue-600 pl-1 font-bold">
          <i className="fa-solid fa-filter text-base"></i>
        </div>

        {/* Group Selector */}
        <div className="relative min-w-[200px]">
          <select
            value={selectedGroup}
            onChange={e => {
              setSelectedGroup(e.target.value);
              setSelectedPosition('all');
            }}
            className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer shadow-xs hover:border-slate-300 transition"
          >
            <option value="all">ทุกกลุ่มงาน</option>
            <option value="ข้าราชการ+ลูกจ้าง">1. ข้าราชการ+ลูกจ้าง</option>
            <option value="พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ">2. พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ</option>
            <option value="อาจารย์">3. อาจารย์</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
            <i className="fa-solid fa-chevron-down text-[10px]"></i>
          </div>
        </div>

        {/* Position Selector (Cascades on selected group) */}
        <div className="relative min-w-[190px]">
          <select
            value={selectedPosition}
            onChange={e => setSelectedPosition(e.target.value)}
            className="w-full appearance-none bg-white border border-blue-200 bg-blue-50/20 rounded-lg px-3.5 py-2 text-xs font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer shadow-xs hover:border-blue-300 transition"
          >
            <option value="all">ทุกตำแหน่งงาน {selectedGroup !== 'all' ? `(ในกลุ่มที่เลือก)` : ''}</option>
            {availablePositionsForFilter.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-blue-500">
            <i className="fa-solid fa-chevron-down text-[10px]"></i>
          </div>
        </div>

        {/* Month Selector */}
        <div className="relative min-w-[170px]">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer shadow-xs hover:border-slate-300 transition"
          >
            {THAI_MONTHS_FULL.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
            <i className="fa-solid fa-chevron-down text-[10px]"></i>
          </div>
        </div>

        {/* Year Selector */}
        <div className="relative min-w-[130px]">
          <select
            value={selectedYearBE}
            onChange={e => setSelectedYearBE(parseInt(e.target.value))}
            className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer shadow-xs hover:border-slate-300 transition"
          >
            <option value={2567}>พ.ศ. 2567</option>
            <option value={2568}>พ.ศ. 2568</option>
            <option value={2569}>พ.ศ. 2569</option>
            <option value={2570}>พ.ศ. 2570</option>
            <option value={2571}>พ.ศ. 2571</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
            <i className="fa-solid fa-chevron-down text-[10px]"></i>
          </div>
        </div>

        {/* Info label & Actions */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncAnnualHolidays}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="ดึงวันหยุดราชการประจำปีและวันหยุดนักขัตฤกษ์ของไทยอัตโนมัติ"
          >
            <i className="fa-solid fa-cloud-arrow-down text-slate-900"></i>
            <span>ดึงวันหยุดประจำปี</span>
          </button>
          <button
            onClick={handleOpenSetHolidayModal}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="กำหนดวันหยุดราชการประจำเดือน เช่น วันเข้าพรรษา, วันปิยมหาราช"
          >
            <i className="fa-solid fa-calendar-plus text-amber-200"></i>
            <span>+ กำหนดวันหยุด</span>
          </button>
          <button
            onClick={() => {
              window.focus();
              setTimeout(() => window.print(), 50);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <i className="fa-solid fa-print"></i>
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

      {/* 3. The Exact Table matching the user's uploaded image */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs select-none">
            {/* Table Header with Distinct Government Color Blocks */}
            <thead>
              {/* Row 1: Section Super-Headers */}
              <tr className="text-white text-xs font-bold leading-tight">
                {/* 1. ลำดับ (Blue) */}
                <th
                  rowSpan={2}
                  className="bg-[#0b5ed7] border-r border-blue-400/30 px-2 py-2.5 w-12 text-center"
                >
                  ลำดับ
                </th>

                {/* 2. ชื่อ-นามสกุล (Blue) */}
                <th
                  rowSpan={2}
                  className="bg-[#0b5ed7] border-r border-blue-400/30 px-4 py-2.5 text-center min-w-[200px]"
                >
                  ชื่อ-นามสกุล
                </th>

                {/* 3. รวมวันทำการ (Blue) */}
                <th
                  rowSpan={2}
                  className="bg-[#0b5ed7] border-r border-blue-400/30 px-1 py-1.5 w-14 text-center"
                >
                  <div className="leading-tight text-[11px]">
                    <div>รวม</div>
                    <div className="text-[10px] font-normal">วันทำการ</div>
                  </div>
                </th>

                {/* 4. Days 1 to 30/31 (Header with red for weekends, red for holidays, and blue for weekdays) */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const weekend = isWeekend(dateStr);
                  const isDateHoliday = Array.from(logsMap.values()).some(rec => rec.date === dateStr && rec.symbol === 'ห');
                  const holidayRec = isDateHoliday ? Array.from(logsMap.values()).find(rec => rec.date === dateStr && rec.symbol === 'ห') : undefined;
                  return (
                    <th
                      key={day}
                      rowSpan={2}
                      className={`border-r border-slate-200/40 text-center font-bold px-1 py-2 w-7 sm:w-8 text-[11px] ${
                        weekend
                          ? 'bg-[#d92d20] text-white font-extrabold'
                          : isDateHoliday
                          ? 'bg-[#d92d20] text-white font-extrabold'
                          : 'bg-[#0b5ed7] text-white'
                      }`}
                      title={`${formatThaiDate(dateStr)}${isDateHoliday ? ` (วันหยุดราชการ: ${holidayRec?.note || 'วันหยุด'})` : ''}`}
                    >
                      {day}
                    </th>
                  );
                })}

                {/* 5. รวมเดือนนี้ (Deep Purple Block #4c1d56 / #581c87) */}
                <th
                  colSpan={8}
                  className="bg-[#4c1d56] border-r border-purple-400/40 px-2 py-1.5 text-center font-bold text-white tracking-wide"
                >
                  รวมเดือนนี้
                </th>

                {/* 6. รวมตั้งแต่ต้นงบ (Vibrant Orange Block #e65100 / #d9531e) */}
                <th
                  colSpan={8}
                  className="bg-[#d9531e] border-r border-orange-400/40 px-2 py-1.5 text-center font-bold text-white tracking-wide"
                >
                  รวมตั้งแต่ต้นงบ
                </th>

                {/* 7. หมายเหตุ (Blue) */}
                <th
                  rowSpan={2}
                  className="bg-[#0b5ed7] px-3 py-2.5 text-center font-bold text-white min-w-[90px]"
                >
                  หมายเหตุ
                </th>
              </tr>

              {/* Row 2: Sub-headers for symbols under "รวมเดือนนี้" and "รวมตั้งแต่ต้นงบ" */}
              <tr className="text-white text-[11px] font-bold">
                {/* Subheaders for รวมเดือนนี้ (Purple) */}
                {(['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as AttendanceSymbol[]).map(sym => (
                  <th
                    key={`m_${sym}`}
                    className="bg-[#3b1244] border-r border-purple-400/30 px-1 py-1 w-6 text-center text-purple-100"
                  >
                    {sym}
                  </th>
                ))}

                {/* Subheaders for รวมตั้งแต่ต้นงบ (Orange) */}
                {(['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as AttendanceSymbol[]).map(sym => (
                  <th
                    key={`c_${sym}`}
                    className="bg-[#b43c10] border-r border-orange-400/30 px-1 py-1 w-6 text-center text-orange-100"
                  >
                    {sym}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body with Position Headers and Rows (matching user screenshot) */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {presentPositions.length === 0 ? (
                <tr>
                  <td colSpan={3 + daysInMonth + 8 + 8 + 1} className="py-8 text-center text-slate-400 text-xs">
                    ไม่พบข้อมูลบุคลากรในกลุ่มงานหรือตำแหน่งที่เลือก
                  </td>
                </tr>
              ) : (
                presentPositions.map((posName, posIdx) => {
                  const posUsers = filteredUsers.filter(u => u.position === posName);
                  if (posUsers.length === 0) return null;

                  return (
                    <React.Fragment key={posName}>
                      {/* Position Banner Row matching uploaded screenshot */}
                      <tr className="bg-[#f0f6fe] border-t border-b border-blue-200/80">
                        <td
                          colSpan={3}
                          className="text-left font-bold text-[#0b5ed7] px-3 py-1 text-[11px] bg-[#f0f6fe]"
                        >
                          <span>{posName}</span>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                          const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const weekend = isWeekend(dateStr);
                          const holidayRec = !weekend
                            ? filteredUsers.map(u => logsMap.get(`${u.id}_${dateStr}`)).find(l => l && l.symbol === 'ห')
                            : undefined;
                          const isHoliday = Boolean(holidayRec);
                          const holidayName = holidayRec?.note?.trim() || 'วันหยุดราชการ';

                          if (isHoliday) {
                            if (posIdx === 0) {
                              return (
                                <td
                                  key={day}
                                  rowSpan={totalRowsInTbody}
                                  onClick={() => {
                                    if (!isPrintView) {
                                      handleHolidayColumnClick(day, dateStr, holidayName);
                                    }
                                  }}
                                  className="p-0 border-r border-slate-300 bg-[#fee8e8] hover:bg-[#fcd5d5] text-center select-none align-middle cursor-pointer transition-colors shadow-inner"
                                  title={`${formatThaiDate(dateStr)}: วันหยุดราชการ (${holidayName}) - คลิกเพื่อแก้ไขหรือยกเลิก`}
                                >
                                  <div className="h-full min-h-[140px] w-full flex items-center justify-center py-4 px-0.5">
                                    <span
                                      className="font-bold text-red-600 text-[9px] sm:text-[10px] tracking-wider select-none whitespace-nowrap drop-shadow-xs"
                                      style={{
                                        writingMode: 'vertical-rl'
                                      }}
                                    >
                                      {holidayName}
                                    </span>
                                  </div>
                                </td>
                              );
                            }
                            return null;
                          }

                          if (weekend) {
                            return (
                              <td
                                key={day}
                                className="p-0 border-r border-slate-200 bg-[#fee8e8] text-center"
                              ></td>
                            );
                          }

                          return (
                            <td
                              key={day}
                              className="p-0 border-r border-slate-200 bg-[#f0f6fe] text-center"
                            ></td>
                          );
                        })}
                        <td colSpan={8 + 8 + 1} className="bg-[#f0f6fe] border-slate-200"></td>
                      </tr>

                      {/* User Rows */}
                      {posUsers.map((user, uIdx) => {
                        // Count for "รวม" (มาทำงาน /)
                        const presentCount = getMonthCount(user.id, '/');

                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-blue-50/50 transition-colors border-b border-slate-200"
                          >
                            {/* 1. ลำดับ */}
                            <td className="py-1 px-1.5 font-medium text-slate-600 border-r border-slate-200 text-center text-xs">
                              {uIdx + 1}
                            </td>

                            {/* 2. ชื่อ-นามสกุล */}
                            <td className="py-1 px-2.5 text-left border-r border-slate-200 whitespace-nowrap">
                              <div className="font-semibold text-slate-900 text-xs leading-snug">
                                {user.title}{user.firstName} {user.lastName}
                              </div>
                            </td>

                            {/* 3. รวมวันทำการ (Bold blue number as in screenshot) */}
                            <td className="py-1 px-1 border-r border-slate-200 text-center font-bold text-[#0b5ed7] text-xs">
                              {presentCount}
                            </td>

                            {/* 4. Days 1 to 30/31 cells */}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                              const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const weekend = isWeekend(dateStr);

                              // ตรวจสอบวันหยุดราชการ (ห)
                              const holidayRec = !weekend
                                ? filteredUsers.map(u => logsMap.get(`${u.id}_${dateStr}`)).find(l => l && l.symbol === 'ห')
                                : undefined;
                              const isHoliday = Boolean(holidayRec);

                              // หากเป็นวันหยุดราชการ แถวแรกของ tbody รวมช่องไว้ทั้งคอลัมน์แล้ว
                              if (isHoliday) {
                                return null;
                              }

                              // วันหยุดเสาร์-อาทิตย์ พื้นหลังสีชมพูอ่อน ช่องว่างตามภาพตัวอย่าง
                              if (weekend) {
                                return (
                                  <td
                                    key={day}
                                    className="p-0 border-r border-slate-200 bg-[#fee8e8] text-center select-none cursor-not-allowed"
                                    title={`${formatThaiDate(dateStr)}: วันหยุดเสาร์-อาทิตย์ (ไม่ต้องลงเวลา)`}
                                  ></td>
                                );
                              }

                              const log = logsMap.get(`${user.id}_${dateStr}`);
                              const symbol = log?.symbol;

                              // วันทำงานปกติ
                              return (
                                <td
                                  key={day}
                                  onClick={() => {
                                    if (!isPrintView) setModalTarget({ user, day });
                                  }}
                                  className="p-0 text-center font-bold text-xs border-r border-slate-200 bg-white hover:bg-blue-100 text-slate-800 cursor-pointer transition relative"
                                  title={`${user.title}${user.firstName} - ${formatThaiDate(dateStr)}: ${symbol || 'คลิกเพื่อลงเวลาหลายวัน'}`}
                                >
                                  <div className="w-full h-6.5 flex items-center justify-center">
                                    {symbol ? (
                                      <span className={`font-extrabold text-[11px] ${
                                        symbol === '/' ? 'text-emerald-700' :
                                        symbol === 'ป' ? 'text-rose-700' :
                                        symbol === 'ก' ? 'text-amber-700' :
                                        symbol === 'พ' ? 'text-blue-700' :
                                        symbol === 'ศ' ? 'text-purple-700' :
                                        symbol === 'ร' ? 'text-cyan-700' :
                                        symbol === 'ส' ? 'text-yellow-700' :
                                        'text-slate-700'
                                      }`}>
                                        {symbol}
                                      </span>
                                    ) : (
                                      <span className="text-slate-200 text-[9px]">-</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}

                            {/* 5. รวมเดือนนี้ Cells (ศ, ป, ก, ค, อ, พ, ร, ส) */}
                            {(['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as AttendanceSymbol[]).map(sym => {
                              const cnt = getMonthCount(user.id, sym);
                              return (
                                <td
                                  key={`mc_${sym}`}
                                  className="py-1 px-0.5 border-r border-slate-200 text-center font-mono font-medium text-[10px] bg-purple-50/20 text-purple-950"
                                >
                                  {cnt > 0 ? (
                                    <span className="font-bold text-purple-800">{cnt}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* 6. รวมตั้งแต่ต้นงบ Cells (ศ, ป, ก, ค, อ, พ, ร, ส) - คลิกเพื่อดูประวัติวันที่ลา */}
                            {(['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as AttendanceSymbol[]).map(sym => {
                              const cnt = getCumulativeCount(user.id, sym);
                              const symDef = ATTENDANCE_SYMBOLS[sym] || ATTENDANCE_SYMBOLS['/'];
                              return (
                                <td
                                  key={`cc_${sym}`}
                                  onClick={() => {
                                    const records = getCumulativeRecords(user.id, sym);
                                    setCumulativeModalTarget({
                                      user,
                                      symbol: sym,
                                      records
                                    });
                                  }}
                                  className="py-1 px-0.5 border-r border-slate-200 text-center font-mono font-medium text-[10px] bg-orange-50/20 text-orange-950 hover:bg-orange-100 hover:text-orange-900 cursor-pointer transition select-none group"
                                  title={`คลิกเพื่อดูวันที่ลา "${symDef.name} (${sym})" ตั้งแต่ต้นงบ (${cnt} วัน)`}
                                >
                                  {cnt > 0 ? (
                                    <span className="font-bold text-orange-800 underline decoration-orange-400 decoration-1 underline-offset-2 group-hover:text-orange-950">
                                      {cnt}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 group-hover:text-slate-500 font-normal">
                                      0
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* 7. หมายเหตุ: เปลี่ยนจากโอน ให้คลิกแล้วเพิ่ม/แก้ไขข้อความได้ */}
                            <td className="py-1 px-1.5 text-center text-xs">
                              {(() => {
                                const note = storageService.getMonthlyNote(user.id, selectedYearBE, selectedMonth);
                                return note ? (
                                  <button
                                    type="button"
                                    onClick={() => handleEditNote(user)}
                                    className="group max-w-[120px] mx-auto text-left px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded text-[10px] font-medium transition cursor-pointer flex items-center justify-between gap-1 shadow-xs"
                                    title={`${note} (คลิกเพื่อแก้ไขหรือลบ)`}
                                  >
                                    <span className="truncate">{note}</span>
                                    <i className="fa-solid fa-pen text-[8px] text-amber-600 opacity-60 group-hover:opacity-100 shrink-0"></i>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleEditNote(user)}
                                    className="text-slate-400 hover:text-blue-700 hover:bg-blue-50 px-1.5 py-0.5 rounded transition text-[10px] font-medium cursor-pointer inline-flex items-center gap-1 border border-dashed border-slate-200 hover:border-blue-300"
                                    title="คลิกเพื่อเพิ่มข้อความหมายเหตุ"
                                  >
                                    <i className="fa-solid fa-plus text-[8px]"></i>
                                    <span>หมายเหตุ</span>
                                  </button>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Day Attendance Modal matching user screenshot */}
      {modalTarget && (
        <MultiDayAttendanceModal
          user={modalTarget.user}
          initialDay={modalTarget.day}
          selectedMonth={selectedMonth}
          selectedYearBE={selectedYearBE}
          existingLogs={logsMap}
          allUsers={users}
          onClose={() => setModalTarget(null)}
          onSaved={onRefreshData}
        />
      )}

      {/* Cumulative Leave Dates Modal */}
      {cumulativeModalTarget && (
        <CumulativeLeaveModal
          user={cumulativeModalTarget.user}
          symbol={cumulativeModalTarget.symbol}
          records={cumulativeModalTarget.records}
          fiscalStartText={`1 ต.ค. ${fiscalYearBE - 1}`}
          monthEndText={`สิ้นสุดเดือน${THAI_MONTHS_FULL[selectedMonth]} ${selectedYearBE}`}
          fiscalYearBE={fiscalYearBE}
          onClose={() => setCumulativeModalTarget(null)}
        />
      )}
    </div>
  );
};
