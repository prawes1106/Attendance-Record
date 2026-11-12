import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME || 'ku_attendance';
const DB_USER = process.env.DB_USER || 'attendance_user';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

let pool: Pool | null = null;
let schemaInitialized = false;
let lastDbError: string | null = null;

function isDbConfigured(): boolean {
  return Boolean(DB_HOST && DB_USER);
}

async function getPool(): Promise<Pool | null> {
  if (!isDbConfigured()) return null;
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000,
    });
  }
  return pool;
}

async function ensureSchema(): Promise<boolean> {
  const activePool = await getPool();
  if (!activePool) return false;
  if (schemaInitialized) return true;

  try {
    await activePool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        agency_name VARCHAR(255) NOT NULL,
        department_sub_name VARCHAR(255) NOT NULL DEFAULT '',
        responsible_officer_name VARCHAR(255) NOT NULL,
        responsible_officer_position VARCHAR(255) NOT NULL,
        responsible_officer_phone VARCHAR(100) NOT NULL DEFAULT '',
        supervisor_name VARCHAR(255) NOT NULL,
        supervisor_position VARCHAR(255) NOT NULL,
        signature_note TEXT NOT NULL,
        logo_type VARCHAR(32) NOT NULL DEFAULT 'garuda',
        custom_logo_url MEDIUMTEXT NULL,
        work_start_time VARCHAR(16) NOT NULL DEFAULT '08:30',
        work_end_time VARCHAR(16) NOT NULL DEFAULT '16:30',
        late_grace_minutes INT NOT NULL DEFAULT 1,
        current_fiscal_year INT NOT NULL DEFAULT 2569,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS users_personnel (
        id VARCHAR(100) NOT NULL PRIMARY KEY,
        sort_order INT NOT NULL DEFAULT 0,
        employee_code VARCHAR(100) NULL,
        citizen_id VARCHAR(50) NULL,
        title VARCHAR(100) NOT NULL DEFAULT '',
        first_name VARCHAR(150) NOT NULL,
        last_name VARCHAR(150) NOT NULL DEFAULT '',
        department_group VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        academic_rank VARCHAR(100) NULL,
        accumulated_leave_days DECIMAL(6,2) NOT NULL DEFAULT 0,
        yearly_quota_days DECIMAL(6,2) NOT NULL DEFAULT 10,
        total_leave_entitled DECIMAL(6,2) NOT NULL DEFAULT 10,
        used_leave_days DECIMAL(6,2) NOT NULL DEFAULT 0,
        phone VARCHAR(100) NOT NULL DEFAULT '',
        email VARCHAR(150) NOT NULL DEFAULT '',
        avatar_url MEDIUMTEXT NULL,
        start_date VARCHAR(32) NOT NULL DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id VARCHAR(150) NOT NULL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        attendance_date CHAR(10) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        check_in_time VARCHAR(16) NULL,
        check_out_time VARCHAR(16) NULL,
        is_late TINYINT(1) NOT NULL DEFAULT 0,
        note TEXT NULL,
        recorded_by VARCHAR(150) NULL,
        updated_at VARCHAR(64) NOT NULL,
        INDEX idx_user_date (user_id, attendance_date),
        INDEX idx_date_symbol (attendance_date, symbol)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS monthly_notes (
        note_key VARCHAR(150) NOT NULL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        year_be INT NOT NULL,
        month_num INT NOT NULL,
        note TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_note_period (year_be, month_num)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    schemaInitialized = true;
    lastDbError = null;
    return true;
  } catch (err: any) {
    lastDbError = err?.message || 'Database initialization error';
    console.error('MariaDB schema initialization error:', lastDbError);
    return false;
  }
}

async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const activePool = await getPool();
  if (!activePool) {
    throw new Error('MariaDB is not configured');
  }
  const ok = await ensureSchema();
  if (!ok) {
    throw new Error(lastDbError || 'MariaDB is unavailable');
  }
  const conn = await activePool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function upsertSettings(conn: PoolConnection, s: any): Promise<void> {
  await conn.query(
    `INSERT INTO system_settings (
      id, agency_name, department_sub_name, responsible_officer_name,
      responsible_officer_position, responsible_officer_phone,
      supervisor_name, supervisor_position, signature_note,
      logo_type, custom_logo_url, work_start_time, work_end_time,
      late_grace_minutes, current_fiscal_year
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      agency_name = VALUES(agency_name),
      department_sub_name = VALUES(department_sub_name),
      responsible_officer_name = VALUES(responsible_officer_name),
      responsible_officer_position = VALUES(responsible_officer_position),
      responsible_officer_phone = VALUES(responsible_officer_phone),
      supervisor_name = VALUES(supervisor_name),
      supervisor_position = VALUES(supervisor_position),
      signature_note = VALUES(signature_note),
      logo_type = VALUES(logo_type),
      custom_logo_url = VALUES(custom_logo_url),
      work_start_time = VALUES(work_start_time),
      work_end_time = VALUES(work_end_time),
      late_grace_minutes = VALUES(late_grace_minutes),
      current_fiscal_year = VALUES(current_fiscal_year)`,
    [
      s.agencyName || '',
      s.departmentSubName || '',
      s.responsibleOfficerName || '',
      s.responsibleOfficerPosition || '',
      s.responsibleOfficerPhone || '',
      s.supervisorName || '',
      s.supervisorPosition || '',
      s.signatureNote || '',
      s.logoType || 'garuda',
      s.customLogoUrl || null,
      s.workStartTime || '08:30',
      s.workEndTime || '16:30',
      Number(s.lateGraceMinutes ?? 1),
      Number(s.currentFiscalYear ?? 2569),
    ]
  );
}

async function replaceUsers(conn: PoolConnection, users: any[]): Promise<void> {
  await conn.query('DELETE FROM users_personnel');
  if (!users || users.length === 0) return;

  const chunkSize = 200;
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values: any[] = [];
    chunk.forEach((u, idx) => {
      values.push(
        u.id,
        i + idx,
        u.employeeCode || null,
        u.citizenId || null,
        u.title || '',
        u.firstName || '',
        u.lastName || '',
        u.departmentGroup || 'ข้าราชการ+ลูกจ้าง',
        u.position || 'พนักงานมหาวิทยาลัย',
        u.academicRank || null,
        Number(u.accumulatedLeaveDays ?? 0),
        Number(u.yearlyQuotaDays ?? 10),
        Number(u.totalLeaveEntitled ?? 10),
        Number(u.usedLeaveDays ?? 0),
        u.phone || '',
        u.email || '',
        u.avatarUrl || null,
        u.startDate || '',
        u.status || 'active'
      );
    });
    await conn.query(
      `INSERT INTO users_personnel (
        id, sort_order, employee_code, citizen_id, title, first_name, last_name,
        department_group, position, academic_rank, accumulated_leave_days,
        yearly_quota_days, total_leave_entitled, used_leave_days,
        phone, email, avatar_url, start_date, status
      ) VALUES ${placeholders}`,
      values
    );
  }
}

async function upsertAttendanceBatch(conn: PoolConnection, records: any[]): Promise<void> {
  if (!records || records.length === 0) return;
  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values: any[] = [];
    chunk.forEach(r => {
      values.push(
        r.id,
        r.userId,
        r.date,
        r.symbol,
        r.checkInTime || null,
        r.checkOutTime || null,
        r.isLate ? 1 : 0,
        r.note || null,
        r.recordedBy || null,
        r.updatedAt || new Date().toISOString()
      );
    });
    await conn.query(
      `INSERT INTO attendance_records (
        id, user_id, attendance_date, symbol, check_in_time, check_out_time,
        is_late, note, recorded_by, updated_at
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        attendance_date = VALUES(attendance_date),
        symbol = VALUES(symbol),
        check_in_time = VALUES(check_in_time),
        check_out_time = VALUES(check_out_time),
        is_late = VALUES(is_late),
        note = VALUES(note),
        recorded_by = VALUES(recorded_by),
        updated_at = VALUES(updated_at)`,
      values
    );
  }
}

