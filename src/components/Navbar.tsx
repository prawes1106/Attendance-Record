import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import { formatThaiDate, getFiscalYearRange } from '../utils/thaiDate';

interface NavbarProps {
  currentTab: 'attendance' | 'users' | 'settings' | 'print';
  onSelectTab: (tab: 'attendance' | 'users' | 'settings' | 'print') => void;
  settings: SystemSettings;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, settings }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fiscalInfo = getFiscalYearRange(settings.currentFiscalYear);

  return (
    <header className="no-print bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white shadow-xl border-b-4 border-amber-500">
      {/* Top Banner with Official Crest & Clock */}
      <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {/* Logo / Garuda emblem */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 bg-white/10 rounded-xl p-1.5 flex items-center justify-center border border-amber-400/40 shadow-inner shrink-0 overflow-hidden">
            {settings.logoType === 'custom' && settings.customLogoUrl ? (
              <img src={settings.customLogoUrl} alt="Logo" className="w-full h-full object-contain drop-shadow" />
            ) : settings.logoType === 'university' ? (
              <div className="text-amber-300 flex flex-col items-center justify-center font-bold text-center leading-none">
                <i className="fa-solid fa-graduation-cap text-2xl text-amber-400 mb-0.5"></i>
                <span className="text-[10px] tracking-wider uppercase font-semibold">KU UNIV</span>
              </div>
            ) : settings.logoType === 'garuda' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow text-amber-400" fill="currentColor">
                <path d="M50 8 C40 18, 30 25, 20 28 C28 32, 38 35, 42 42 C30 45, 12 52, 5 65 C20 62, 35 60, 45 68 C40 76, 32 86, 25 95 C40 88, 47 80, 50 72 C53 80, 60 88, 75 95 C68 86, 60 76, 55 68 C65 60, 80 62, 95 65 C88 52, 70 45, 58 42 C62 35, 72 32, 80 28 C70 25, 60 18, 50 8 Z" opacity="0.9" />
                <circle cx="50" cy="30" r="10" fill="#f59e0b" />
              </svg>
            ) : (
              <i className="fa-solid fa-landmark text-amber-400 text-2xl"></i>
            )}
          </div>

          <div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 leading-tight">
              <span>ระบบบันทึกเวลาปฏิบัติราชการและสรุปวันลา</span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 font-medium mt-0.5">
              ภาควิชาวิศวกรรมเครื่องกล คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเกษตรศาสตร์
            </p>
          </div>
        </div>

        {/* Live Clock & Fiscal Year Badge */}
        <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-between gap-1 text-right">
          <div className="inline-flex items-center gap-2 bg-blue-900/60 px-3 py-1.5 rounded-lg border border-blue-700/50 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-blue-200">ปีงบประมาณ พ.ศ. <b className="text-amber-300">{settings.currentFiscalYear}</b></span>
            <span className="text-[10px] text-blue-300 hidden lg:inline">
              ({fiscalInfo.startBEText} - {fiscalInfo.endBEText})
            </span>
          </div>

          <div className="text-xs text-blue-200 flex items-center gap-2">
            <i className="fa-regular fa-clock text-amber-400"></i>
            <span>{formatThaiDate(currentTime, 'full')}</span>
            <span className="font-mono text-amber-300 font-bold bg-black/30 px-1.5 py-0.5 rounded">
              {currentTime.toLocaleTimeString('th-TH')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="bg-blue-950/90 border-t border-blue-900/70 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-none mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1.5 scrollbar-thin scrollbar-thumb-blue-800">
          <button
            onClick={() => onSelectTab('attendance')}
            className={`px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentTab === 'attendance'
                ? 'bg-amber-500 text-blue-950 shadow-md font-bold'
                : 'text-blue-100 hover:bg-blue-900 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-calendar-check text-base"></i>
            <span>1. ลงเวลาปฏิบัติราชการ</span>
          </button>

          <button
            onClick={() => onSelectTab('users')}
            className={`px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentTab === 'users'
                ? 'bg-amber-500 text-blue-950 shadow-md font-bold'
                : 'text-blue-100 hover:bg-blue-900 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-users-gear text-base"></i>
            <span>2. จัดการข้อมูลบุคลากร</span>
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-amber-500 text-blue-950 shadow-md font-bold'
                : 'text-blue-100 hover:bg-blue-900 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-sliders text-base"></i>
            <span>3. จัดการระบบ</span>
          </button>

          <button
            onClick={() => onSelectTab('print')}
            className={`px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentTab === 'print'
                ? 'bg-amber-500 text-blue-950 shadow-md font-bold'
                : 'text-blue-100 hover:bg-blue-900 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-print text-base"></i>
            <span>4. สั่งพิมพ์เอกสารราชการ</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
