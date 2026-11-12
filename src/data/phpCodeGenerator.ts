/**
 * PHP Native 8.x + MySQL (phpMyAdmin) Complete Source Code Generator
 * This provides the exact backend scripts, SQL DDL schema, and AJAX endpoints
 * requested for native deployment to XAMPP, Laragon, or LAMP servers with phpMyAdmin.
 */

export interface PhpFileItem {
  filename: string;
  description: string;
  code: string;
  category: 'database' | 'backend' | 'api' | 'frontend' | 'print';
}

export const PHP_PROJECT_FILES: PhpFileItem[] = [
  {
    filename: 'database.sql',
    category: 'database',
    description: 'ไฟล์ SQL Schema สำหรับนำเข้า (Import) ใน phpMyAdmin พร้อมตารางและข้อมูลเริ่มต้น',
    code: `-- ==============================================================
-- ระบบบันทึกเวลาปฏิบัติราชการและสรุปวันลา (Thai Gov Attendance)
-- ฐานข้อมูล: attendance_gov_db
-- ใช้งานร่วมกับ: PHP 8.x+ และ phpMyAdmin / MySQL 8.x หรือ MariaDB 10.x
-- ==============================================================

CREATE DATABASE IF NOT EXISTS \`attendance_gov_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`attendance_gov_db\`;

-- 1. ตารางตั้งค่าระบบและหน่วยงาน (system_settings)
CREATE TABLE IF NOT EXISTS \`system_settings\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`agency_name\` VARCHAR(255) NOT NULL DEFAULT 'คณะวิศวกรรมศาสตร์',
  \`department_sub_name\` VARCHAR(255) NOT NULL DEFAULT 'ภาควิชาวิศวกรรมเครื่องกล',
  \`responsible_officer_name\` VARCHAR(150) NOT NULL DEFAULT 'นางสุภาวดี เกษมพุก',
  \`responsible_officer_position\` VARCHAR(150) NOT NULL DEFAULT 'นักทรัพยากรบุคคลชำนาญการ',
  \`responsible_officer_phone\` VARCHAR(50) DEFAULT '02-561-1234 ต่อ 1402',
  \`supervisor_name\` VARCHAR(150) NOT NULL DEFAULT 'ผศ ดร.อรรถพร วิเศษสินธฺ์',
  \`supervisor_position\` VARCHAR(150) NOT NULL DEFAULT 'หัวหน้าภาควิชาวิศวกรรมเครื่องกล',
  \`signature_note\` TEXT DEFAULT 'ขอรับรองว่าการลงเวลาปฏิบัติราชการและสรุปวันลาเป็นความจริงทุกประการ',
  \`logo_type\` VARCHAR(20) DEFAULT 'garuda',
  \`custom_logo_url\` VARCHAR(255) DEFAULT '',
  \`work_start_time\` TIME DEFAULT '08:30:00',
  \`work_end_time\` TIME DEFAULT '16:30:00',
  \`late_grace_minutes\` INT DEFAULT 1,
  \`current_fiscal_year\` INT DEFAULT 2568,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางข้อมูลบุคลากร (users)
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`employee_code\` VARCHAR(50) NOT NULL UNIQUE,
  \`citizen_id\` VARCHAR(20) DEFAULT '',
  \`title\` VARCHAR(30) NOT NULL,
  \`first_name\` VARCHAR(100) NOT NULL,
  \`last_name\` VARCHAR(100) NOT NULL,
  \`department_group\` ENUM('ข้าราชการ+ลูกจ้าง', 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ', 'อาจารย์') NOT NULL,
  \`position\` VARCHAR(100) NOT NULL DEFAULT 'พนักงานมหาวิทยาลัย',
  \`academic_rank\` VARCHAR(50) DEFAULT '',
  \`accumulated_leave_days\` DECIMAL(4,1) DEFAULT 0.0 COMMENT 'วันลาสะสมยกมา',
  \`yearly_quota_days\` DECIMAL(4,1) DEFAULT 10.0 COMMENT 'สิทธิ์ลาพักผ่อนปีนี้',
  \`total_leave_entitled\` DECIMAL(4,1) DEFAULT 10.0 COMMENT 'สิทธิ์รวม',
  \`used_leave_days\` DECIMAL(4,1) DEFAULT 0.0 COMMENT 'ใช้ไปแล้วในปีนี้',
  \`phone\` VARCHAR(30) DEFAULT '',
  \`email\` VARCHAR(100) DEFAULT '',
  \`start_date\` DATE DEFAULT NULL,
  \`status\` ENUM('active', 'inactive') DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตารางบันทึกเวลาและการปฏิบัติราชการ (attendance_logs)
CREATE TABLE IF NOT EXISTS \`attendance_logs\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`attendance_date\` DATE NOT NULL,
  \`symbol\` ENUM('/', 'ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส', 'ข') NOT NULL DEFAULT '/',
  \`check_in_time\` TIME DEFAULT NULL,
  \`check_out_time\` TIME DEFAULT NULL,
  \`is_late\` TINYINT(1) DEFAULT 0,
  \`note\` TEXT DEFAULT NULL,
  \`recorded_by\` VARCHAR(100) DEFAULT 'ระบบลงเวลา',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`user_date_unique\` (\`user_id\`, \`attendance_date\`),
  CONSTRAINT \`fk_attendance_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตั้งค่าระบบเริ่มต้น
INSERT INTO \`system_settings\` (\`id\`, \`agency_name\`, \`department_sub_name\`, \`responsible_officer_name\`, \`responsible_officer_position\`, \`supervisor_name\`, \`supervisor_position\`, \`current_fiscal_year\`)
VALUES (1, 'คณะวิศวกรรมศาสตร์', 'ภาควิชาวิศวกรรมเครื่องกล', 'นางสุภาวดี เกษมพุก', 'นักทรัพยากรบุคคลชำนาญการ', 'ผศ ดร.อรรถพร วิเศษสินธฺ์', 'หัวหน้าภาควิชาวิศวกรรมเครื่องกลผศ ดร.อรรถพร วิเศษสินธฺ์ผศ ดร.อรรถพร วิเศษสินธฺ์', 2568)
ON DUPLICATE KEY UPDATE \`agency_name\`=VALUES(\`agency_name\`);

-- ข้อมูลบุคลากรตัวอย่าง
INSERT INTO \`users\` (\`id\`, \`employee_code\`, \`citizen_id\`, \`title\`, \`first_name\`, \`last_name\`, \`department_group\`, \`position\`, \`accumulated_leave_days\`, \`yearly_quota_days\`, \`total_leave_entitled\`, \`used_leave_days\`, \`phone\`, \`email\`, \`start_date\`) VALUES
(1, 'KU-01452', '1-1002-00345-12-1', 'ผศ.ดร.', 'ธีรเดช', 'จินดารัตน์', 'อาจารย์', 'พนักงานมหาวิทยาลัยเงินงบประมาณ', 8.0, 10.0, 18.0, 2.0, '081-445-8921', 'teeradej.j@ku.ac.th', '2018-06-01'),
(2, 'KU-01893', '3-1005-00123-45-6', 'อ.ดร.', 'นันทนา', 'พงษ์สุวรรณ', 'อาจารย์', 'พนักงานมหาวิทยาลัย', 5.0, 10.0, 15.0, 0.0, '089-123-4567', 'nantana.p@ku.ac.th', '2020-08-16'),
(3, 'KU-02104', '1-1014-00876-54-3', 'นาย', 'วรวิทย์', 'ศรีวิเชียร', 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ', 'พนักงานมหาวิทยาลัย', 12.0, 10.0, 22.0, 4.0, '086-778-9012', 'worawit.s@ku.ac.th', '2016-03-01'),
(4, 'KU-02450', '3-1020-00456-78-9', 'นางสาว', 'กมลวรรณ', 'ชัยเจริญ', 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ', 'พนักงานมหาวิทยาลัยเงินรายได้', 3.0, 10.0, 13.0, 1.0, '084-556-7890', 'kamonwan.c@ku.ac.th', '2022-01-10'),
(5, 'KU-02688', '1-1033-00987-65-4', 'นาย', 'สมเกียรติ', 'สุขสมบัติ', 'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ', 'พนักงานราชการ', 6.0, 10.0, 16.0, 3.0, '082-345-6789', 'somkiat.s@ku.ac.th', '2019-11-01'),
(6, 'KU-01120', '3-1001-00234-56-7', 'นาย', 'วิเชียร', 'ทองสุข', 'ข้าราชการ+ลูกจ้าง', 'ลูกจ้างประจำ', 15.0, 10.0, 25.0, 5.0, '085-678-9012', 'wichian.t@ku.ac.th', '2010-05-01'),
(7, 'KU-01305', '1-1008-00567-89-0', 'นาง', 'รัตนาภรณ์', 'มั่งคั่ง', 'ข้าราชการ+ลูกจ้าง', 'ข้าราชการพลเรือนในสถาบันอุดมศึกษา', 20.0, 10.0, 30.0, 3.0, '081-889-0123', 'rattanaporn.m@ku.ac.th', '2008-09-15');
`
  },
  {
    filename: 'config/db.php',
    category: 'backend',
    description: 'ไฟล์เชื่อมต่อฐานข้อมูล MySQL ด้วย PHP 8.x PDO รองรับ UTF-8 เต็มรูปแบบ',
    code: `<?php
/**
 * การเชื่อมต่อฐานข้อมูล PDO สำหรับ PHP Native 8.x+
 * ไฟล์: config/db.php
 */

declare(strict_types=1);

$dbHost = 'localhost';
$dbName = 'attendance_gov_db';
$dbUser = 'root';
$dbPass = ''; // ค่าเริ่มต้นของ XAMPP / AppServ มักจะว่างเปล่า
$dbCharset = 'utf8mb4';

$dsn = "mysql:host={$dbHost};dbname={$dbName};charset={$dbCharset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
} catch (PDOException $e) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * ฟังก์ชันแปลงวันที่ ค.ศ. เป็นปีงบประมาณ พ.ศ.
 * การนับเวลาให้นับตามปีงบประมาณ เริ่มจาก 1 ต.ค. พ.ศ. ก่อนหน้า ถึง 30 ก.ย. พ.ศ. ปัจจุบัน
 */
function getFiscalYear(string $date): int {
    $timestamp = strtotime($date);
    $month = (int)date('n', $timestamp);
    $beYear = (int)date('Y', $timestamp) + 543;
    
    // ตั้งแต่เดือนตุลาคม (10) เป็นต้นไป ให้นับเป็นปีงบประมาณถัดไป
    if ($month >= 10) {
        return $beYear + 1;
    }
    return $beYear;
}
`
  },
  {
    filename: 'api/attendance.php',
    category: 'api',
    description: 'AJAX API สำหรับบันทึกเวลา, อัปเดตสัญลักษณ์ตัวย่อ, และดึงข้อมูลลงเวลาประจำวัน',
    code: `<?php
/**
 * AJAX API บันทึกและดึงข้อมูลเวลาปฏิบัติราชการ
 * ไฟล์: api/attendance.php
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// 1. ดึงรายการลงเวลาประจำวัน (GET)
if ($method === 'GET') {
    $date = $_GET['date'] ?? date('Y-m-d');
    $group = $_GET['group'] ?? '';

    try {
        $sql = "SELECT u.id AS user_id, u.employee_code, u.title, u.first_name, u.last_name, 
                       u.department_group, u.position, u.accumulated_leave_days, u.yearly_quota_days, u.used_leave_days,
                       a.id AS attendance_id, a.symbol, a.check_in_time, a.check_out_time, a.is_late, a.note
                FROM users u
                LEFT JOIN attendance_logs a ON u.id = a.user_id AND a.attendance_date = :att_date
                WHERE u.status = 'active'";
        
        $params = [':att_date' => $date];

        if (!empty($group)) {
            $sql .= " AND u.department_group = :group";
            $params[':group'] = $group;
        }

        $sql .= " ORDER BY u.department_group ASC, u.id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'date' => $date,
            'data' => $records
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// 2. บันทึกหรืออัปเดตสถานะการลงเวลา (POST)
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $userId = (int)($input['user_id'] ?? 0);
    $date = $input['date'] ?? date('Y-m-d');
    $symbol = $input['symbol'] ?? '/';
    $checkIn = $input['check_in_time'] ?? null;
    $checkOut = $input['check_out_time'] ?? null;
    $note = $input['note'] ?? '';
    $recordedBy = $input['recorded_by'] ?? 'เจ้าหน้าที่ลงเวลา';

    // ตรวจสอบความถูกต้องของสัญลักษณ์
    $validSymbols = ['/', 'ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส', 'ข'];
    if (!in_array($symbol, $validSymbols, true)) {
        echo json_encode(['success' => false, 'message' => 'สัญลักษณ์ไม่ถูกต้องตามระเบียบ'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // คำนวณว่าสายหรือไม่ (เช่น หลัง 08:30)
    $isLate = 0;
    if ($checkIn && strtotime($checkIn) > strtotime('08:30:00')) {
        $isLate = 1;
    }

    try {
        $sql = "INSERT INTO attendance_logs (user_id, attendance_date, symbol, check_in_time, check_out_time, is_late, note, recorded_by)
                VALUES (:user_id, :attendance_date, :symbol, :check_in_time, :check_out_time, :is_late, :note, :recorded_by)
                ON DUPLICATE KEY UPDATE 
                    symbol = VALUES(symbol),
                    check_in_time = VALUES(check_in_time),
                    check_out_time = VALUES(check_out_time),
                    is_late = VALUES(is_late),
                    note = VALUES(note),
                    recorded_by = VALUES(recorded_by)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':attendance_date' => $date,
            ':symbol' => $symbol,
            ':check_in_time' => $checkIn,
            ':check_out_time' => $checkOut,
            ':is_late' => $isLate,
            ':note' => $note,
            ':recorded_by' => $recordedBy
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'บันทึกเวลาปฏิบัติราชการเรียบร้อยแล้ว'
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}
`
  },
  {
    filename: 'api/users.php',
    category: 'api',
    description: 'AJAX API จัดการข้อมูลผู้ใช้และวันลาสะสม (เพิ่ม แก้ไข ลบ ค้นหา)',
    code: `<?php
/**
 * AJAX API จัดการข้อมูลบุคลากรและวันลาสะสม
 * ไฟล์: api/users.php
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ดึงรายชื่อบุคลากร
if ($method === 'GET') {
    try {
        $sql = "SELECT * FROM users WHERE status = 'active' ORDER BY department_group ASC, id ASC";
        $stmt = $pdo->query($sql);
        $users = $stmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $users], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// เพิ่มหรือแก้ไขข้อมูลบุคลากร
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? 'save';

    if ($action === 'delete') {
        $id = (int)($input['id'] ?? 0);
        $stmt = $pdo->prepare("UPDATE users SET status = 'inactive' WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'ลบข้อมูลบุคลากรเรียบร้อยแล้ว'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $id = isset($input['id']) && $input['id'] !== '' ? (int)$input['id'] : null;
    $empCode = trim($input['employee_code'] ?? '');
    $citizenId = trim($input['citizen_id'] ?? '');
    $title = trim($input['title'] ?? '');
    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $departmentGroup = $input['department_group'] ?? 'พนักงานมหาวิทยาลัย';
    $position = $input['position'] ?? 'พนักงานมหาวิทยาลัย';
    $accumulated = (float)($input['accumulated_leave_days'] ?? 0);
    $yearlyQuota = (float)($input['yearly_quota_days'] ?? 10);
    $totalEntitled = $accumulated + $yearlyQuota;
    $usedDays = (float)($input['used_leave_days'] ?? 0);
    $phone = trim($input['phone'] ?? '');
    $email = trim($input['email'] ?? '');

    try {
        if ($id) {
            // อัปเดต
            $sql = "UPDATE users SET 
                        employee_code = :code, citizen_id = :cid, title = :title, 
                        first_name = :fname, last_name = :lname, department_group = :dgroup,
                        position = :pos, accumulated_leave_days = :acc, yearly_quota_days = :quota,
                        total_leave_entitled = :total, used_leave_days = :used, phone = :phone, email = :email
                    WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':code' => $empCode, ':cid' => $citizenId, ':title' => $title,
                ':fname' => $firstName, ':lname' => $lastName, ':dgroup' => $departmentGroup,
                ':pos' => $position, ':acc' => $accumulated, ':quota' => $yearlyQuota,
                ':total' => $totalEntitled, ':used' => $usedDays, ':phone' => $phone,
                ':email' => $email, ':id' => $id
            ]);
            $msg = 'ปรับปรุงข้อมูลบุคลากรเรียบร้อยแล้ว';
        } else {
            // เพิ่มใหม่
            $sql = "INSERT INTO users (employee_code, citizen_id, title, first_name, last_name, 
                                      department_group, position, accumulated_leave_days, yearly_quota_days, 
                                      total_leave_entitled, used_leave_days, phone, email)
                    VALUES (:code, :cid, :title, :fname, :lname, :dgroup, :pos, :acc, :quota, :total, :used, :phone, :email)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':code' => $empCode, ':cid' => $citizenId, ':title' => $title,
                ':fname' => $firstName, ':lname' => $lastName, ':dgroup' => $departmentGroup,
                ':pos' => $position, ':acc' => $accumulated, ':quota' => $yearlyQuota,
                ':total' => $totalEntitled, ':used' => $usedDays, ':phone' => $phone,
                ':email' => $email
            ]);
            $msg = 'เพิ่มบุคลากรใหม่เรียบร้อยแล้ว';
        }

        echo json_encode(['success' => true, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'ข้อผิดพลาด: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}
`
  },
  {
    filename: 'print_monthly.php',
    category: 'print',
    description: 'เอกสารพิมพ์ทางราชการ: บัญชีงบเดือนเวลาทำการ (ตาราง 1-31 วัน สัญลักษณ์ /, ศ, ป, ก, ค, อ, พ, ร)',
    code: `<?php
/**
 * บัญชีงบเดือนเวลาทำการ (แบบฟอร์มทางราชการ)
 * ไฟล์: print_monthly.php
 */

declare(strict_types=1);
require_once __DIR__ . '/config/db.php';

$month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('n');
$yearBE = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y') + 543;
$yearCE = $yearBE - 543;

// ดึงข้อมูลการตั้งค่าระบบ
$stmt = $pdo->query("SELECT * FROM system_settings LIMIT 1");
$settings = $stmt->fetch() ?: [];

// วันที่ในเดือน
$daysInMonth = (int)cal_days_in_month(CAL_GREGORIAN, $month, $yearCE);
$thaiMonths = [
    1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
    5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
    9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
];

// ดึงข้อมูลบุคลากร
$usersStmt = $pdo->query("SELECT * FROM users WHERE status = 'active' ORDER BY department_group ASC, id ASC");
$users = $usersStmt->fetchAll();

// ดึงข้อมูลเวลาในเดือนนี้
$startDate = sprintf('%04d-%02d-01', $yearCE, $month);
$endDate = sprintf('%04d-%02d-%02d', $yearCE, $month, $daysInMonth);
$attStmt = $pdo->prepare("SELECT user_id, attendance_date, symbol FROM attendance_logs WHERE attendance_date BETWEEN :s AND :e");
$attStmt->execute([':s' => $startDate, ':e' => $endDate]);
$logsRaw = $attStmt->fetchAll();

$attendanceMap = [];
foreach ($logsRaw as $row) {
    $attendanceMap[$row['user_id']][$row['attendance_date']] = $row['symbol'];
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>บัญชีลงเวลาการปฏิบัติราชการ ประจำเดือน <?= $thaiMonths[$month] ?> พ.ศ. <?= $yearBE ?></title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Sarabun', sans-serif; font-size: 10pt; }
    @media print {
      @page { size: A4 landscape; margin: 8mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="bg-white p-4">
  <div class="no-print mb-4 flex justify-between items-center bg-slate-100 p-3 rounded border">
    <div class="font-semibold text-slate-700">แบบฟอร์มทางราชการ: บัญชีงบเดือนเวลาทำการ (A4 แนวนอน)</div>
    <button onclick="window.print()" class="bg-blue-700 text-white px-4 py-2 rounded text-sm hover:bg-blue-800">
      🖨️ สั่งพิมพ์เอกสาร (Print)
    </button>
  </div>

  <div class="text-center mb-3">
    <h1 class="text-base font-bold">บัญชีลงเวลาการปฏิบัติราชการ</h1>
    <h2 class="text-sm font-semibold"><?= htmlspecialchars($settings['agency_name'] ?? 'หน่วยงานราชการ') ?> <?= htmlspecialchars($settings['department_sub_name'] ?? '') ?></h2>
    <p class="text-xs text-slate-600">ประจำเดือน <?= $thaiMonths[$month] ?> พ.ศ. <?= $yearBE ?> (ปีงบประมาณ พ.ศ. <?= getFiscalYear($startDate) ?>)</p>
  </div>

  <table class="w-full border-collapse border border-slate-700 text-center text-[9px] leading-tight">
    <thead>
      <tr class="text-white text-[10px] font-bold">
        <th class="bg-[#0b5ed7] border border-slate-600 p-1 w-8" rowspan="2">ลำดับ</th>
        <th class="bg-[#0b5ed7] border border-slate-600 p-1 text-center w-40" rowspan="2">ชื่อ-นามสกุล</th>
        <th class="bg-[#0b5ed7] border border-slate-600 p-1 w-12 text-center" rowspan="2">
          <div style="line-height: 1.2; font-size: 9px;">
            <div>รวม</div>
            <div>วันทำการ</div>
          </div>
        </th>
        <?php for ($d = 1; $d <= $daysInMonth; $d++): 
            $curDate = sprintf('%04d-%02d-%02d', $yearCE, $month, $d);
            $dayOfWeek = (int)date('w', strtotime($curDate));
            $isWeekend = ($dayOfWeek === 0 || $dayOfWeek === 6);
        ?>
          <th rowspan="2" class="border border-slate-600 p-0.5 w-5 <?= $isWeekend ? 'bg-[#d92d20] font-extrabold text-white' : 'bg-[#0b5ed7] text-white' ?>"><?= $d ?></th>
        <?php endfor; ?>
        <th class="bg-[#4c1d56] border border-slate-600 p-1 text-center text-white" colspan="8">รวมเดือนนี้</th>
        <th class="bg-[#d9531e] border border-slate-600 p-1 text-center text-white" colspan="8">รวมตั้งแต่ต้นงบ</th>
        <th class="bg-[#0b5ed7] border border-slate-600 p-1 w-12 text-center text-white" rowspan="2">หมายเหตุ</th>
      </tr>
      <tr class="text-white text-[8px] font-bold">
        <?php foreach (['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as $sym): ?>
          <th class="bg-[#3b1244] border border-slate-600 p-0.5 w-4 text-purple-100"><?= $sym ?></th>
        <?php endforeach; ?>
        <?php foreach (['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as $sym): ?>
          <th class="bg-[#b43c10] border border-slate-600 p-0.5 w-4 text-orange-100"><?= $sym ?></th>
        <?php endforeach; ?>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($users as $index => $u): 
        $cntWork = 0;
        $mCounts = ['ศ' => 0, 'ป' => 0, 'ก' => 0, 'ค' => 0, 'อ' => 0, 'พ' => 0, 'ร' => 0, 'ส' => 0];
      ?>
      <tr>
        <td class="border border-slate-600 p-0.5"><?= $index + 1 ?></td>
        <td class="border border-slate-600 p-0.5 text-left pl-1">
          <div class="font-semibold text-slate-800"><?= htmlspecialchars($u['title'] . $u['first_name'] . ' ' . $u['last_name']) ?></div>
          <div class="text-[7.5px] text-slate-500"><?= htmlspecialchars($u['department_group']) ?></div>
        </td>
        <td class="border border-slate-600 p-0.5 text-center font-bold text-blue-900">
          <?php
            $okCount = 0;
            for ($d = 1; $d <= $daysInMonth; $d++) {
              $cd = sprintf('%04d-%02d-%02d', $yearCE, $month, $d);
              if (($attendanceMap[$u['id']][$cd] ?? '') === '/') $okCount++;
            }
            echo $okCount;
          ?>
        </td>
        <?php for ($d = 1; $d <= $daysInMonth; $d++): 
            $curDate = sprintf('%04d-%02d-%02d', $yearCE, $month, $d);
            $dayOfWeek = (int)date('w', strtotime($curDate));
            $isWeekend = ($dayOfWeek === 0 || $dayOfWeek === 6);
            $sym = $attendanceMap[$u['id']][$curDate] ?? '';
            if (isset($mCounts[$sym])) $mCounts[$sym]++;
        ?>
          <td class="border border-slate-600 p-0.5 font-bold <?= $isWeekend ? 'bg-[#fee8e8] text-rose-800' : ($sym === 'ห' ? 'bg-red-50 text-red-600 font-black' : 'bg-white') ?>">
            <?= $isWeekend ? '-' : htmlspecialchars($sym ?: '-') ?>
          </td>
        <?php endfor; ?>
        <?php foreach (['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as $s): ?>
          <td class="border border-slate-600 p-0.5 text-center bg-purple-50/20 text-purple-900"><?= $mCounts[$s] > 0 ? $mCounts[$s] : '-' ?></td>
        <?php endforeach; ?>
        <?php foreach (['ศ', 'ป', 'ก', 'ค', 'อ', 'พ', 'ร', 'ส'] as $s): ?>
          <td class="border border-slate-600 p-0.5 text-center bg-orange-50/20 text-orange-900"><?= $mCounts[$s] > 0 ? $mCounts[$s] : '-' ?></td>
        <?php endforeach; ?>
        <td class="border border-slate-600 p-0.5 text-center text-slate-400 text-[8px]">+ โอน</td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <!-- คำอธิบายตัวย่อทางราชการ -->
  <div class="mt-2 text-[9px] text-slate-600 flex flex-wrap gap-3">
    <span><b>ตัวย่อ:</b></span>
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

  <!-- ส่วนลงนามผู้รับรอง -->
  <div class="mt-6 grid grid-cols-2 text-center text-xs">
    <div>
      <p>ขอรับรองว่าการบันทึกถูกต้องตรงความเป็นจริง</p>
      <div class="mt-8 font-semibold">(ลงชื่อ) ................................................................</div>
      <p class="mt-1">( <?= htmlspecialchars($settings['responsibleOfficerName'] ?? $settings['responsible_officer_name'] ?? 'นางสุภาวดี เกษมพุก') ?> )</p>
      <p class="text-slate-600 text-[11px]"><?= htmlspecialchars($settings['responsibleOfficerPosition'] ?? $settings['responsible_officer_position'] ?? 'เจ้าหน้าที่ผู้รับผิดชอบ') ?></p>
      <p class="text-slate-500 text-[10px]">วันที่ .......... เดือน .................... พ.ศ. ...........</p>
    </div>
    <div>
      <p>ทราบและตรวจสอบแล้ว</p>
      <div class="mt-8 font-semibold">(ลงชื่อ) ................................................................</div>
      <p class="mt-1">( <?= htmlspecialchars($settings['supervisorName'] ?? $settings['supervisor_name'] ?? 'ผู้บังคับบัญชาชั้นต้น') ?> )</p>
      <p class="text-slate-600 text-[11px]"><?= htmlspecialchars($settings['supervisorPosition'] ?? $settings['supervisor_position'] ?? 'ตำแหน่งผู้บังคับบัญชา') ?></p>
      <p class="text-slate-500 text-[10px]">วันที่ .......... เดือน .................... พ.ศ. ...........</p>
    </div>
  </div>
</body>
</html>
`
  },
  {
    filename: 'print_summary.php',
    category: 'print',
    description: 'เอกสารพิมพ์ทางราชการ: แบบสรุปวันลาประจำปีงบประมาณ (1 ต.ค. พ.ศ. ก่อนหน้า - 30 ก.ย. พ.ศ. ปัจจุบัน)',
    code: `<?php
/**
 * แบบสรุปการลาปฏิบัติราชการ ประจำปีงบประมาณ
 * ไฟล์: print_summary.php
 */

declare(strict_types=1);
require_once __DIR__ . '/config/db.php';

$fiscalYearBE = isset($_GET['year']) ? (int)$_GET['year'] : 2568;
$prevYearBE = $fiscalYearBE - 1;

$stmt = $pdo->query("SELECT * FROM system_settings LIMIT 1");
$settings = $stmt->fetch() ?: [];

$usersStmt = $pdo->query("SELECT * FROM users WHERE status = 'active' ORDER BY department_group ASC, id ASC");
$users = $usersStmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>แบบสรุปวันลาปฏิบัติราชการ ประจำปีงบประมาณ พ.ศ. <?= $fiscalYearBE ?></title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Sarabun', sans-serif; font-size: 10pt; }
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="bg-white p-6">
  <div class="no-print mb-4 flex justify-between items-center bg-slate-100 p-3 rounded border">
    <div class="font-semibold text-slate-700">แบบฟอร์มสรุปวันลาประจำปีงบประมาณ (1 ต.ค. <?= $prevYearBE ?> - 30 ก.ย. <?= $fiscalYearBE ?>)</div>
    <button onclick="window.print()" class="bg-blue-700 text-white px-4 py-2 rounded text-sm hover:bg-blue-800">
      🖨️ สั่งพิมพ์แบบสรุป (Print)
    </button>
  </div>

  <div class="text-center mb-4">
    <h1 class="text-base font-bold">แบบสรุปการลาปฏิบัติราชการ ประจำปีงบประมาณ พ.ศ. <?= $fiscalYearBE ?></h1>
    <h2 class="text-sm font-semibold"><?= htmlspecialchars($settings['agency_name'] ?? 'หน่วยงานราชการ') ?></h2>
    <p class="text-xs text-slate-600">(รอบการประเมิน: วันที่ 1 ตุลาคม พ.ศ. <?= $prevYearBE ?> ถึง วันที่ 30 กันยายน พ.ศ. <?= $fiscalYearBE ?>)</p>
  </div>

  <table class="w-full border-collapse border border-slate-700 text-center text-xs">
    <thead>
      <tr class="bg-slate-200">
        <th class="border border-slate-600 p-1.5 w-10" rowspan="2">ลำดับ</th>
        <th class="border border-slate-600 p-1.5 text-left" rowspan="2">ชื่อ - สกุล / กลุ่มงาน</th>
        <th class="border border-slate-600 p-1.5" colspan="4">วันลาพักผ่อนประจำปี (วัน)</th>
        <th class="border border-slate-600 p-1.5" colspan="3">การลาประเภทอื่น (วัน)</th>
        <th class="border border-slate-600 p-1.5 w-16" rowspan="2">หมายเหตุ</th>
      </tr>
      <tr class="bg-slate-100 text-[11px]">
        <th class="border border-slate-600 p-1">สะสมยกมา</th>
        <th class="border border-slate-600 p-1">สิทธิ์ปีนี้</th>
        <th class="border border-slate-600 p-1 text-rose-700">ใช้ไป</th>
        <th class="border border-slate-600 p-1 text-emerald-800 font-bold">คงเหลือ</th>
        <th class="border border-slate-600 p-1">ลาป่วย (ป)</th>
        <th class="border border-slate-600 p-1">ลากิจ (ก)</th>
        <th class="border border-slate-600 p-1">ศึกษา/คลอด/อื่น</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($users as $idx => $u): 
        $acc = (float)$u['accumulated_leave_days'];
        $quota = (float)$u['yearly_quota_days'];
        $used = (float)$u['used_leave_days'];
        $remain = max(0, ($acc + $quota) - $used);
      ?>
      <tr>
        <td class="border border-slate-600 p-1"><?= $idx + 1 ?></td>
        <td class="border border-slate-600 p-1 text-left pl-2">
          <div class="font-semibold text-slate-800"><?= htmlspecialchars($u['title'] . $u['first_name'] . ' ' . $u['last_name']) ?></div>
          <div class="text-[10px] text-slate-500"><?= htmlspecialchars($u['department_group'] . ' | ' . $u['position']) ?></div>
        </td>
        <td class="border border-slate-600 p-1"><?= $acc ?></td>
        <td class="border border-slate-600 p-1"><?= $quota ?></td>
        <td class="border border-slate-600 p-1 text-rose-700 font-semibold"><?= $used ?></td>
        <td class="border border-slate-600 p-1 text-emerald-800 font-bold bg-emerald-50"><?= $remain ?></td>
        <td class="border border-slate-600 p-1">-</td>
        <td class="border border-slate-600 p-1">-</td>
        <td class="border border-slate-600 p-1">-</td>
        <td class="border border-slate-600 p-1 text-[10px] text-slate-400">ปกติ</td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <div class="mt-10 grid grid-cols-2 text-center text-xs">
    <div>
      <div class="font-semibold">(ลงชื่อ) ................................................................</div>
      <p class="mt-1">( <?= htmlspecialchars($settings['responsibleOfficerName'] ?? 'นายประเวศ บุญรอด') ?> )</p>
      <p class="text-slate-600 text-[11px]"><?= htmlspecialchars($settings['responsibleOfficerPosition'] ?? 'นักทรัพยากรบุคคลชำนาญการ') ?></p>
      <p class="text-slate-500 text-[10px]">ผู้จัดทำข้อมูล</p>
    </div>
    <div>
      <div class="font-semibold">(ลงชื่อ) ................................................................</div>
      <p class="mt-1">( <?= htmlspecialchars($settings['supervisorName'] ?? 'ผู้บังคับบัญชาชั้นต้น') ?> )</p>
      <p class="text-slate-600 text-[11px]"><?= htmlspecialchars($settings['supervisorPosition'] ?? 'คณบดี') ?></p>
      <p class="text-slate-500 text-[10px]">ผู้บังคับบัญชาชั้นต้น</p>
    </div>
  </div>
</body>
</html>
`
  }
];
