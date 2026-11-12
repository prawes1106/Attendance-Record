import React from 'react';
import { UserPersonnel, AttendanceRecord, SystemSettings } from '../types';
import { MonthlyLedgerTable } from './MonthlyLedgerTable';

interface AttendancePageProps {
  users: UserPersonnel[];
  attendanceLogs: AttendanceRecord[];
  settings: SystemSettings;
  onRefreshData: () => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  users,
  attendanceLogs,
  settings,
  onRefreshData
}) => {
  return (
    <div className="space-y-5">
      <MonthlyLedgerTable
        users={users}
        attendanceLogs={attendanceLogs}
        settings={settings}
        onRefreshData={onRefreshData}
      />
    </div>
  );
};
