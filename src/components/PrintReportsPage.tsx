import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { UserPersonnel, AttendanceRecord, SystemSettings, DepartmentGroup, AttendanceSymbol, PositionType, POSITIONS_BY_GROUP } from '../types';
import {
  THAI_MONTHS_FULL,
  formatThaiDate,
  formatThaiMonthYear,
  getDaysInMonth,
  getFiscalYearRange,
  isWeekend
} from '../utils/thaiDate';
import { storageService } from '../services/storage';

interface PrintReportsPageProps {
  users: UserPersonnel[];
  attendanceLogs: AttendanceRecord[];
  settings: SystemSettings;
}

export const PrintReportsPage: React.FC<PrintReportsPageProps> = ({
  users,
  attendanceLogs,
  settings
}) => {
  const queryParams = new URLSearchParams(window.location.search);
  const initialReportType = (queryParams.get('reportType') as 'monthly' | 'leave-summary' | 'individual') || 'monthly';
  const initialMonth = queryParams.get('month') !== null ? parseInt(queryParams.get('month')!) : new Date().getMonth();
  const initialYearBE = queryParams.get('yearBE') !== null ? parseInt(queryParams.get('yearBE')!) : settings.currentFiscalYear;
  const initialGroup = queryParams.get('group') || 'all';
  const initialPosition = queryParams.get('position') || 'all';
  const initialUserId = queryParams.get('userId') || (users[0]?.id || '');

  const [reportType, setReportType] = useState<'monthly' | 'leave-summary' | 'individual'>(initialReportType);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth); // 0-11
  const [selectedYearBE, setSelectedYearBE] = useState<number>(initialYearBE);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [selectedPosition, setSelectedPosition] = useState<string>(initialPosition);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId);

  const yearCE = selectedYearBE - 543;
  const daysInMonth = getDaysInMonth(yearCE, selectedMonth);

  // ช่วงปีงบประมาณ
  const fiscalRange = getFiscalYearRange(selectedYearBE);

  // Available positions based on selected group
  const availablePositionsForFilter = selectedGroup === 'all'
    ? Array.from(new Set(Object.values(POSITIONS_BY_GROUP).flat()))
    : (POSITIONS_BY_GROUP[selectedGroup as DepartmentGroup] || []);

  // Filter users by selectedGroup and selectedPosition
  const filteredUsers = users.filter(u => {
    if (selectedGroup !== 'all' && u.departmentGroup !== selectedGroup) return false;
    if (selectedPosition !== 'all' && u.position !== selectedPosition) return false;
    return true;
  });

  const positionOrder = [
    'ลูกจ้างประจำ',
    'ข้าราชการพลเรือนในสถาบันอุดมศึกษา',
    'ข้าราชการ',
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

  const DEPARTMENT_GROUPS: DepartmentGroup[] = [
    'ข้าราชการ+ลูกจ้าง',
    'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
    'อาจารย์'
  ];

  // Map attendance by userId and ISO date
  const logsMap = new Map<string, string>(); // `userId_YYYY-MM-DD` -> symbol
  attendanceLogs.forEach(log => {
    logsMap.set(`${log.userId}_${log.date}`, log.symbol);
  });

  // URL for opening standalone printable window
  const printUrl = `${window.location.origin}${window.location.pathname}?tab=print&autoprint=true&reportType=${reportType}&month=${selectedMonth}&yearBE=${selectedYearBE}&group=${encodeURIComponent(selectedGroup)}&position=${encodeURIComponent(selectedPosition)}&userId=${selectedUserId}`;

  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn('Direct print blocked by sandbox:', e);
    }

    // In iframe preview, sandbox may block print()
    if (window.self !== window.top) {
      Swal.fire({
        title: 'สั่งพิมพ์เอกสารราชการ',
        html: `
          <div class="text-left text-xs text-slate-600 space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p>เนื่องจากระบบกำลังทำงานอยู่ในหน้าจอพรีวิว (iFrame Sandbox) ของเบราว์เซอร์ เบราว์เซอร์อาจจำกัดหน้าต่างสั่งพิมพ์อัตโนมัติ</p>
            <p class="font-semibold text-slate-800">กรุณากดปุ่มด้านล่างเพื่อเปิดหน้าต่างเอกสารเต็มจอ และสั่งพิมพ์ / บันทึก PDF ได้ทันที:</p>
          </div>
          <a
            href="${printUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow-lg transition"
          >
            <i class="fa-solid fa-arrow-up-right-from-square text-amber-400"></i>
            <span>เปิดหน้าต่างพิมพ์เต็มจอ (Print / PDF) ทันที</span>
          </a>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          popup: 'rounded-2xl font-sans'
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel (Hidden during actual print) */}
      <div className="no-print bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-print text-blue-800"></i>
              <span>4. ศูนย์สั่งพิมพ์เอกสารและรายงานทางราชการ</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              พิมพ์แบบฟอร์มตามระเบียบงานสารบรรณและระเบียบการลาของทางราชการ
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="bg-blue-900 hover:bg-blue-950 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              <i className="fa-solid fa-print text-amber-400 text-sm"></i>
              <span>สั่งพิมพ์เอกสาร (Print / PDF)</span>
            </button>

            <a
              href={printUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
              title="เปิดในแท็บใหม่เพื่อพิมพ์โดยตรง (แนะนำเมื่ออยู่ในหน้าต่างพรีวิว)"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-sm"></i>
              <span>เปิดพิมพ์ในแท็บใหม่</span>
            </a>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setReportType('monthly')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              reportType === 'monthly'
                ? 'bg-blue-950 text-white border-blue-950 shadow-sm ring-2 ring-amber-400'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-2">
              <i className="fa-solid fa-calendar-days text-amber-400"></i>
              <span>1. บัญชีงบเดือนเวลาทำการ</span>
            </div>
            <div className="text-[11px] opacity-80 mt-1">
              ตาราง 1 - 31 วัน แสดงสัญลักษณ์ /, ศ, ป, ก, ค, อ, พ, ร พร้อมสรุปยอด
            </div>
          </button>

          <button
            onClick={() => setReportType('leave-summary')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              reportType === 'leave-summary'
                ? 'bg-blue-950 text-white border-blue-950 shadow-sm ring-2 ring-amber-400'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-amber-400"></i>
              <span>2. พิมพ์แบบสรุปวันลาประจำปี</span>
            </div>
            <div className="text-[11px] opacity-80 mt-1">
              สรุปวันลาพักผ่อนสะสม วันลาที่ใช้ไป และวันลาคงเหลือตามปีงบประมาณ
            </div>
          </button>

          <button
            onClick={() => setReportType('individual')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              reportType === 'individual'
                ? 'bg-blue-950 text-white border-blue-950 shadow-sm ring-2 ring-amber-400'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-2">
              <i className="fa-solid fa-id-card text-amber-400"></i>
              <span>3. บัตรสรุปวันลารายบุคคล</span>
            </div>
            <div className="text-[11px] opacity-80 mt-1">
              พิมพ์บัตรประวัติการปฏิบัติราชการและวันลาของบุคลากรรายบุคคล
            </div>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          {reportType === 'monthly' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">ประจำเดือน:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg p-1.5 font-medium"
              >
                {THAI_MONTHS_FULL.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              {reportType === 'monthly' ? 'ปี พ.ศ.:' : 'ปีงบประมาณ พ.ศ.:'}
            </span>
            <select
              value={selectedYearBE}
              onChange={e => setSelectedYearBE(parseInt(e.target.value))}
              className="bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-blue-900"
            >
              <option value={2567}>2567</option>
              <option value={2568}>2568</option>
              <option value={2569}>2569</option>
              <option value={2570}>2570</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">กลุ่มงาน:</span>
            <select
              value={selectedGroup}
              onChange={e => {
                setSelectedGroup(e.target.value);
                setSelectedPosition('all');
              }}
              className="bg-white border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800"
            >
              <option value="all">ทุกกลุ่มงาน</option>
              <option value="ข้าราชการ+ลูกจ้าง">1. ข้าราชการ+ลูกจ้าง</option>
              <option value="พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ">2. พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ</option>
              <option value="อาจารย์">3. อาจารย์</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">ตำแหน่งงาน:</span>
            <select
              value={selectedPosition}
              onChange={e => setSelectedPosition(e.target.value)}
              className="bg-white border border-blue-200 bg-blue-50/30 rounded-lg p-1.5 font-semibold text-blue-900"
            >
              <option value="all">ทุกตำแหน่ง {selectedGroup !== 'all' ? '(ในกลุ่มที่เลือก)' : ''}</option>
              {availablePositionsForFilter.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {reportType === 'individual' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">เลือกบุคลากร:</span>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg p-1.5 font-medium"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.title}{u.firstName} {u.lastName} ({u.departmentGroup})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* REPORT 1: บัญชีงบเดือนเวลาทำการ (Monthly Attendance Ledger)    */}
      {/* ============================================================== */}
      {reportType === 'monthly' && (
        <div className="bg-white rounded-xl shadow-md border border-slate-300 p-6 sm:p-8 text-black print:p-0 print:border-none print:shadow-none">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold tracking-tight">บัญชีลงเวลาการปฏิบัติราชการ</h1>
            <h2 className="text-sm font-semibold">{settings.agencyName} {settings.departmentSubName}</h2>
            <p className="text-xs mt-0.5">
              ประจำเดือน <b>{THAI_MONTHS_FULL[selectedMonth]}</b> พ.ศ. <b>{selectedYearBE}</b>
            </p>
            {selectedGroup !== 'all' && (
              <p className="text-xs text-slate-600">กลุ่มงาน: {selectedGroup}</p>
            )}
          </div>

          {/* Ledger Table 1-31 days styled exactly like the official ledger in the image */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-700 text-center text-[10px] leading-tight">
              <thead>
                <tr className="text-white text-[11px] font-bold">
                  <th rowSpan={2} className="bg-[#0b5ed7] border border-slate-700 p-1 w-8">
                    ลำดับ
                  </th>
                  <th rowSpan={2} className="bg-[#0b5ed7] border border-slate-700 p-1 text-center w-48">
                    ชื่อ-นามสกุล
                  </th>
                  <th rowSpan={2} className="bg-[#0b5ed7] border border-slate-700 p-1 w-12 text-center">
                    <div className="leading-tight text-[10px]">
                      <div>รวม</div>
                      <div>วันทำการ</div>
                    </div>
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const weekend = isWeekend(dateStr);
                    const holidayRec = !weekend ? attendanceLogs.find(l => l.date === dateStr && l.symbol === 'ห') : undefined;
                    const isDateHoliday = Boolean(holidayRec);
                    return (
                      <th
                        key={day}
                        rowSpan={2}
                        className={`border border-slate-700 p-0.5 w-6 text-center font-bold ${
                          weekend
                            ? 'bg-[#d92d20] text-white'
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
                  <th colSpan={8} className="bg-[#4c1d56] border border-slate-700 p-1 text-center font-bold text-white">
                    รวมเดือนนี้
                  </th>
                  <th colSpan={8} className="bg-[#d9531e] border border-slate-700 p-1 text-center font-bold text-white">
                    รวมตั้งแต่ต้นงบ
                  </th>
                  <th rowSpan={2} className="bg-[#0b5ed7] border border-slate-700 p-1 w-16 text-center font-bold text-white">
                    หมายเหตุ
                  </th>
                </tr>
                <tr className="text-white text-[9px] font-bold">
                  {(['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as AttendanceSymbol[]).map(sym => (
                    <th key={`pm_${sym}`} className="bg-[#3b1244] border border-slate-700 p-0.5 w-5 text-center text-purple-100">
                      {sym}
                    </th>
                  ))}
                  {(['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as AttendanceSymbol[]).map(sym => (
                    <th key={`pc_${sym}`} className="bg-[#b43c10] border border-slate-700 p-0.5 w-5 text-center text-orange-100">
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3 + daysInMonth + 8 + 8 + 1} className="border border-slate-600 p-8 text-center text-slate-400">
                      ไม่พบข้อมูลบุคลากรในกลุ่มงานหรือตำแหน่งที่เลือก
                    </td>
                  </tr>
                ) : (
                  (selectedGroup === 'all'
                    ? DEPARTMENT_GROUPS
                    : [selectedGroup as DepartmentGroup]
                  ).map(grp => {
                    const groupUsers = filteredUsers.filter(u => u.departmentGroup === grp);
                    if (groupUsers.length === 0) return null;

                    const groupPositions = Array.from(new Set(groupUsers.map(u => u.position)))
                      .sort((a, b) => {
                        const idxA = positionOrder.indexOf(a);
                        const idxB = positionOrder.indexOf(b);
                        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
                      });

                    return (
                      <React.Fragment key={grp}>
                        {/* Group Header Banner Row (shown when all groups are selected) */}
                        {selectedGroup === 'all' && (
                          <tr className="bg-[#0b5ed7] text-white font-bold border border-slate-700 print:bg-slate-200 print:text-black">
                            <td
                              colSpan={3 + daysInMonth + 8 + 8 + 1}
                              className="text-left px-3 py-1.5 text-xs font-bold"
                            >
                              <span>กลุ่มงาน: {grp}</span>
                            </td>
                          </tr>
                        )}

                        {/* Position Groups matching MonthlyLedgerTable */}
                        {groupPositions.map(posName => {
                          const posUsers = groupUsers.filter(u => u.position === posName);
                          if (posUsers.length === 0) return null;

                          return (
                            <React.Fragment key={posName}>
                              {/* Position Banner Row matching MonthlyLedgerTable */}
                              <tr className="bg-[#f0f6fe] border border-slate-600 print:bg-slate-100">
                                <td
                                  colSpan={3 + daysInMonth + 8 + 8 + 1}
                                  className="text-left font-bold text-[#0b5ed7] print:text-black px-3.5 py-1 text-[11px]"
                                >
                                  <span>{posName}</span>
                                </td>
                              </tr>

                              {/* User Rows */}
                              {posUsers.map((user, uIdx) => {
                                const monthCounts: Record<string, number> = { 'ศ': 0, 'ป': 0, 'ก': 0, 'ค': 0, 'อ': 0, 'พ': 0, 'ร': 0, 'ส': 0 };
                                const cumulativeCounts: Record<string, number> = { 'ศ': 0, 'ป': 0, 'ก': 0, 'ค': 0, 'อ': 0, 'พ': 0, 'ร': 0, 'ส': 0 };

                                const fiscalYearBE = selectedMonth >= 9 ? selectedYearBE + 1 : selectedYearBE;
                                const fiscalStartCE = `${fiscalYearBE - 543 - 1}-10-01`;
                                const monthEndCE = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

                                attendanceLogs
                                  .filter(log => log.userId === user.id && log.date >= fiscalStartCE && log.date <= monthEndCE && !isWeekend(log.date))
                                  .forEach(log => {
                                    if (cumulativeCounts[log.symbol] !== undefined) {
                                      cumulativeCounts[log.symbol]++;
                                    }
                                  });

                                return (
                                  <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="border border-slate-600 p-1 text-center font-medium">{uIdx + 1}</td>
                                    <td className="border border-slate-600 p-1 text-left pl-2 whitespace-nowrap">
                                      <span className="font-bold text-slate-900 text-[11px]">
                                        {user.title}{user.firstName} {user.lastName}
                                      </span>
                                    </td>
                                    <td className="border border-slate-600 p-1 text-center">
                                      <span className="font-bold text-blue-900">
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(day => {
                                          const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                          return !isWeekend(dateStr) && logsMap.get(`${user.id}_${dateStr}`) === '/';
                                        }).length}
                                      </span>
                                    </td>
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                      const dateStr = `${yearCE}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                      const weekend = isWeekend(dateStr);

                                      // ตรวจสอบวันหยุดราชการ (ห)
                                      const holidayRec = !weekend
                                        ? attendanceLogs.find(l => l.date === dateStr && l.symbol === 'ห')
                                        : undefined;
                                      const isHoliday = Boolean(holidayRec);
                                      const holidayName = holidayRec?.note?.trim() || 'วันหยุดราชการ';

                                      // หากเป็นวันหยุดราชการ รวมช่องทุกแถวในกลุ่มตำแหน่งนี้เป็นคอลัมน์แนวตั้งสีชมพูอ่อน ตัวอักษรสีแดงจากบนลงล่าง
                                      if (isHoliday) {
                                        if (uIdx === 0) {
                                          return (
                                            <td
                                              key={day}
                                              rowSpan={posUsers.length}
                                              className="border border-slate-600 p-0 text-center bg-[#fee8e8] print:bg-[#fee8e8] align-middle select-none"
                                              title={`${formatThaiDate(dateStr)}: วันหยุดราชการ (${holidayName})`}
                                            >
                                              <div className="h-full min-h-[50px] w-full flex items-center justify-center p-1">
                                                <span
                                                  className="font-bold text-red-600 text-[8px] tracking-wider whitespace-nowrap"
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

                                      const sym = logsMap.get(`${user.id}_${dateStr}`);
                                      if (!weekend && sym && monthCounts[sym] !== undefined) {
                                        monthCounts[sym]++;
                                      }

                                      return (
                                        <td
                                          key={day}
                                          className={`border border-slate-600 p-0.5 font-bold ${
                                            weekend
                                              ? 'bg-[#fee8e8] text-rose-800'
                                              : 'bg-white text-slate-800'
                                          }`}
                                        >
                                          {weekend ? '' : (sym || '-')}
                                        </td>
                                      );
                                    })}
                                    {/* รวมเดือนนี้ */}
                                    {(['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as AttendanceSymbol[]).map(sym => (
                                      <td key={`pmc_${sym}`} className="border border-slate-600 p-0.5 text-center font-mono bg-purple-50/20 text-purple-900">
                                        {monthCounts[sym] > 0 ? monthCounts[sym] : '-'}
                                      </td>
                                    ))}
                                    {/* รวมตั้งแต่ต้นงบ */}
                                    {(['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as AttendanceSymbol[]).map(sym => (
                                      <td key={`pcc_${sym}`} className="border border-slate-600 p-0.5 text-center font-mono bg-orange-50/20 text-orange-900">
                                        {cumulativeCounts[sym] > 0 ? cumulativeCounts[sym] : '-'}
                                      </td>
                                    ))}
                                    <td className="border border-slate-600 p-1 text-center text-[9px] text-slate-800">
                                      {storageService.getMonthlyNote(user.id, selectedYearBE, selectedMonth) || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Official Legend */}
          <div className="mt-3 text-[10px] text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-bold">ตัวย่อสัญลักษณ์:</span>
            <span><b>/</b> = มาทำงาน</span>
            <span><b>ศ</b> = ศึกษาต่อ</span>
            <span><b>ป</b> = ลาป่วย</span>
            <span><b>ก</b> = ลากิจ</span>
            <span><b>ค</b> = ลาคลอด</span>
            <span><b>อ</b> = ลาอุปสมบท</span>
            <span><b>พ</b> = ลาพักร้อน</span>
            <span><b>ร</b> = ราชการ</span>
            <span><b>ส</b> = มาสาย</span>
          </div>

          {/* Official Signatures Block */}
          <div className="mt-10 grid grid-cols-2 text-center text-xs">
            <div>
              <p>ขอรับรองว่าการลงเวลาเป็นความจริงทุกประการ</p>
              <div className="mt-10 font-bold">(ลงชื่อ) ................................................................</div>
              <p className="mt-1.5">( {settings.responsibleOfficerName} )</p>
              <p className="text-[11px] text-slate-600">{settings.responsibleOfficerPosition}</p>
              <p className="text-[10px] text-slate-500 mt-1">วันที่ .......... เดือน .................... พ.ศ. ...........</p>
            </div>

            <div>
              <p>ทราบและตรวจสอบถูกต้องแล้ว</p>
              <div className="mt-10 font-bold">(ลงชื่อ) ................................................................</div>
              <p className="mt-1.5">( {settings.supervisorName} )</p>
              <p className="text-[11px] text-slate-600">{settings.supervisorPosition}</p>
              <p className="text-[10px] text-slate-500 mt-1">วันที่ .......... เดือน .................... พ.ศ. ...........</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REPORT 2: พิมพ์แบบสรุปวันลาประจำปีงบประมาณ                     */}
      {/* ============================================================== */}
      {reportType === 'leave-summary' && (
        <div className="bg-white rounded-xl shadow-md border border-slate-300 p-6 sm:p-8 text-black print:p-0 print:border-none print:shadow-none">
          <div className="text-center mb-6">
            <h1 className="text-lg font-bold">แบบสรุปการลาปฏิบัติราชการ ประจำปีงบประมาณ พ.ศ. {selectedYearBE}</h1>
            <h2 className="text-sm font-semibold">{settings.agencyName} {settings.departmentSubName}</h2>
            <p className="text-xs text-slate-700 mt-1">
              (รอบระยะเวลาตั้งแต่วันที่ <b>{fiscalRange.startBEText}</b> ถึง วันที่ <b>{fiscalRange.endBEText}</b>)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-center text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black p-2 w-10" rowSpan={2}>ที่</th>
                  <th className="border border-black p-2 text-left w-56" rowSpan={2}>
                    ชื่อ - สกุล / กลุ่มงาน / ตำแหน่ง
                  </th>
                  <th className="border border-black p-2" colSpan={4}>
                    วันลาพักผ่อนประจำปี (วันทำการ)
                  </th>
                  <th className="border border-black p-2" colSpan={4}>
                    การลาประเภทอื่น (วันทำการ)
                  </th>
                  <th className="border border-black p-2 w-20" rowSpan={2}>
                    หมายเหตุ
                  </th>
                </tr>
                <tr className="bg-slate-50 text-[11px]">
                  <th className="border border-black p-1 w-16">สะสมยกมา</th>
                  <th className="border border-black p-1 w-16">สิทธิ์ปีนี้</th>
                  <th className="border border-black p-1 w-16 text-rose-800">ใช้ไป</th>
                  <th className="border border-black p-1 w-16 font-bold text-emerald-900 bg-emerald-50">คงเหลือ</th>
                  <th className="border border-black p-1 w-16">ลาป่วย (ป)</th>
                  <th className="border border-black p-1 w-16">ลากิจ (ก)</th>
                  <th className="border border-black p-1 w-16">ไปราชการ (ร)</th>
                  <th className="border border-black p-1 w-16">ศึกษา/คลอด/อื่น</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-black p-8 text-center text-slate-400">
                      ไม่พบข้อมูลบุคลากรในกลุ่มงานหรือตำแหน่งที่เลือก
                    </td>
                  </tr>
                ) : (
                  (selectedGroup === 'all'
                    ? DEPARTMENT_GROUPS
                    : [selectedGroup as DepartmentGroup]
                  ).map(grp => {
                    const groupUsers = filteredUsers.filter(u => u.departmentGroup === grp);
                    if (groupUsers.length === 0) return null;

                    const groupPositions = Array.from(new Set(groupUsers.map(u => u.position)))
                      .sort((a, b) => {
                        const idxA = positionOrder.indexOf(a);
                        const idxB = positionOrder.indexOf(b);
                        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
                      });

                    return (
                      <React.Fragment key={grp}>
                        {selectedGroup === 'all' && (
                          <tr className="bg-slate-200 border border-black font-bold">
                            <td colSpan={11} className="text-left p-1.5 font-bold text-xs">
                              กลุ่มงาน: {grp}
                            </td>
                          </tr>
                        )}

                        {groupPositions.map(posName => {
                          const posUsers = groupUsers.filter(u => u.position === posName);
                          if (posUsers.length === 0) return null;

                          return (
                            <React.Fragment key={posName}>
                              <tr className="bg-slate-100 border border-black font-semibold">
                                <td colSpan={11} className="text-left px-3 py-1 text-[11px] font-bold text-blue-900">
                                  {posName}
                                </td>
                              </tr>

                              {posUsers.map((user, uIdx) => {
                                // ดึงประวัติการลงเวลาและวันลาทั้งหมดของบุคลากรท่านนี้ภายในปีงบประมาณที่เลือก
                                const userFiscalLogs = attendanceLogs.filter(log =>
                                  log.userId === user.id &&
                                  log.date >= fiscalRange.startCE &&
                                  log.date <= fiscalRange.endCE &&
                                  !isWeekend(log.date)
                                );

                                // นับจำนวนวันลาแต่ละประเภทจากบันทึกเวลาจริง
                                const vacationDaysFromLogs = userFiscalLogs.filter(l => l.symbol === 'พ').length;
                                const sickDays = userFiscalLogs.filter(l => l.symbol === 'ป').length;
                                const personalDays = userFiscalLogs.filter(l => l.symbol === 'ก').length;
                                const officialDays = userFiscalLogs.filter(l => l.symbol === 'ร').length;
                                const studyDays = userFiscalLogs.filter(l => l.symbol === 'ศ').length;
                                const maternityDays = userFiscalLogs.filter(l => l.symbol === 'ค').length;
                                const ordinationDays = userFiscalLogs.filter(l => l.symbol === 'อ').length;

                                // คำนวณวันลาพักผ่อน: รวมวันลาจากบันทึก + ข้อมูลตั้งต้น
                                const totalVacationUsed = (user.usedLeaveDays || 0) + vacationDaysFromLogs;
                                const totalVacationQuota = user.totalLeaveEntitled || ((user.accumulatedLeaveDays || 0) + (user.yearlyQuotaDays || 0));
                                const remainingVacation = Math.max(0, totalVacationQuota - totalVacationUsed);

                                // การลาประเภทอื่น (ศึกษา/คลอด/อื่น)
                                const otherParts: string[] = [];
                                if (studyDays > 0) otherParts.push(`ศ (${studyDays})`);
                                if (maternityDays > 0) otherParts.push(`ค (${maternityDays})`);
                                if (ordinationDays > 0) otherParts.push(`อ (${ordinationDays})`);
                                const otherDisplay = otherParts.length > 0 ? otherParts.join(', ') : '-';

                                // สรุปหมายเหตุ: ดึงหมายเหตุจากใบลา/บันทึกเวลาจริง
                                const leaveNotes = Array.from(
                                  new Set(
                                    userFiscalLogs
                                      .filter(l => l.note && l.note.trim() !== '' && l.symbol !== '/')
                                      .map(l => (l.note || '').trim())
                                  )
                                );
                                let remarksText = 'ปกติ';
                                if (leaveNotes.length > 0) {
                                  remarksText = leaveNotes.slice(0, 2).join('; ');
                                } else if (studyDays > 0) {
                                  remarksText = 'ศึกษาต่อ';
                                } else if (maternityDays > 0) {
                                  remarksText = 'ลาคลอดบุตร';
                                } else if (ordinationDays > 0) {
                                  remarksText = 'ลาอุปสมบท';
                                }

                                return (
                                  <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="border border-black p-1.5">{uIdx + 1}</td>
                                    <td className="border border-black p-1.5 text-left">
                                      <div className="font-bold text-slate-900">
                                        {user.title}{user.firstName} {user.lastName}
                                      </div>
                                    </td>
                                    <td className="border border-black p-1.5 font-mono">{user.accumulatedLeaveDays ?? 0}</td>
                                    <td className="border border-black p-1.5 font-mono">{user.yearlyQuotaDays ?? 0}</td>
                                    <td className="border border-black p-1.5 font-mono text-rose-800 font-semibold">
                                      {totalVacationUsed > 0 ? (totalVacationUsed % 1 === 0 ? totalVacationUsed : totalVacationUsed.toFixed(1)) : '-'}
                                    </td>
                                    <td className="border border-black p-1.5 font-mono font-bold text-emerald-900 bg-emerald-50">
                                      {remainingVacation % 1 === 0 ? remainingVacation : remainingVacation.toFixed(1)}
                                    </td>
                                    <td className="border border-black p-1.5 font-mono">
                                      {sickDays > 0 ? (sickDays % 1 === 0 ? `${sickDays}.0` : sickDays) : '-'}
                                    </td>
                                    <td className="border border-black p-1.5 font-mono">
                                      {personalDays > 0 ? (personalDays % 1 === 0 ? `${personalDays}.0` : personalDays) : '-'}
                                    </td>
                                    <td className="border border-black p-1.5 font-mono">
                                      {officialDays > 0 ? (officialDays % 1 === 0 ? `${officialDays}.0` : officialDays) : '-'}
                                    </td>
                                    <td className="border border-black p-1.5 font-mono text-slate-800">
                                      {otherDisplay}
                                    </td>
                                    <td className="border border-black p-1.5 text-[10px] text-slate-600 max-w-[120px] truncate" title={remarksText}>
                                      {remarksText}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-12 grid grid-cols-2 text-center text-xs">
            <div>
              <p>ขอรับรองว่าสรุปวันลาถูกต้องตามระเบียบ</p>
              <div className="mt-10 font-bold">(ลงชื่อ) ................................................................</div>
              <p className="mt-1.5">( {settings.responsibleOfficerName} )</p>
              <p className="text-[11px] text-slate-600">{settings.responsibleOfficerPosition}</p>
              <p className="text-[10px] text-slate-500 mt-1">ผู้จัดทำข้อมูล</p>
            </div>

            <div>
              <p>ทราบและอนุมัติรับรอง</p>
              <div className="mt-10 font-bold">(ลงชื่อ) ................................................................</div>
              <p className="mt-1.5">( {settings.supervisorName} )</p>
              <p className="text-[11px] text-slate-600">{settings.supervisorPosition}</p>
              <p className="text-[10px] text-slate-500 mt-1">ผู้บังคับบัญชาชั้นต้น</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REPORT 3: บัตรสรุปวันลารายบุคคล (Individual Leave Card)        */}
      {/* ============================================================== */}
      {reportType === 'individual' && (
        <div className="bg-white rounded-xl shadow-md border border-slate-300 p-6 sm:p-8 text-black print:p-0 print:border-none print:shadow-none">
          {(() => {
            const user = users.find(u => u.id === selectedUserId) || users[0];
            if (!user) return null;

            const userFiscalLogs = attendanceLogs.filter(log =>
              log.userId === user.id &&
              log.date >= fiscalRange.startCE &&
              log.date <= fiscalRange.endCE &&
              !isWeekend(log.date)
            );

            const vacationDaysFromLogs = userFiscalLogs.filter(l => l.symbol === 'พ').length;
            const sickDays = userFiscalLogs.filter(l => l.symbol === 'ป').length;
            const personalDays = userFiscalLogs.filter(l => l.symbol === 'ก').length;
            const officialDays = userFiscalLogs.filter(l => l.symbol === 'ร').length;
            const studyDays = userFiscalLogs.filter(l => l.symbol === 'ศ').length;
            const maternityDays = userFiscalLogs.filter(l => l.symbol === 'ค').length;
            const ordinationDays = userFiscalLogs.filter(l => l.symbol === 'อ').length;

            const totalVacationUsed = (user.usedLeaveDays || 0) + vacationDaysFromLogs;
            const totalVacationQuota = user.totalLeaveEntitled || ((user.accumulatedLeaveDays || 0) + (user.yearlyQuotaDays || 0));
            const remaining = Math.max(0, totalVacationQuota - totalVacationUsed);

            return (
              <div className="space-y-6">
                <div className="text-center pb-4 border-b border-black">
                  <h1 className="text-base font-bold">บัตรประวัติการปฏิบัติราชการและสรุปวันลาประจำปีงบประมาณ</h1>
                  <h2 className="text-sm font-semibold">{settings.agencyName} {settings.departmentSubName}</h2>
                  <p className="text-xs text-slate-700 mt-1">
                    ปีงบประมาณ พ.ศ. <b>{selectedYearBE}</b> ({fiscalRange.startBEText} - {fiscalRange.endBEText})
                  </p>
                </div>

                {/* Personal Profile Info */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 border border-slate-300 rounded-lg">
                  <div>
                    <p><b>ชื่อ-สกุล:</b> {user.title}{user.firstName} {user.lastName}</p>
                    <p className="mt-1"><b>กลุ่มงาน:</b> {user.departmentGroup}</p>
                  </div>
                  <div>
                    <p><b>ตำแหน่ง:</b> {user.position}</p>
                    <p className="mt-1"><b>วันเริ่มปฏิบัติราชการ:</b> {formatThaiDate(user.startDate)}</p>
                  </div>
                </div>

                {/* Leave Quota Card */}
                <div>
                  <h3 className="font-bold text-xs mb-2">บัญชีสิทธิ์วันลาพักผ่อนประจำปีงบประมาณ พ.ศ. {selectedYearBE}</h3>
                  <table className="w-full border-collapse border border-black text-center text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-2">วันลาสะสมยกมา (วัน)</th>
                        <th className="border border-black p-2">สิทธิ์ลาพักผ่อนปีนี้ (วัน)</th>
                        <th className="border border-black p-2">รวมสิทธิ์วันลาทั้งสิ้น (วัน)</th>
                        <th className="border border-black p-2 text-rose-800">วันลาที่ใช้ไปแล้ว (วัน)</th>
                        <th className="border border-black p-2 font-bold text-emerald-900 bg-emerald-50">วันลาคงเหลือสุทธิ (วัน)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-3 font-mono text-sm">{user.accumulatedLeaveDays ?? 0}</td>
                        <td className="border border-black p-3 font-mono text-sm">{user.yearlyQuotaDays ?? 0}</td>
                        <td className="border border-black p-3 font-mono text-sm font-bold">{totalVacationQuota}</td>
                        <td className="border border-black p-3 font-mono text-sm text-rose-800 font-bold">{totalVacationUsed}</td>
                        <td className="border border-black p-3 font-mono text-base font-extrabold text-emerald-900 bg-emerald-50">{remaining}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Other Leaves Summary */}
                <div>
                  <h3 className="font-bold text-xs mb-2">สรุปวันลาประเภทอื่นและไปราชการประจำปีงบประมาณ พ.ศ. {selectedYearBE}</h3>
                  <table className="w-full border-collapse border border-black text-center text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-2">ลาป่วย (ป)</th>
                        <th className="border border-black p-2">ลากิจส่วนตัว (ก)</th>
                        <th className="border border-black p-2">ไปปฏิบัติราชการ (ร)</th>
                        <th className="border border-black p-2">ลาศึกษาต่อ (ศ)</th>
                        <th className="border border-black p-2">ลาคลอดบุตร (ค)</th>
                        <th className="border border-black p-2">ลาอุปสมบท (อ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-2.5 font-mono">{sickDays > 0 ? `${sickDays} วัน` : '-'}</td>
                        <td className="border border-black p-2.5 font-mono">{personalDays > 0 ? `${personalDays} วัน` : '-'}</td>
                        <td className="border border-black p-2.5 font-mono">{officialDays > 0 ? `${officialDays} วัน` : '-'}</td>
                        <td className="border border-black p-2.5 font-mono">{studyDays > 0 ? `${studyDays} วัน` : '-'}</td>
                        <td className="border border-black p-2.5 font-mono">{maternityDays > 0 ? `${maternityDays} วัน` : '-'}</td>
                        <td className="border border-black p-2.5 font-mono">{ordinationDays > 0 ? `${ordinationDays} วัน` : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="mt-14 grid grid-cols-2 text-center text-xs">
                  <div>
                    <div className="font-bold">(ลงชื่อ) ................................................................</div>
                    <p className="mt-1">( {user.title}{user.firstName} {user.lastName} )</p>
                    <p className="text-[11px] text-slate-600">เจ้าของประวัติวันลา</p>
                  </div>
                  <div>
                    <div className="font-bold">(ลงชื่อ) ................................................................</div>
                    <p className="mt-1">( {settings.supervisorName} )</p>
                    <p className="text-[11px] text-slate-600">{settings.supervisorPosition}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Bottom Print Buttons */}
      <div className="no-print flex flex-wrap items-center justify-center gap-3 pb-8 pt-2">
        <button
          onClick={handlePrint}
          className="bg-blue-900 hover:bg-blue-950 text-white font-bold py-3 px-8 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
        >
          <i className="fa-solid fa-print text-amber-400 text-base"></i>
          <span>สั่งพิมพ์เอกสาร (Print / PDF)</span>
        </button>

        <a
          href={printUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition"
        >
          <i className="fa-solid fa-arrow-up-right-from-square text-base"></i>
          <span>เปิดพิมพ์ในแท็บใหม่ (เต็มจอ)</span>
        </a>
      </div>
    </div>
  );
};
