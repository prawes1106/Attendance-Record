import React, { useState } from 'react';
import { PHP_PROJECT_FILES, PhpFileItem } from '../data/phpCodeGenerator';
import { alertHelper } from '../services/storage';

export const PhpSourceViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<PhpFileItem>(PHP_PROJECT_FILES[0]);

  const handleCopy = (code: string, filename: string) => {
    navigator.clipboard.writeText(code);
    alertHelper.toastSuccess(`คัดลอกเนื้อหาไฟล์ ${filename} เรียบร้อยแล้ว`);
  };

  const handleDownload = (file: PhpFileItem) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename.split('/').pop() || 'file.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alertHelper.toastSuccess(`เริ่มดาวน์โหลด ${file.filename}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-xl shadow-md p-6 border-b-4 border-emerald-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                PHP Native 8.x + phpMyAdmin
              </span>
              <span className="text-xs text-slate-300">MySQL / MariaDB</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-1 text-white flex items-center gap-2">
              <i className="fa-brands fa-php text-2xl text-emerald-400"></i>
              <span>ชุดซอร์สโค้ดสำหรับนำไปติดตั้งบน Server / XAMPP / phpMyAdmin</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              โครงสร้างโค้ดตามที่ระบุในคำขอ: PHP Native 8.x+, MySQL (phpMyAdmin), Font Awesome, SweetAlert2, Google Fonts: Sarabun, Tailwind CSS, และ JavaScript AJAX โดยไม่มีการ Reload หน้า
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload(activeFile)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <i className="fa-solid fa-download"></i>
              <span>ดาวน์โหลดไฟล์นี้</span>
            </button>
            <button
              onClick={() => handleCopy(activeFile.code, activeFile.filename)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <i className="fa-solid fa-copy"></i>
              <span>คัดลอกโค้ด</span>
            </button>
          </div>
        </div>
      </div>

      {/* Installation Instructions */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-xs space-y-2">
        <div className="font-bold text-amber-950 flex items-center gap-2">
          <i className="fa-solid fa-circle-question text-amber-700"></i>
          <span>ขั้นตอนการนำไปติดตั้งบน XAMPP / AppServ / phpMyAdmin:</span>
        </div>
        <ol className="list-decimal list-inside text-amber-900 space-y-1 pl-1">
          <li>เปิด <b>phpMyAdmin</b> (เช่น http://localhost/phpmyadmin) เลือกเมนู <b>Import</b> แล้วนำเข้าไฟล์ <code>database.sql</code> (จะสร้างฐานข้อมูล <code>attendance_gov_db</code> และตารางทั้งหมดให้อัตโนมัติ)</li>
          <li>สร้างโฟลเดอร์ <code>htdocs/attendance/</code> ใน XAMPP และนำไฟล์ <code>config/db.php</code>, <code>api/attendance.php</code>, <code>api/users.php</code>, <code>print_monthly.php</code>, <code>print_summary.php</code> ไปวางตามโครงสร้างโฟลเดอร์</li>
          <li>ตรวจสอบ username และ password ใน <code>config/db.php</code> ให้ตรงกับการตั้งค่า MySQL ของเครื่องท่าน</li>
          <li>เปิดใช้งานระบบผ่านเบราว์เซอร์ที่ <code>http://localhost/attendance/</code></li>
        </ol>
      </div>

      {/* Code File Explorer & Viewer */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* File Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto">
          {PHP_PROJECT_FILES.map(file => (
            <button
              key={file.filename}
              onClick={() => setActiveFile(file)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeFile.filename === file.filename
                  ? 'bg-white text-blue-950 shadow-xs border border-slate-300 font-bold'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <i className={
                file.filename.endsWith('.sql')
                  ? 'fa-solid fa-database text-amber-600'
                  : 'fa-brands fa-php text-blue-600'
              }></i>
              <span>{file.filename}</span>
            </button>
          ))}
        </div>

        {/* File Description Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="text-slate-700 font-medium">
            <span className="font-bold text-slate-900 mr-2">{activeFile.filename}:</span>
            <span>{activeFile.description}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(activeFile.code, activeFile.filename)}
              className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-regular fa-copy"></i>
              <span>คัดลอกทั้งหมด</span>
            </button>
          </div>
        </div>

        {/* Code Content Box */}
        <div className="relative">
          <pre className="p-5 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto max-h-[600px] leading-relaxed selection:bg-blue-800">
            <code>{activeFile.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
