import React from 'react';
import { UserPersonnel, AttendanceRecord, AttendanceSymbol } from '../types';
import { ATTENDANCE_SYMBOLS, THAI_DAYS_FULL, formatThaiDate } from '../utils/thaiDate';

interface CumulativeLeaveModalProps {
  user: UserPersonnel;
  symbol: AttendanceSymbol;
  records: AttendanceRecord[];
  fiscalStartText: string;
  monthEndText: string;
  fiscalYearBE: number;
  onClose: () => void;
}

export const CumulativeLeaveModal: React.FC<CumulativeLeaveModalProps> = ({
  user,
  symbol,
  records,
  fiscalStartText,
  monthEndText,
  fiscalYearBE,
  onClose
}) => {
  const symDef = ATTENDANCE_SYMBOLS[symbol] || ATTENDANCE_SYMBOLS['/'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 py-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
              <i className="fa-regular fa-calendar-check text-xl text-amber-400"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  ประวัติการลาตั้งแต่ต้นปีงบประมาณ
                </h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${symDef.badgeClass}`}>
                  <span>{symDef.symbol}</span>
                  <span>{symDef.name}</span>
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                ปีงบประมาณ พ.ศ. {fiscalYearBE} (รอบระยะเวลา {fiscalStartText} ถึง {monthEndText})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* User Info Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-bold text-slate-900 text-sm">
              {user.title}{user.firstName} {user.lastName}
            </div>
            <div className="text-slate-500 font-medium mt-0.5">
              <span>{user.position}</span>
              <span className="mx-1.5">•</span>
              <span>{user.departmentGroup}</span>
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-100 text-orange-950 font-bold border border-orange-200 text-xs">
              <i className="fa-solid fa-chart-simple text-orange-700"></i>
              <span>รวมการลาทั้งสิ้น: <b>{records.length}</b> วันทำการ</span>
            </span>
          </div>
        </div>

        {/* Records Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {records.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <i className="fa-regular fa-folder-open text-2xl"></i>
              </div>
              <p className="text-slate-700 font-bold text-sm">ไม่มีประวัติการ{symDef.name}</p>
              <p className="text-slate-400 text-xs mt-1">
                ไม่พบข้อมูลการบันทึกสถานะ "{symDef.symbol} {symDef.name}" ตั้งแต่วันที่ {fiscalStartText} ถึง {monthEndText}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                    <th className="py-2.5 px-3">วันที่ลา</th>
                    <th className="py-2.5 px-3 text-center w-24">สัญลักษณ์</th>
                    <th className="py-2.5 px-3">หมายเหตุ / เหตุผลการลา</th>
                    <th className="py-2.5 px-3 text-center w-32">บันทึกโดย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec, idx) => {
                    const dateObj = new Date(rec.date);
                    const dayOfWeek = THAI_DAYS_FULL[dateObj.getDay()] || '';

                    return (
                      <tr key={rec.id} className="hover:bg-blue-50/40 transition">
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <i className="fa-regular fa-calendar text-blue-700 text-[11px]"></i>
                            <span>{dayOfWeek}ที่ {formatThaiDate(rec.date)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${symDef.badgeClass}`}>
                            {rec.symbol}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {rec.note ? (
                            <span className="text-slate-800">{rec.note}</span>
                          ) : (
                            <span className="text-slate-400 italic">ไม่ได้ระบุหมายเหตุ</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 text-[11px]">
                          {rec.recordedBy || 'ระบบลงเวลา'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <i className="fa-solid fa-circle-info text-blue-600"></i>
            <span>ข้อมูลสรุปตามปีงบประมาณราชการ (1 ต.ค. - 30 ก.ย.)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