async function replaceAllNotes(conn: PoolConnection, notes: Record<string, string>): Promise<void> {
  await conn.query('DELETE FROM monthly_notes');
  const entries = Object.entries(notes || {}).filter(([, val]) => val && val.trim() !== '');
  if (entries.length === 0) return;

  const chunkSize = 200;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const values: any[] = [];
    chunk.forEach(([key, note]) => {
      const parts = key.split('_');
      const monthNum = parseInt(parts.pop() || '0', 10) || 0;
      const yearBE = parseInt(parts.pop() || '0', 10) || 0;
      const userId = parts.join('_');
      values.push(key, userId, yearBE, monthNum, note.trim());
    });
    await conn.query(
      `INSERT INTO monthly_notes (note_key, user_id, year_be, month_num, note) VALUES ${placeholders}`,
      values
    );
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', async (_req: Request, res: Response) => {
    const configured = isDbConfigured();
    if (!configured) {
      res.json({ ok: true, dbConfigured: false, dbConnected: false, dbName: null });
      return;
    }
    const connected = await ensureSchema();
    res.json({
      ok: true,
      dbConfigured: true,
      dbConnected: connected,
      dbName: DB_NAME,
      error: connected ? null : lastDbError,
    });
  });

  app.get('/api/bootstrap', async (_req: Request, res: Response) => {
    if (!isDbConfigured()) {
      res.json({ dbConnected: false, mode: 'local' });
      return;
    }
    try {
      const connected = await ensureSchema();
      const activePool = await getPool();
      if (!connected || !activePool) {
        res.json({ dbConnected: false, mode: 'local', error: lastDbError });
        return;
      }

      const [settingsRows] = await activePool.query<RowDataPacket[]>('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
      const [userRows] = await activePool.query<RowDataPacket[]>('SELECT * FROM users_personnel ORDER BY sort_order ASC, id ASC');
      const [logRows] = await activePool.query<RowDataPacket[]>('SELECT * FROM attendance_records');
      const [noteRows] = await activePool.query<RowDataPacket[]>('SELECT note_key, note FROM monthly_notes');

      const settings = settingsRows.length > 0 ? {
        agencyName: settingsRows[0].agency_name,
        departmentSubName: settingsRows[0].department_sub_name || '',
        responsibleOfficerName: settingsRows[0].responsible_officer_name,
        responsibleOfficerPosition: settingsRows[0].responsible_officer_position,
        responsibleOfficerPhone: settingsRows[0].responsible_officer_phone || '',
        supervisorName: settingsRows[0].supervisor_name,
        supervisorPosition: settingsRows[0].supervisor_position,
        signatureNote: settingsRows[0].signature_note || '',
        logoType: settingsRows[0].logo_type || 'garuda',
        customLogoUrl: settingsRows[0].custom_logo_url || undefined,
        workStartTime: settingsRows[0].work_start_time || '08:30',
        workEndTime: settingsRows[0].work_end_time || '16:30',
        lateGraceMinutes: Number(settingsRows[0].late_grace_minutes ?? 1),
        currentFiscalYear: Number(settingsRows[0].current_fiscal_year ?? 2569),
      } : null;

      const users = userRows.map(u => ({
        id: u.id,
        employeeCode: u.employee_code || undefined,
        citizenId: u.citizen_id || undefined,
        title: u.title || '',
        firstName: u.first_name,
        lastName: u.last_name || '',
        departmentGroup: u.department_group,
        position: u.position,
        academicRank: u.academic_rank || undefined,
        accumulatedLeaveDays: Number(u.accumulated_leave_days),
        yearlyQuotaDays: Number(u.yearly_quota_days),
        totalLeaveEntitled: Number(u.total_leave_entitled),
        usedLeaveDays: Number(u.used_leave_days),
        phone: u.phone || '',
        email: u.email || '',
        avatarUrl: u.avatar_url || undefined,
        startDate: u.start_date || '',
        status: u.status || 'active',
      }));

      const attendanceLogs = logRows.map(r => ({
        id: r.id,
        userId: r.user_id,
        date: r.attendance_date,
        symbol: r.symbol,
        checkInTime: r.check_in_time || undefined,
        checkOutTime: r.check_out_time || undefined,
        isLate: Boolean(r.is_late),
        note: r.note || undefined,
        recordedBy: r.recorded_by || undefined,
        updatedAt: r.updated_at,
      }));

      const monthlyNotes: Record<string, string> = {};
      noteRows.forEach(n => {
        monthlyNotes[n.note_key] = n.note;
      });

      const isEmpty = settingsRows.length === 0 && userRows.length === 0 && logRows.length === 0;

      res.json({
        dbConnected: true,
        mode: 'mariadb',
        dbName: DB_NAME,
        isEmpty,
        settings,
        users,
        attendanceLogs,
        monthlyNotes,
      });
    } catch (err: any) {
      console.error('Bootstrap error:', err);
      res.status(500).json({ dbConnected: false, error: err?.message || 'Bootstrap failed' });
    }
  });

  app.put('/api/settings', async (req: Request, res: Response) => {
    if (!isDbConfigured()) {
      res.json({ ok: true, mode: 'local' });
      return;
    }
    try {
      await withTransaction(async conn => {
        await upsertSettings(conn, req.body);
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.put('/api/users', async (req: Request, res: Response) => {
    if (!isDbConfigured()) {
      res.json({ ok: true, mode: 'local' });
      return;
    }
    try {
      const users = Array.isArray(req.body?.users) ? req.body.users : [];
      await withTransaction(async conn => {
        await replaceUsers(conn, users);
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.put('/api/attendance/replace-all', async (req: Request, res: Response) => {
    if (!isDbConfigured()) {
      res.json({ ok: true, mode: 'local' });
      return;
    }
    try {
      const logs = Array.isArray(req.body?.logs) ? req.body.logs : [];
      await withTransaction(async conn => {
        await conn.query('DELETE FROM attendance_records');
        await upsertAttendanceBatch(conn, logs);
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.post('/api/attendance/bulk-upsert', async (req: Request, res: Response) => {
    if (!isDbConfigured()) {
      res.json({ ok: true, mode: 'local' });
      return;
    }
    try {
      const records = Array.isArray(req.body?.records) ? req.body.records : [];
      await withTransaction(async conn => {
        await upsertAttendanceBatch(conn, records);
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.post('/api/attendance/bulk-delete', async (req: Request, res: Response) => {
    if (!isDbConfigured()) {
      res.json({ ok: true, mode: 'local' });
      return;
    }
    try {
      const { userId, dates, holidayDate } = req.body || {};
      await withTransaction(async conn => {
        if (holidayDate) {
          await conn.query('DELETE FROM attendance_records WHERE attendance_date = ? AND symbol = ?', [holidayDate, 'ห']);
        }
        if (userId && Array.isArray(dates) && dates.length > 0) {
          const placeholders = dates.map(() => '?').join(', ');
          await conn.query(
            `DELETE FROM attendance_records WHERE user_id = ? AND attendance_date IN (${placeholders})`,
            [userId, ...dates]
          );
        }
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.put('/api/monthly-note', async (req: Request, res: Response) => {
    if (!isDbConfigured()) {
      res.json({ ok: true, mode: 'local' });
      return;
    }
    try {
      const { userId, yearBE, month, note } = req.body || {};
      const key = `${userId}_${yearBE}_${month}`;
      await withTransaction(async conn => {
        if (note && String(note).trim() !== '') {
          await conn.query(
            `INSERT INTO monthly_notes (note_key, user_id, year_be, month_num, note)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE note = VALUES(note)`,
            [key, userId, Number(yearBE), Number(month), String(note).trim()]
          );
        } else {
          await conn.query('DELETE FROM monthly_notes WHERE note_key = ?', [key]);
        }
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.post('/api/import-all', async (req: Request, res: Response) => {
    if (!isDbConfigured()) {
      res.json({ ok: true, mode: 'local' });
      return;
    }
    try {
      const { settings, users, attendanceLogs, monthlyNotes } = req.body || {};
      await withTransaction(async conn => {
        if (settings) await upsertSettings(conn, settings);
        if (Array.isArray(users)) await replaceUsers(conn, users);
        if (Array.isArray(attendanceLogs)) {
          await conn.query('DELETE FROM attendance_records');
          await upsertAttendanceBatch(conn, attendanceLogs);
        }
        if (monthlyNotes && typeof monthlyNotes === 'object') {
          await replaceAllNotes(conn, monthlyNotes);
        }
      });
      res.json({ ok: true });
    } catch (err: any) {
      console.error('Import all error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  if (IS_PRODUCTION) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (mode=${IS_PRODUCTION ? 'production' : 'development'}, db=${isDbConfigured() ? `${DB_HOST}:${DB_PORT}/${DB_NAME}` : 'localStorage-only'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
