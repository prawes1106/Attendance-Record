import { FullBackupData } from '../services/storage';

function escapeSqlValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\0/g, '\\0')
    .replace(/\x1a/g, '\\Z');
  return `'${str}'`;
}

export function buildMariaDbSqlDump(data: FullBackupData): string {
  const lines: string[] = [
    '-- ============================================================',
    '-- ฐานข้อมูลระบบลงเวลาปฏิบัติราชการ (MariaDB / MySQL Dump)',
    `-- Generated at: ${new Date().toISOString()}`,
    '-- ============================================================',
    '',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
    'CREATE TABLE IF NOT EXISTS `system_settings` (',
    '  `id` INT NOT NULL PRIMARY KEY DEFAULT 1,',
    '  `agency_name` VARCHAR(255) NOT NULL,',
    "  `department_sub_name` VARCHAR(255) NOT NULL DEFAULT '',",
    '  `responsible_officer_name` VARCHAR(255) NOT NULL,',
    '  `responsible_officer_position` VARCHAR(255) NOT NULL,',
    "  `responsible_officer_phone` VARCHAR(100) NOT NULL DEFAULT '',",
    '  `supervisor_name` VARCHAR(255) NOT NULL,',
    '  `supervisor_position` VARCHAR(255) NOT NULL,',
    '  `signature_note` TEXT NOT NULL,',
    "  `logo_type` VARCHAR(32) NOT NULL DEFAULT 'garuda',",
    '  `custom_logo_url` MEDIUMTEXT NULL,',
    "  `work_start_time` VARCHAR(16) NOT NULL DEFAULT '08:30',",
    "  `work_end_time` VARCHAR(16) NOT NULL DEFAULT '16:30',",
    '  `late_grace_minutes` INT NOT NULL DEFAULT 1,',
    '  `current_fiscal_year` INT NOT NULL DEFAULT 2569,',
    '  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    'CREATE TABLE IF NOT EXISTS `users_personnel` (',
    '  `id` VARCHAR(100) NOT NULL PRIMARY KEY,',
    '  `sort_order` INT NOT NULL DEFAULT 0,',
    '  `employee_code` VARCHAR(100) NULL,',
    '  `citizen_id` VARCHAR(50) NULL,',
    "  `title` VARCHAR(100) NOT NULL DEFAULT '',",
    '  `first_name` VARCHAR(150) NOT NULL,',
    "  `last_name` VARCHAR(150) NOT NULL DEFAULT '',",
    '  `department_group` VARCHAR(255) NOT NULL,',
    '  `position` VARCHAR(255) NOT NULL,',
    '  `academic_rank` VARCHAR(100) NULL,',
    '  `accumulated_leave_days` DECIMAL(6,2) NOT NULL DEFAULT 0,',
    '  `yearly_quota_days` DECIMAL(6,2) NOT NULL DEFAULT 10,',
    '  `total_leave_entitled` DECIMAL(6,2) NOT NULL DEFAULT 10,',
    '  `used_leave_days` DECIMAL(6,2) NOT NULL DEFAULT 0,',
    "  `phone` VARCHAR(100) NOT NULL DEFAULT '',",
    "  `email` VARCHAR(150) NOT NULL DEFAULT '',",
    '  `avatar_url` MEDIUMTEXT NULL,',
    "  `start_date` VARCHAR(32) NOT NULL DEFAULT '',",
    "  `status` VARCHAR(20) NOT NULL DEFAULT 'active',",
    '  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    'CREATE TABLE IF NOT EXISTS `attendance_records` (',
    '  `id` VARCHAR(150) NOT NULL PRIMARY KEY,',
    '  `user_id` VARCHAR(100) NOT NULL,',
    '  `attendance_date` CHAR(10) NOT NULL,',
    '  `symbol` VARCHAR(10) NOT NULL,',
    '  `check_in_time` VARCHAR(16) NULL,',
    '  `check_out_time` VARCHAR(16) NULL,',
    '  `is_late` TINYINT(1) NOT NULL DEFAULT 0,',
    '  `note` TEXT NULL,',
    '  `recorded_by` VARCHAR(150) NULL,',
    '  `updated_at` VARCHAR(64) NOT NULL,',
    '  INDEX `idx_user_date` (`user_id`, `attendance_date`),',
    '  INDEX `idx_date_symbol` (`attendance_date`, `symbol`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    'CREATE TABLE IF NOT EXISTS `monthly_notes` (',
    '  `note_key` VARCHAR(150) NOT NULL PRIMARY KEY,',
    '  `user_id` VARCHAR(100) NOT NULL,',
    '  `year_be` INT NOT NULL,',
    '  `month_num` INT NOT NULL,',
    '  `note` TEXT NOT NULL,',
    '  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,',
    '  INDEX `idx_note_period` (`year_be`, `month_num`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    'TRUNCATE TABLE `system_settings`;',
    'TRUNCATE TABLE `users_personnel`;',
    'TRUNCATE TABLE `attendance_records`;',
    'TRUNCATE TABLE `monthly_notes`;',
    '',
  ];

  if (data.settings) {
    const s = data.settings;
    lines.push(
      'INSERT INTO `system_settings` (`id`, `agency_name`, `department_sub_name`, `responsible_officer_name`, `responsible_officer_position`, `responsible_officer_phone`, `supervisor_name`, `supervisor_position`, `signature_note`, `logo_type`, `custom_logo_url`, `work_start_time`, `work_end_time`, `late_grace_minutes`, `current_fiscal_year`) VALUES',
      `  (1, ${escapeSqlValue(s.agencyName)}, ${escapeSqlValue(s.departmentSubName || '')}, ${escapeSqlValue(s.responsibleOfficerName)}, ${escapeSqlValue(s.responsibleOfficerPosition)}, ${escapeSqlValue(s.responsibleOfficerPhone || '')}, ${escapeSqlValue(s.supervisorName)}, ${escapeSqlValue(s.supervisorPosition)}, ${escapeSqlValue(s.signatureNote || '')}, ${escapeSqlValue(s.logoType || 'garuda')}, ${escapeSqlValue(s.customLogoUrl || null)}, ${escapeSqlValue(s.workStartTime || '08:30')}, ${escapeSqlValue(s.workEndTime || '16:30')}, ${Number(s.lateGraceMinutes ?? 1)}, ${Number(s.currentFiscalYear ?? 2569)});`,
      ''
    );
  }

  if (data.users && data.users.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < data.users.length; i += chunkSize) {
      const chunk = data.users.slice(i, i + chunkSize);
      lines.push(
        'INSERT INTO `users_personnel` (`id`, `sort_order`, `employee_code`, `citizen_id`, `title`, `first_name`, `last_name`, `department_group`, `position`, `academic_rank`, `accumulated_leave_days`, `yearly_quota_days`, `total_leave_entitled`, `used_leave_days`, `phone`, `email`, `avatar_url`, `start_date`, `status`) VALUES'
      );
      chunk.forEach((u, idx) => {
        const comma = idx === chunk.length - 1 ? ';' : ',';
        lines.push(
          `  (${escapeSqlValue(u.id)}, ${i + idx}, ${escapeSqlValue(u.employeeCode || null)}, ${escapeSqlValue(u.citizenId || null)}, ${escapeSqlValue(u.title || '')}, ${escapeSqlValue(u.firstName)}, ${escapeSqlValue(u.lastName || '')}, ${escapeSqlValue(u.departmentGroup)}, ${escapeSqlValue(u.position)}, ${escapeSqlValue(u.academicRank || null)}, ${Number(u.accumulatedLeaveDays ?? 0)}, ${Number(u.yearlyQuotaDays ?? 10)}, ${Number(u.totalLeaveEntitled ?? 10)}, ${Number(u.usedLeaveDays ?? 0)}, ${escapeSqlValue(u.phone || '')}, ${escapeSqlValue(u.email || '')}, ${escapeSqlValue(u.avatarUrl || null)}, ${escapeSqlValue(u.startDate || '')}, ${escapeSqlValue(u.status || 'active')})${comma}`
        );
      });
      lines.push('');
    }
  }

  if (data.attendanceLogs && data.attendanceLogs.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < data.attendanceLogs.length; i += chunkSize) {
      const chunk = data.attendanceLogs.slice(i, i + chunkSize);
      lines.push(
        'INSERT INTO `attendance_records` (`id`, `user_id`, `attendance_date`, `symbol`, `check_in_time`, `check_out_time`, `is_late`, `note`, `recorded_by`, `updated_at`) VALUES'
      );
      chunk.forEach((r, idx) => {
        const comma = idx === chunk.length - 1 ? ';' : ',';
        lines.push(
          `  (${escapeSqlValue(r.id)}, ${escapeSqlValue(r.userId)}, ${escapeSqlValue(r.date)}, ${escapeSqlValue(r.symbol)}, ${escapeSqlValue(r.checkInTime || null)}, ${escapeSqlValue(r.checkOutTime || null)}, ${r.isLate ? 1 : 0}, ${escapeSqlValue(r.note || null)}, ${escapeSqlValue(r.recordedBy || null)}, ${escapeSqlValue(r.updatedAt || new Date().toISOString())})${comma}`
        );
      });
      lines.push('');
    }
  }

  const noteEntries = Object.entries(data.monthlyNotes || {}).filter(([, v]) => v && v.trim() !== '');
  if (noteEntries.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < noteEntries.length; i += chunkSize) {
      const chunk = noteEntries.slice(i, i + chunkSize);
      lines.push('INSERT INTO `monthly_notes` (`note_key`, `user_id`, `year_be`, `month_num`, `note`) VALUES');
      chunk.forEach(([key, note], idx) => {
        const parts = key.split('_');
        const monthNum = parseInt(parts.pop() || '0', 10) || 0;
        const yearBE = parseInt(parts.pop() || '0', 10) || 0;
        const userId = parts.join('_');
        const comma = idx === chunk.length - 1 ? ';' : ',';
        lines.push(
          `  (${escapeSqlValue(key)}, ${escapeSqlValue(userId)}, ${yearBE}, ${monthNum}, ${escapeSqlValue(note.trim())})${comma}`
        );
      });
      lines.push('');
    }
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;', '');
  return lines.join('\n');
}
