import React, { useState, useRef } from 'react';
import { SystemSettings, UserPersonnel, DepartmentGroup, PositionType } from '../types';
import { alertHelper, storageService, resolveApiUrl } from '../services/storage';
import { getFiscalYearRange } from '../utils/thaiDate';
import { INITIAL_SYSTEM_SETTINGS } from '../data/initialData';
import { buildMariaDbSqlDump } from '../utils/sqlExport';

interface SettingsPageProps {
  settings: SystemSettings;
  onRefreshData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onRefreshData }) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });

  const fiscalInfo = getFiscalYearRange(formData.currentFiscalYear);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveSettings(formData);
    onRefreshData();
    alertHelper.success(
      'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว',
      'ข้อมูลหน่วยงาน เจ้าหน้าที่ผู้รับผิดชอบ และผู้บังคับบัญชาชั้นต้นได้รับการปรับปรุงเรียบร้อย'
    );
  };

  const handleResetDefaults = async () => {
    const confirmed = await alertHelper.confirm(
      'คืนค่าเริ่มต้น',
      'ต้องการคืนค่าการตั้งค่าระบบกลับเป็นค่าเริ่มต้นทางราชการหรือไม่?',
      'ยืนยันคืนค่า'
    );
    if (confirmed) {
      storageService.saveSettings(INITIAL_SYSTEM_SETTINGS);
      setFormData(INITIAL_SYSTEM_SETTINGS);
      onRefreshData();
      alertHelper.toastSuccess('คืนค่าเริ่มต้นเรียบร้อยแล้ว');
    }
  };

  // Import Personnel States
  const [importText, setImportText] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [previewList, setPreviewList] = useState<Array<{
    title: string;
    firstName: string;
    lastName: string;
    departmentGroup: DepartmentGroup;
    position: PositionType;
    accumulatedLeaveDays: number;
    raw: string;
    isValid: boolean;
    error?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportBackup = () => {
    const backup = storageService.exportFullBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `ku-attendance-backup-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alertHelper.toastSuccess('ดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อยแล้ว');
  };

  const handleExportSqlBackup = async () => {
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `ku-attendance-mariadb-${dateStamp}.sql`;

    if (storageService.isServerDbEnabled()) {
      try {
        const res = await fetch(resolveApiUrl('/api/export-sql'));
        if (res.ok) {
          const sqlText = await res.text();
          const blob = new Blob([sqlText], { type: 'application/sql;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          alertHelper.toastSuccess('บันทึกไฟล์ฐานข้อมูล MariaDB (.SQL) ลงเครื่องเรียบร้อยแล้ว');
          return;
        }
      } catch {
        // Fallback to local snapshot SQL generator
      }
    }

    const sqlText = buildMariaDbSqlDump(storageService.exportFullBackup());
    const blob = new Blob([sqlText], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alertHelper.toastSuccess('บันทึกไฟล์ฐานข้อมูล MariaDB (.SQL) ลงเครื่องเรียบร้อยแล้ว');
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        if (!Array.isArray(parsed.users) && !Array.isArray(parsed.attendanceLogs)) {
          alertHelper.error('ไฟล์ไม่ถูกต้อง', 'ไม่พบข้อมูลบุคลากรหรือการลงเวลาในไฟล์สำรองนี้');
          return;
        }
        const confirmed = await alertHelper.confirm(
          'ยืนยันกู้คืนข้อมูลจากไฟล์สำรอง',
          `พบข้อมูลบุคลากร ${parsed.users?.length || 0} ท่าน และรายการลงเวลา ${parsed.attendanceLogs?.length || 0} รายการ ต้องการนำเข้าแทนที่ข้อมูลปัจจุบันหรือไม่?`,
          'ยืนยันนำเข้า'
        );
        if (!confirmed) return;

        await storageService.importFullBackup(parsed);
        setFormData(storageService.getSettings());
        onRefreshData();
        alertHelper.success('กู้คืนข้อมูลสำเร็จ', 'อัปเดตข้อมูลเข้าสู่ระบบและฐานข้อมูลเรียบร้อยแล้ว');
      } catch {
        alertHelper.error('อ่านไฟล์ไม่สำเร็จ', 'กรุณาเลือกไฟล์ .JSON ที่ส่งออกจากระบบนี้เท่านั้น');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handlePushLocalToDb = async () => {
    const confirmed = await alertHelper.confirm(
      'ส่งข้อมูลจากเบราว์เซอร์เข้าสู่ฐานข้อมูล NAS',
      'ระบบจะนำข้อมูลบุคลากร การลงเวลา และวันหยุดทั้งหมดที่อยู่ในเครื่องนี้ไปบันทึกทับใน MariaDB บน NAS ต้องการดำเนินการต่อหรือไม่?',
      'ส่งข้อมูลขึ้นฐานข้อมูล'
    );
    if (!confirmed) return;
    const ok = await storageService.pushLocalToServer();
    if (ok) {
      onRefreshData();
      alertHelper.success('ซิงก์ข้อมูลสำเร็จ', 'บันทึกข้อมูลเข้าสู่ฐานข้อมูล MariaDB บน NAS เรียบร้อยแล้ว');
    } else {
      alertHelper.warning('ยังไม่พบการเชื่อมต่อ MariaDB', 'ระบบนี้กำลังทำงานในโหมดเบราว์เซอร์ (ยังไม่พบฐานข้อมูล MariaDB ที่เชื่อมต่ออยู่)');
    }
  };

  const sampleCsvData = `ชื่อ-นามสกุล, กลุ่มงาน, ตำแหน่ง, วันลาสะสม
นายสุรศักดิ์ ใจกล้า, ข้าราชการ+ลูกจ้าง, ลูกจ้างประจำ, 12
นางวิไลพร สุขเกษม, พนักงานเงินรายได้ พนักงานมหาวิทยาลัย พนักงานราชการ, พนักงานมหาวิทยาลัยเงินรายได้, 6
ผศ.ดร.ชาญชัย ชาญวิทย์, อาจารย์, พนักงานมหาวิทยาลัย, 8
นายประเสริฐ ยิ่งยง, ข้าราชการ+ลูกจ้าง, พนักงานมหาวิทยาลัย (เปลี่ยนสถานภาพ), 15
นางสาวกมลทิพย์ ศรีจันทร์, พนักงานเงินรายได้ พนักงานมหาวิทยาลัย พนักงานราชการ, พนักงานมหาวิทยาลัยเงินงบประมาณ, 10`;

  const parseImportData = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed = [];

    for (const line of lines) {
      if (line.includes('ชื่อ-นามสกุล') || line.includes('ชื่อ - สกุล')) continue;

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map(p => p.trim());
      } else if (line.includes(';')) {
        parts = line.split(';').map(p => p.trim());
      } else {
        parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
      }

      if (parts.length < 3) {
        parsed.push({
          raw: line,
          title: '',
          firstName: '',
          lastName: '',
          departmentGroup: 'ข้าราชการ+ลูกจ้าง' as DepartmentGroup,
          position: 'พนักงานมหาวิทยาลัย' as PositionType,
          accumulatedLeaveDays: 0,
          isValid: false,
          error: 'ข้อมูลไม่ครบตามรูปแบบ (ชื่อ-นามสกุล, กลุ่มงาน, ตำแหน่ง, วันลาสะสม)'
        });
        continue;
      }

      const fullName = parts[0] || '';
      const rawGroup = parts[1] || '';
      const rawPosition = parts[2] || '';
      const rawLeave = parts[3] || '0';

      // Parse title
      let title = 'นาย';
      let cleanName = fullName;
      const knownTitles = ['ผศ.ดร.', 'รศ.ดร.', 'ศ.ดร.', 'อ.ดร.', 'ดร.', 'ผศ.', 'รศ.', 'ศ.', 'อาจารย์', 'นางสาว', 'นาง', 'นาย', 'ว่าที่ ร.ต.', 'น.ส.'];
      for (const t of knownTitles) {
        if (cleanName.startsWith(t)) {
          title = t === 'น.ส.' ? 'นางสาว' : t;
          cleanName = cleanName.substring(t.length).trim();
          break;
        }
      }

      const nameParts = cleanName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || fullName;
      const lastName = nameParts.slice(1).join(' ') || '';

      // Match group
      let departmentGroup: DepartmentGroup = 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ';
      if (rawGroup.includes('ข้าราชการ') || rawGroup.includes('ลูกจ้าง') || rawGroup.trim() === '1') {
        departmentGroup = 'ข้าราชการ+ลูกจ้าง';
      } else if (rawGroup.includes('อาจารย์') || rawGroup.trim() === '3') {
        departmentGroup = 'อาจารย์';
      }

      // Match position
      let position: PositionType = 'พนักงานมหาวิทยาลัย';
      if (rawPosition.includes('ลูกจ้างประจำ')) position = 'ลูกจ้างประจำ';
      else if (rawPosition.includes('งบประมาณ')) position = 'พนักงานมหาวิทยาลัยเงินงบประมาณ';
      else if (rawPosition.includes('เปลี่ยนสถานภาพ') || rawPosition.includes('เปลี่ยสถานภาพ')) position = 'งานมหาวิทยาลัย(เปลี่ยสถานภาพ)';
      else if (rawPosition.includes('เงินรายได้')) position = 'พนักงานมหาวิทยาลัยเงินรายได้';
      else if (rawPosition.includes('ราชการพลเรือน')) position = 'ข้าราชการพลเรือนในสถาบันอุดมศึกษา';
      else if (rawPosition.includes('ข้าราชการ')) position = 'ข้าราชการ';
      else if (rawPosition.includes('พนักงานราชการ')) position = 'พนักงานราชการ';
      else if (rawPosition.includes('ผู้ช่วยศาสตราจารย์') || rawPosition.includes('ผศ.')) position = 'ผู้ช่วยศาสตราจารย์';
      else if (rawPosition.includes('รองศาสตราจารย์') || rawPosition.includes('รศ.')) position = 'รองศาสตราจารย์';
      else if (rawPosition.includes('ศาสตราจารย์') || rawPosition.includes('ศ.')) position = 'ศาสตราจารย์';
      else if (rawPosition.includes('อาจารย์')) position = 'อาจารย์';
      else if (rawPosition.trim()) position = rawPosition.trim() as PositionType;

      const accumulatedLeaveDays = Math.max(0, parseFloat(rawLeave) || 0);

      parsed.push({
        raw: line,
        title,
        firstName,
        lastName,
        departmentGroup,
        position,
        accumulatedLeaveDays,
        isValid: Boolean(firstName),
        error: !firstName ? 'ไม่พบชื่อบุคลากร' : undefined
      });
    }

    return parsed;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        const parsed = parseImportData(content);
        setPreviewList(parsed);
        alertHelper.toastSuccess(`อ่านไฟล์สำเร็จ พบข้อมูล ${parsed.length} รายการ`);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handlePreview = () => {
    if (!importText.trim()) {
      alertHelper.error('ไม่มีข้อมูล', 'กรุณาวางข้อความหรือเลือกไฟล์ก่อนตรวจสอบ');
      return;
    }
    const parsed = parseImportData(importText);
    setPreviewList(parsed);
    alertHelper.toastInfo(`ตรวจสอบข้อมูลเรียบร้อย ${parsed.length} รายการ`);
  };

  const handleCommitImport = async () => {
    const validRows = previewList.filter(p => p.isValid);
    if (validRows.length === 0) {
      alertHelper.error('ไม่พบข้อมูลที่ถูกต้อง', 'กรุณากดตรวจสอบข้อมูลและตรวจดูข้อผิดพลาดก่อนนำเข้า');
      return;
    }

    const confirmed = await alertHelper.confirm(
      'ยืนยันนำเข้าข้อมูลบุคลากร',
      `ต้องการนำเข้าข้อมูลบุคลากรจำนวน ${validRows.length} ท่าน (รูปแบบ: ${importMode === 'append' ? 'เพิ่มต่อท้าย' : 'แทนที่ข้อมูลเดิม'}) หรือไม่?`,
      'ยืนยันนำเข้า'
    );

    if (!confirmed) return;

    const currentUsers = storageService.getUsers();
    const newUsers: UserPersonnel[] = validRows.map((row, idx) => {
      const yearlyQuota = 10;
      const totalEntitled = row.accumulatedLeaveDays + yearlyQuota;
      return {
        id: `u_imp_${Date.now()}_${idx}`,
        title: row.title,
        firstName: row.firstName,
        lastName: row.lastName,
        departmentGroup: row.departmentGroup,
        position: row.position,
        accumulatedLeaveDays: row.accumulatedLeaveDays,
        yearlyQuotaDays: yearlyQuota,
        totalLeaveEntitled: totalEntitled,
        usedLeaveDays: 0,
        phone: '',
        email: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'active'
      };
    });

    const finalUsers = importMode === 'replace' ? newUsers : [...currentUsers, ...newUsers];
    storageService.saveUsers(finalUsers);
    onRefreshData();
    setPreviewList([]);
    setImportText('');
    alertHelper.success('นำเข้าสำเร็จ', `นำเข้าข้อมูลบุคลากรจำนวน ${newUsers.length} ท่าน เข้าสู่ระบบเรียบร้อยแล้ว`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-blue-800"></i>
            <span>3. จัดการระบบและข้อมูลหน่วยงาน</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดข้อมูลเจ้าหน้าที่ผู้รับผิดชอบ ผู้บังคับบัญชาชั้นต้น ตราสัญลักษณ์ Logo และปีงบประมาณสำหรับใช้ในแบบฟอร์มทางราชการ
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5"
        >
          <i className="fa-solid fa-rotate-left"></i>
          <span>คืนค่าเริ่มต้น</span>
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. ข้อมูลหน่วยงาน */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-800 text-sm">
            <i className="fa-solid fa-building-columns text-blue-800"></i>
            <span>ข้อมูลหน่วยงานและปีงบประมาณ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อหน่วยงาน / ส่วนราชการหลัก <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.agencyName}
                onChange={e => setFormData({ ...formData, agencyName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                placeholder="เช่น คณะวิทยาศาสตร์และเทคโนโลยี"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                หน่วยงานย่อย / ฝ่าย / งาน
              </label>
              <input
                type="text"
                value={formData.departmentSubName}
                onChange={e => setFormData({ ...formData, departmentSubName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="เช่น สำนักงานเลขานุการและงานบริหารทรัพยากรบุคคล"
              />
            </div>
          </div>

          {/* ปีงบประมาณตามเกณฑ์ราชการ (1 ต.ค. - 30 ก.ย.) */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-amber-950 text-sm">ปีงบประมาณปัจจุบัน:</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  รอบการปฏิบัติราชการ: เริ่มวันที่ <b>{fiscalInfo.startBEText}</b> ถึง วันที่ <b>{fiscalInfo.endBEText}</b>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-900">พ.ศ.</span>
                <select
                  value={formData.currentFiscalYear}
                  onChange={e => setFormData({ ...formData, currentFiscalYear: parseInt(e.target.value) })}
                  className="bg-white border border-amber-300 font-bold text-amber-950 p-2 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value={2567}>2567</option>
                  <option value={2568}>2568</option>
                  <option value={2569}>2569</option>
                  <option value={2570}>2570</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2. เจ้าหน้าที่หน่วยงานที่รับผิดชอบ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-800 text-sm">
            <i className="fa-solid fa-user-check text-blue-800"></i>
            <span>เจ้าหน้าที่หน่วยงานที่รับผิดชอบ (ผู้จัดทำข้อมูล)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อ-นามสกุล เจ้าหน้าที่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.responsibleOfficerName}
                onChange={e => setFormData({ ...formData, responsibleOfficerName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="นางสุภาวดี เกษมพุก"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ตำแหน่งหน้าที่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.responsibleOfficerPosition}
                onChange={e => setFormData({ ...formData, responsibleOfficerPosition: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="เช่น นักทรัพยากรบุคคลชำนาญการ"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <input
                type="text"
                value={formData.responsibleOfficerPhone}
                onChange={e => setFormData({ ...formData, responsibleOfficerPhone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="เช่น 02-579-4576 ต่อ 1804"
              />
            </div>
          </div>
        </div>

        {/* 3. ผู้บังคับบัญชาชั้นต้น */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-800 text-sm">
            <i className="fa-solid fa-stamp text-blue-800"></i>
            <span>ผู้บังคับบัญชาชั้นต้น (ผู้มีอำนาจลงนามรับรอง)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อ-นามสกุล ผู้บังคับบัญชาชั้นต้น <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.supervisorName}
                onChange={e => setFormData({ ...formData, supervisorName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="เช่น รองศาสตราจารย์ ดร.เกียรติศักดิ์ ศรีวิโรจน์"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ตำแหน่งทางราชการ / บริหาร <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.supervisorPosition}
                onChange={e => setFormData({ ...formData, supervisorPosition: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="เช่น คณบดีคณะวิทยาศาสตร์และเทคโนโลยี"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              ข้อความรับรองท้ายเอกสาร
            </label>
            <input
              type="text"
              value={formData.signatureNote}
              onChange={e => setFormData({ ...formData, signatureNote: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="เช่น ขอรับรองว่าการลงเวลาปฏิบัติราชการและสรุปวันลาเป็นความจริงทุกประการ"
            />
          </div>
        </div>

        {/* 4. Logo ระบบ และเวลาทำการ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-800 text-sm">
            <i className="fa-solid fa-image text-blue-800"></i>
            <span>Logo ระบบ และเวลาทำการปกติ</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                เลือกรูปแบบ Logo ระบบและเอกสารราชการ:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: ตราครุฑพ่าห์ราชการ */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  formData.logoType === 'garuda'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="logoType"
                    checked={formData.logoType === 'garuda'}
                    onChange={() => setFormData({ ...formData, logoType: 'garuda' })}
                    className="mt-0.5 text-blue-900"
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>1. ตราครุฑพ่าห์ราชการ</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ตราครุฑทางการสำหรับหน่วยงานราชการและกระทรวง
                    </p>
                  </div>
                </label>

                {/* Option 2: ตราสถาบันการศึกษา */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  formData.logoType === 'university'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="logoType"
                    checked={formData.logoType === 'university'}
                    onChange={() => setFormData({ ...formData, logoType: 'university' })}
                    className="mt-0.5 text-blue-900"
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>2. ตราสถาบัน / มหาวิทยาลัย</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ตราสัญลักษณ์มหาวิทยาลัย / คณะ / สำนัก
                    </p>
                  </div>
                </label>

                {/* Option 3: อัปโหลด Logo เอง */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  formData.logoType === 'custom'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="logoType"
                    checked={formData.logoType === 'custom'}
                    onChange={() => setFormData({ ...formData, logoType: 'custom' })}
                    className="mt-0.5 text-blue-900"
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>3. อัปโหลด Logo ของหน่วยงาน</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ใช้ไฟล์ภาพ Logo หรือตราสัญลักษณ์เฉพาะของหน่วยงานท่าน
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Custom Logo Upload & Preview Panel (Shown when custom is selected or if logo exists) */}
            <div className={`p-4 rounded-xl border transition ${
              formData.logoType === 'custom'
                ? 'bg-amber-50/40 border-amber-300'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <i className="fa-solid fa-cloud-arrow-up text-amber-600"></i>
                    <span>อัปโหลดไฟล์ภาพ Logo หน่วยงาน (PNG, JPG, SVG)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    แนะนำภาพพื้นหลังโปร่งใส (Transparent PNG) หรือสี่เหลี่ยมจัตุรัส ขนาดไม่เกิน 2MB
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="bg-blue-900 hover:bg-blue-950 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer inline-flex items-center gap-2 shadow-xs transition">
                      <i className="fa-solid fa-folder-open text-amber-400"></i>
                      <span>เลือกไฟล์ภาพจากเครื่อง...</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            alertHelper.error('ไฟล์มีขนาดใหญ่เกินไป', 'กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 2MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setFormData(prev => ({
                                ...prev,
                                logoType: 'custom',
                                customLogoUrl: reader.result as string
                              }));
                              alertHelper.toastSuccess('เลือกภาพ Logo สำเร็จ กรุณากดบันทึกการตั้งค่า');
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>

                    {formData.customLogoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            customLogoUrl: '',
                            logoType: 'garuda'
                          }));
                          alertHelper.toastSuccess('ลบ Logo กำหนดเองแล้ว');
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold py-2 px-3 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 transition"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        <span>นำภาพออก</span>
                      </button>
                    )}
                  </div>

                  {/* URL Input Alternative */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      หรือระบุลิงก์รูปภาพ Logo (Image URL):
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={formData.customLogoUrl || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          customLogoUrl: val,
                          logoType: val ? 'custom' : prev.logoType
                        }));
                      }}
                      className="w-full max-w-md p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Preview Box */}
                <div className="shrink-0 flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 font-semibold mb-1">แสดงผลจริง:</div>
                    <div className="w-16 h-16 rounded-xl bg-blue-950 p-1.5 flex items-center justify-center border border-amber-400/50 shadow-inner">
                      {formData.logoType === 'custom' && formData.customLogoUrl ? (
                        <img
                          src={formData.customLogoUrl}
                          alt="Custom Logo Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : formData.logoType === 'university' ? (
                        <div className="text-amber-300 flex flex-col items-center justify-center font-bold text-center leading-none">
                          <i className="fa-solid fa-graduation-cap text-2xl text-amber-400 mb-0.5"></i>
                          <span className="text-[9px] tracking-wider uppercase font-semibold">KU UNIV</span>
                        </div>
                      ) : (
                        <svg viewBox="0 0 100 100" className="w-full h-full text-amber-400" fill="currentColor">
                          <path d="M50 8 C40 18, 30 25, 20 28 C28 32, 38 35, 42 42 C30 45, 12 52, 5 65 C20 62, 35 60, 45 68 C40 76, 32 86, 25 95 C40 88, 47 80, 50 72 C53 80, 60 88, 75 95 C68 86, 60 76, 55 68 C65 60, 80 62, 95 65 C88 52, 70 45, 58 42 C62 35, 72 32, 80 28 C70 25, 60 18, 50 8 Z" opacity="0.9" />
                          <circle cx="50" cy="30" r="10" fill="#f59e0b" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Work Hours Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เวลาเริ่มปฏิบัติงานปกติ
                </label>
                <input
                  type="time"
                  value={formData.workStartTime}
                  onChange={e => setFormData({ ...formData, workStartTime: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">มาตรฐานราชการ: 08:30 น.</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เวลาเลิกปฏิบัติงานปกติ
                </label>
                <input
                  type="time"
                  value={formData.workEndTime}
                  onChange={e => setFormData({ ...formData, workEndTime: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">มาตรฐานราชการ: 16:30 น.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-blue-900 hover:bg-blue-950 text-white font-bold py-3 px-6 rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 text-sm"
          >
            <i className="fa-solid fa-floppy-disk text-amber-400"></i>
            <span>บันทึกการตั้งค่าระบบ</span>
          </button>
        </div>
      </form>

      {/* 2. นำเข้าข้อมูลของบุคลากร (Import บุคลากร) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <i className="fa-solid fa-file-import text-blue-800 text-base"></i>
            <span>นำเข้าข้อมูลของบุคลากร (Import Personnel Data)</span>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-semibold border border-blue-200">
            รูปแบบ: ชื่อ-นามสกุล, กลุ่มงาน, ตำแหน่ง, วันลาสะสม
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          นำเข้าข้อมูลบุคลากรชุดใหม่โดยระบุข้อมูล 4 ส่วนคั่นด้วยเครื่องหมายจุลภาค <b>(,)</b> หรือแท็บ <b>(Tab)</b>:
          <span className="font-semibold text-blue-900 ml-1">ชื่อ-นามสกุล, กลุ่มงาน, ตำแหน่ง, วันลาสะสม</span>
        </p>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white hover:bg-slate-100 text-slate-800 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <i className="fa-solid fa-arrow-up-from-bracket text-blue-600"></i>
              <span>เลือกไฟล์ .CSV / .TXT</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportText(sampleCsvData);
                const parsed = parseImportData(sampleCsvData);
                setPreviewList(parsed);
                alertHelper.toastInfo('โหลดข้อมูลตัวอย่างเรียบร้อยแล้ว');
              }}
              className="bg-white hover:bg-slate-100 text-slate-700 font-medium px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <i className="fa-regular fa-clipboard text-amber-600"></i>
              <span>โหลดข้อมูลตัวอย่าง</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-blue-900"
              />
              <span className="font-medium text-slate-700">เพิ่มต่อท้ายข้อมูลเดิม</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-rose-700"
              />
              <span className="font-medium text-rose-700">แทนที่ข้อมูลเดิมทั้งหมด</span>
            </label>
          </div>
        </div>

        {/* Text Area */}
        <div>
          <textarea
            rows={5}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={`วางข้อความที่นี่ เช่น:\nนายสุรศักดิ์ ใจกล้า, ข้าราชการ+ลูกจ้าง, ลูกจ้างประจำ, 12\nนางวิไลพร สุขเกษม, พนักงานเงินรายได้ พนักงานมหาวิทยาลัย พนักงานราชการ, พนักงานมหาวิทยาลัยเงินรายได้, 6\nผศ.ดร.ชาญชัย ชาญวิทย์, อาจารย์, พนักงานมหาวิทยาลัย, 8`}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handlePreview}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
          >
            <i className="fa-solid fa-list-check text-amber-400"></i>
            <span>ตรวจสอบและดูตัวอย่าง ({previewList.length} รายการ)</span>
          </button>

          {previewList.length > 0 && (
            <button
              type="button"
              onClick={handleCommitImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm transition"
            >
              <i className="fa-solid fa-check-double text-white"></i>
              <span>ยืนยันนำเข้าข้อมูล ({previewList.filter(p => p.isValid).length} ท่าน)</span>
            </button>
          )}
        </div>

        {/* Preview Table */}
        {previewList.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
              <span>ตัวอย่างข้อมูลที่ตรวจพบ ({previewList.length} รายการ)</span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                ถูกต้อง: {previewList.filter(p => p.isValid).length} | ผิดพลาด: {previewList.filter(p => !p.isValid).length}
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 text-center w-10">ลำดับ</th>
                    <th className="py-2 px-3">ชื่อ - สกุล</th>
                    <th className="py-2 px-3">กลุ่มงาน</th>
                    <th className="py-2 px-3">ตำแหน่ง</th>
                    <th className="py-2 px-3 text-center">วันลาสะสม</th>
                    <th className="py-2 px-3 text-center w-24">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {previewList.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/60'}>
                      <td className="py-2 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {row.title}{row.firstName} {row.lastName}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{row.departmentGroup}</td>
                      <td className="py-2 px-3 text-slate-700">{row.position}</td>
                      <td className="py-2 px-3 text-center font-mono font-semibold text-blue-900">
                        {row.accumulatedLeaveDays} วัน
                      </td>
                      <td className="py-2 px-3 text-center">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <i className="fa-solid fa-circle-check text-[9px]"></i> พร้อมนำเข้า
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={row.error}>
                            <i className="fa-solid fa-triangle-exclamation text-[9px]"></i> {row.error || 'ผิดพลาด'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. สำรองข้อมูลและเชื่อมต่อฐานข้อมูล MariaDB */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-800 text-sm">
          <i className="fa-solid fa-database text-blue-800 text-base"></i>
          <span>สำรองข้อมูล กู้คืนข้อมูล และฐานข้อมูล NAS (MariaDB)</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ท่านสามารถบันทึกฐานข้อมูล MariaDB เป็นไฟล์ <b>.SQL</b> (สำหรับเปิดดูหรือนำเข้าใน phpMyAdmin) หรือไฟล์สำรอง <b>.JSON</b> ลงในเครื่องคอมพิวเตอร์ได้ทันที
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportSqlBackup}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
          >
            <i className="fa-solid fa-file-arrow-down text-amber-300"></i>
            <span>บันทึก MariaDB (.SQL) ลงเครื่อง</span>
          </button>

          <button
            type="button"
            onClick={handleExportBackup}
            className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
          >
            <i className="fa-solid fa-download text-amber-400"></i>
            <span>สำรองข้อมูลทั้งหมด (.JSON)</span>
          </button>

          <input
            type="file"
            ref={backupInputRef}
            accept=".json,application/json"
            onChange={handleImportBackupFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            className="bg-white hover:bg-slate-100 text-slate-800 font-bold px-4 py-2.5 rounded-xl border border-slate-300 text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
          >
            <i className="fa-solid fa-upload text-emerald-600"></i>
            <span>กู้คืน / นำเข้าไฟล์สำรอง (.JSON)</span>
          </button>

          <button
            type="button"
            onClick={handlePushLocalToDb}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold px-4 py-2.5 rounded-xl border border-amber-300 text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
          >
            <i className="fa-solid fa-arrows-rotate text-amber-700"></i>
            <span>ส่งข้อมูลเครื่องนี้เข้า MariaDB บน NAS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
