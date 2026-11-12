/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AttendancePage } from './components/AttendancePage';
import { UsersPage } from './components/UsersPage';
import { SettingsPage } from './components/SettingsPage';
import { PrintReportsPage } from './components/PrintReportsPage';
import { storageService } from './services/storage';
import { UserPersonnel, AttendanceRecord, SystemSettings } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'attendance' | 'users' | 'settings' | 'print'>('attendance');
  const [settings, setSettings] = useState<SystemSettings>(storageService.getSettings());
  const [users, setUsers] = useState<UserPersonnel[]>(storageService.getUsers());
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(storageService.getAttendanceLogs());

  const refreshData = () => {
    setSettings(storageService.getSettings());
    setUsers(storageService.getUsers());
    setAttendanceLogs(storageService.getAttendanceLogs());
  };

  useEffect(() => {
    refreshData();
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'print' || tabParam === 'users' || tabParam === 'settings' || tabParam === 'attendance') {
      setCurrentTab(tabParam as any);
    }
    if (params.get('autoprint') === 'true') {
      setCurrentTab('print');
      const timer = setTimeout(() => {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.warn('Autoprint failed:', e);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-blue-900 selection:text-white">
      {/* Official Government Header Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        settings={settings}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:m-0 print:max-w-none print:w-full">
        {currentTab === 'attendance' && (
          <AttendancePage
            users={users}
            attendanceLogs={attendanceLogs}
            settings={settings}
            onRefreshData={refreshData}
          />
        )}

        {currentTab === 'users' && (
          <UsersPage
            users={users}
            settings={settings}
            onRefreshData={refreshData}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onRefreshData={refreshData}
          />
        )}

        {currentTab === 'print' && (
          <PrintReportsPage
            users={users}
            attendanceLogs={attendanceLogs}
            settings={settings}
            onRefreshData={refreshData}
          />
        )}
      </main>

      {/* Official Footer */}
      <footer className="no-print bg-white border-t border-slate-200 mt-auto py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            ระบบบันทึกเวลาปฏิบัติราชการและสรุปวันลาตามปีงบประมาณ
          </p>
          <p>
            {settings.agencyName} {settings.departmentSubName ? `• ${settings.departmentSubName}` : ''}
          </p>
          <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-center gap-3">
            <span>เจ้าหน้าที่ผู้รับผิดชอบ: {settings.responsibleOfficerName} ({settings.responsibleOfficerPosition})</span>
            <span>•</span>
            <span>ผู้บังคับบัญชาชั้นต้น: {settings.supervisorName}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
