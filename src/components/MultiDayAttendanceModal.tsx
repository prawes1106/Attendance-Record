import React, { useState } from 'react';
import { UserPersonnel, AttendanceSymbol, AttendanceRecord } from '../types';
import { getDaysInMonth, isWeekend } from '../utils/thaiDate';
import { alertHelper, storageService } from '../services/storage';
import { getHolidaysForMonth } from '../data/thaiHolidays';

interface MultiDayAttendanceModalProps {
  user: UserPersonnel;
  initialDay?: number;
  selectedMonth: number; // 0-11
  selectedYearBE: number; // e.g. 2569
  existingLogs: Map<string, AttendanceRecord>;
  allUsers?: UserPersonnel[];
  onClose: () => void;
  onSaved: () => void;
}

export const MultiDayAttendanceModal: React.FC<MultiDayAttendanceModalProps> = ({
  user,
  initialDay = 1,
  selectedMonth,
  selectedYearBE,
  existingLogs,
  allUsers,
  onClose,
  onSaved
}) => {
  const yearCE = selectedYearBE - 543;
  const daysInMonth = getDaysInMonth(yearCE, selectedMonth);

  // รวมวันหยุดประจำปี (จากฐานข้อมูลวันหยุดทางการ) และวันหยุดราชการที่มีการบันทึกไว้ในระบบ
  const annualHolidays = getHolidaysForMonth(yearCE, selectedMonth);
  const holidayMap = new Map<number, { name: string; isRecorded: boolean; isWeekend: boolean }>();

  // 1. วันหยุดราชการตามประกาศทางการ
  annualHolidays.forEach(h => {
    const dStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
    holidayMap.set(h.day, {
      name: h.name,
      isRecorded: false,
      isWeekend: isWeekend(dStr)
    });
  });

  // 2. วันหยุดที่มีการบันทึกสัญลักษณ์ 'ห' ไว้ใน existingLogs
  const monthPrefix = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}`;
  existingLogs.forEach(rec => {
    if (rec.symbol === 'ห' && rec.date.startsWith(monthPrefix)) {
      const dayNum = parseInt(rec.date.split('-')[2], 10);
      const dStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      holidayMap.set(dayNum, {
        name: rec.note?.trim() || holidayMap.get(dayNum)?.name || 'วันหยุดราชการ',
        isRecorded: true,
        isWeekend: isWeekend(dStr)
      });
    }
  });

  // Multi-day selection state (เสาร์-อาทิตย์ ไม่ต้องลงเวลา)
  const initialDateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(initialDay).padStart(2, '0')}`;
  const [selectedDays, setSelectedDays] = useState<number[]>(isWeekend(initialDateStr) ? [] : [initialDay]);
  const [selectedSymbol, setSelectedSymbol] = useState<AttendanceSymbol | null>(null);
  const [holidayNote, setHolidayNote] = useState<string>(
    holidayMap.get(initialDay)?.name || 'วันหยุดราชการ'
  );
  const [applyToAll, setApplyToAll] = useState<boolean>(true);

  // Status definitions matching government regulations + วันหยุด (ห)
  const statusOptions: { symbol: AttendanceSymbol; label: string; color: string }[] = [
    { symbol: '/', label: 'มาทำงาน', color: 'text-emerald-600' },
    { symbol: 'ศ', label: 'ศึกษาต่อ', color: 'text-purple-600' },
    { symbol: 'ป', label: 'ลาป่วย', color: 'text-rose-600' },
    { symbol: 'ก', label: 'ลากิจ', color: 'text-amber-600' },
    { symbol: 'ค', label: 'ลาคลอด', color: 'text-pink-600' },
    { symbol: 'อ', label: 'ลาอุปสมบท', color: 'text-amber-500' },
    { symbol: 'พ', label: 'ลาพักร้อน', color: 'text-blue-600' },
    { symbol: 'ร', label: 'ราชการ', color: 'text-teal-600' },
    { symbol: 'ห', label: 'วันหยุด', color: 'text-red-600' }
  ];

  // Toggle a day in or out of selectedDays
  const handleToggleDay = (day: number) => {
    const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isWeekend(dateStr)) return; // เสาร์-อาทิตย์ ไม่ต้องลงเวลา

    setSelectedDays(prev => {
      const isAlready = prev.includes(day);
      const nextDays = isAlready ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b);
      if (!isAlready && nextDays.length === 1) {
        const h = holidayMap.get(day);
        if (h) setHolidayNote(h.name);
      }
      return nextDays;
    });
  };

  // Convert selected day numbers into YYYY-MM-DD
  const getSelectedDateStrings = () => {
    return selectedDays.map(day => {
      return `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    });
  };

  // Save selected status to all selected days
  const handleSave = () => {
    if (selectedDays.length === 0) {
      alertHelper.error('กรุณาเลือกวัน', 'โปรดคลิกเลือกวันที่ต้องการลงเวลาอย่างน้อย 1 วัน');
      return;
    }
    if (!selectedSymbol) {
      alertHelper.error('กรุณาเลือกสถานะ', 'โปรดเลือกสถานะการลงเวลาก่อนกดบันทึก');
      return;
    }

    const dateStrings = getSelectedDateStrings().filter(d => !isWeekend(d));
    if (dateStrings.length === 0) {
      alertHelper.error('ไม่พบวันทำการ', 'กรุณาเลือกวันทำการที่ต้องการลงเวลา (เสาร์-อาทิตย์ ไม่ต้องลงเวลา)');
      return;
    }

    const note = selectedSymbol === 'ห' ? (holidayNote.trim() || 'วันหยุดราชการ') : undefined;

    if (selectedSymbol === 'ห' && applyToAll && allUsers && allUsers.length > 0) {
      allUsers.forEach(u => {
        storageService.updateAttendanceMultipleDays(u.id, dateStrings, 'ห', note);
      });
      onSaved();
      onClose();
      alertHelper.toastSuccess(`บันทึก "วันหยุด (ห)" สำหรับบุคลากรทุกคน (${allUsers.length} ท่าน) เรียบร้อยแล้ว`);
      return;
    }

    storageService.updateAttendanceMultipleDays(user.id, dateStrings, selectedSymbol, note);
    onSaved();
    onClose();
    if (selectedSymbol === 'ห') {
      alertHelper.toastSuccess(`บันทึกวันหยุด (ห) จำนวน ${dateStrings.length} วัน เรียบร้อยแล้ว`);
    } else {
      alertHelper.toastSuccess(`บันทึก ${selectedSymbol} สำหรับ ${dateStrings.length} วันทำการ เรียบร้อยแล้ว`);
    }
  };

  // Delete/Clear attendance for selected days
  const handleDeleteAttendance = async () => {
    const validDates = getSelectedDateStrings().filter(d => !isWeekend(d));
    if (validDates.length === 0) {
      alertHelper.error('กรุณาเลือกวันทำการ', 'โปรดคลิกเลือกวันทำการที่ต้องการลบการลงเวลา');
      return;
    }

    const confirmed = await alertHelper.confirm(
      'ยืนยันลบการลงเวลา',
      `ต้องการลบการลงเวลาในวันที่เลือกทั้งหมด ${validDates.length} วัน หรือไม่? (หากมีวันหยุดราชการ ระบบจะยกเลิกวันหยุดกลับเป็นวันทำการปกติ)`,
      'ยืนยันลบ'
    );

    if (confirmed) {
      storageService.deleteAttendanceMultipleDays(user.id, validDates);
      validDates.forEach(d => {
        storageService.removePublicHoliday(d, true);
      });
      onSaved();
      onClose();
      alertHelper.toastInfo(`ลบการลงเวลาและยกเลิกวันหยุดเรียบร้อยแล้ว`);
    }
  };

  const handleCancelHoliday = async (dayNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const dStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const confirmed = await alertHelper.confirm(
      'ยกเลิกวันหยุดราชการ',
      `ต้องการยกเลิกวันหยุดวันที่ ${dayNum} กลับเป็นวันทำการปกติ (/) สำหรับทุกคน หรือไม่?`,
      'ยืนยันยกเลิกวันหยุด'
    );
    if (confirmed) {
      storageService.removePublicHoliday(dStr, true);
      onSaved();
      onClose();
      alertHelper.toastSuccess(`ยกเลิกวันหยุดวันที่ ${dayNum} กลับเป็นวันทำการปกติเรียบร้อยแล้ว`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150 my-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-blue-900 tracking-tight">
              ลงเวลา
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              {user.title}{user.firstName} {user.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Section 1: เลือกวัน (เลือกได้หลายวัน) */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold text-slate-700">
              เลือกวัน (เลือกได้หลายวัน)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const workingDays: number[] = [];
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    if (!isWeekend(dStr)) workingDays.push(d);
                  }
                  setSelectedDays(workingDays);
                }}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                เลือกวันทำการทั้งหมด
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setSelectedDays([])}
                className="text-[11px] text-slate-500 hover:underline cursor-pointer"
              >
                ล้างที่เลือก
              </button>
            </div>
          </div>

          {/* 7-Columns Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const weekend = isWeekend(dateStr);
              const isSelected = selectedDays.includes(day);
              const holidayInfo = !weekend ? holidayMap.get(day) : undefined;
              const isHoliday = Boolean(holidayInfo);

              let buttonClass = 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer';

              if (weekend) {
                buttonClass = 'bg-[#fee8e8] text-rose-300 border-rose-100 cursor-not-allowed opacity-60 select-none';
              } else if (isSelected) {
                buttonClass = isHoliday
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300 scale-102 cursor-pointer'
                  : 'bg-[#0b5ed7] text-white border-[#0b5ed7] shadow-sm ring-2 ring-blue-300 scale-102 cursor-pointer';
              } else if (isHoliday) {
                // วันหยุดราชการประจำปี: แสดงสีส้มอ่อนพร้อมกรอบและป้ายวันหยุด
                buttonClass = 'bg-[#fff5f0] text-amber-950 border-amber-300 hover:bg-amber-100 hover:border-amber-400 cursor-pointer shadow-xs';
              }

              return (
                <button
                  key={day}
                  type="button"
                  disabled={weekend}
                  onClick={() => handleToggleDay(day)}
                  title={
                    weekend
                      ? 'วันหยุดเสาร์-อาทิตย์ (ไม่ต้องลงเวลา)'
                      : isHoliday
                      ? `วันที่ ${day}: วันหยุดราชการ (${holidayInfo?.name})`
                      : `วันที่ ${day}`
                  }
                  className={`h-11 sm:h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all border relative ${buttonClass}`}
                >
                  <span className={`text-sm ${isHoliday && !isSelected && !weekend ? 'font-black text-amber-950' : ''}`}>
                    {day}
                  </span>
                  {weekend ? (
                    <span className="text-[9px] text-rose-400 font-normal">หยุด</span>
                  ) : isHoliday ? (
                    <span
                      className={`text-[8px] font-bold truncate max-w-[44px] leading-tight px-0.5 ${
                        isSelected ? 'text-amber-100' : 'text-red-600'
                      }`}
                    >
                      วันหยุด
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* กล่องแสดงรายการวันหยุดราชการประจำเดือนนี้ */}
          {holidayMap.size > 0 && (
            <div className="mt-3 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-left text-xs shadow-2xs">
              <div className="font-bold text-amber-950 flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-umbrella-beach text-amber-600"></i>
                  <span>วันหยุดราชการ / ประจำปีในเดือนนี้ ({holidayMap.size} วัน):</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const workingHolidayDays = Array.from(holidayMap.keys()).filter(d => {
                      const dStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      return !isWeekend(dStr);
                    });
                    setSelectedDays(workingHolidayDays);
                    setSelectedSymbol('ห');
                    if (workingHolidayDays.length === 1) {
                      const h = holidayMap.get(workingHolidayDays[0]);
                      if (h) setHolidayNote(h.name);
                    }
                  }}
                  className="text-[10px] text-amber-800 hover:text-amber-950 hover:underline font-bold cursor-pointer"
                  title="คลิกเพื่อเลือกวันหยุดราชการทั้งหมดในเดือนนี้พร้อมระบุสถานะวันหยุด (ห)"
                >
                  เลือกวันหยุดทั้งหมด
                </button>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] text-slate-700 pr-1">
                {Array.from(holidayMap.entries())
                  .sort((a, b) => a[0] - b[0])
                  .map(([d, info]) => {
                    const isSelected = selectedDays.includes(d);
                    return (
                      <div
                        key={d}
                        onClick={() => !info.isWeekend && handleToggleDay(d)}
                        className={`flex items-center justify-between gap-2 p-1 rounded-md transition ${
                          info.isWeekend
                            ? 'opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-amber-200/60 font-semibold cursor-pointer'
                            : 'hover:bg-amber-100/60 cursor-pointer'
                        }`}
                        title={info.isWeekend ? 'ตรงกับวันหยุดเสาร์-อาทิตย์' : 'คลิกเพื่อเลือก/ยกเลิกวันที่นี้'}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-blue-600' : 'bg-red-500'
                            }`}
                          ></span>
                          <span>
                            วันที่ <b>{d}</b>: {info.name}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {info.isWeekend ? (
                            <span className="text-[9px] text-slate-400">(เสาร์-อาทิตย์)</span>
                          ) : (
                            <>
                              {isSelected && (
                                <span className="text-[9px] text-blue-700 font-bold mr-1">✓ เลือก</span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleCancelHoliday(d, e)}
                                className="text-red-600 hover:text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 transition border border-red-200 cursor-pointer"
                                title="ยกเลิกวันหยุดนี้กลับเป็นวันทำการปกติ"
                              >
                                <i className="fa-solid fa-trash-can mr-0.5"></i> ลบ
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Selection indicator label */}
          {(() => {
            const workingSelectedCount = selectedDays.filter(d => !holidayMap.has(d)).length;
            const holidaySelectedCount = selectedDays.filter(d => holidayMap.has(d)).length;
            return (
              <div className="mt-2.5 text-xs font-bold text-blue-700 flex items-center justify-between flex-wrap gap-1">
                <span>เลือกแล้ว {workingSelectedCount} วันทำการ</span>
                {holidaySelectedCount > 0 && (
                  <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
                    วันหยุด {holidaySelectedCount} วัน (ไม่นับในวันทำการ)
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Section 2: เลือกสถานะ */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-slate-700 mb-2.5">
            เลือกสถานะ
          </label>

          <div className="grid grid-cols-3 gap-2">
            {statusOptions.map(opt => {
              const isChosen = selectedSymbol === opt.symbol;
              const isHolidayOpt = opt.symbol === 'ห';
              return (
                <button
                  key={opt.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(opt.symbol)}
                  className={`p-2 sm:p-2.5 rounded-xl border flex items-center gap-1.5 sm:gap-2 transition cursor-pointer text-xs font-bold ${
                    isChosen
                      ? isHolidayOpt
                        ? 'border-red-500 bg-red-50 text-red-900 shadow-sm ring-2 ring-red-400'
                        : 'border-[#0b5ed7] bg-blue-50/70 text-blue-900 shadow-xs ring-2 ring-blue-300'
                      : isHolidayOpt
                      ? 'bg-red-50/50 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center text-sm font-black ${opt.color}`}>
                    {opt.symbol}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {selectedSymbol === 'ห' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                <i className="fa-solid fa-calendar-star text-red-600"></i>
                <span>รายละเอียดวันหยุด (แสดงในตารางด้วยสีแดง)</span>
              </div>
              <input
                type="text"
                value={holidayNote}
                onChange={e => setHolidayNote(e.target.value)}
                placeholder="ชื่อวันหยุด เช่น วันหยุดราชการ, วันสงกรานต์, วันปิยมหาราช"
                className="w-full text-xs bg-white border border-red-300 rounded-lg p-2 focus:ring-2 focus:ring-red-400 focus:outline-none font-medium text-slate-800"
              />
              {allUsers && allUsers.length > 1 && (
                <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-red-950 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={e => setApplyToAll(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer accent-red-600"
                  />
                  <span>นำสถานะวันหยุดนี้ไปใช้กับบุคลากรทุกคนในหน่วยงาน ({allUsers.length} ท่าน)</span>
                </label>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-2">
            เลือกสถานะก่อนกดบันทึก
          </p>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          {/* Left: ลบการลงเวลา */}
          <button
            type="button"
            onClick={handleDeleteAttendance}
            className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-eraser text-rose-500 text-sm"></i>
            <span>ลบการลงเวลา</span>
          </button>

          {/* Right: ปิด & บันทึก */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-slate-400"></i>
              <span>ปิด</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-[#6095ea] hover:bg-[#0b5ed7] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk text-white"></i>
              <span>บันทึก</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
