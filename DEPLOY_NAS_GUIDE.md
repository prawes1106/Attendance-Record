# คู่มือการติดตั้งระบบลงเวลาปฏิบัติราชการขึ้น NAS Server
(ภาควิชาวิศวกรรมเครื่องกล คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเกษตรศาสตร์)

ระบบนี้เป็น **Web Application แบบ SPA (Single Page Application)** สร้างด้วย React + Vite + Tailwind CSS ข้อมูลทั้งหมดจัดเก็บในตัวอย่างหรือฐานข้อมูลเบราว์เซอร์ จึงสามารถรันบน NAS Server ได้สะดวกรวดเร็ว ประหยัดทรัพยากร (ใช้ RAM ไม่ถึง 20MB)

---

## วิธีที่ 1: ติดตั้งผ่าน Docker / Container Manager บน NAS (แนะนำที่สุด ⭐)
รองรับทั้ง **Synology NAS (Container Manager / Docker)**, **QNAP (Container Station)**, และ **TrueNAS**

### ไฟล์ที่ต้องใช้บน NAS (เพียง 3 รายการ ไม่ต้อง build ใน NAS):
1. `docker-compose.yml` (ตั้งค่าดึง image nginx:alpine พร้อมใช้งาน)
2. `nginx.conf` (การตั้งค่า SPA routing)
3. โฟลเดอร์ `dist/` (ไฟล์ระบบที่ build เสร็จแล้ว)

### ขั้นตอนสำหรับ Synology NAS (ง่ายที่สุด):
1. **คัดลอกขึ้น NAS:**
   - นำไฟล์ `docker-compose.yml`, `nginx.conf` และโฟลเดอร์ `dist/` ไปวางไว้ในโฟลเดอร์บน NAS เช่น `/volume1/docker/attendance/`
   *(โครงสร้างไฟล์จะเป็น: `/docker/attendance/docker-compose.yml`, `/docker/attendance/nginx.conf`, `/docker/attendance/dist/...`)*
2. **เปิดแอป Container Manager บน Synology:**
   - ไปที่แถบเมนู **Project (โปรเจกต์)**
   - กดปุ่ม **Create (สร้าง)**
   - ตั้งชื่อโปรเจกต์ เช่น `ku-attendance`
   - กำหนด Path ไปที่โฟลเดอร์ `/docker/attendance`
   - ระบบจะตรวจพบไฟล์ `docker-compose.yml` ทันที
   - กด **Next** แล้วกด **Done** (ระบบจะดึง Image `nginx:alpine` มาเปิดใช้งานใน 2 วินาที โดยไม่ต้อง build เลย)
3. **เข้าใช้งาน:**
   - เปิดเบราว์เซอร์ไปที่: `http://<IP-ของ-NAS>:8080` เช่น `http://192.168.1.100:8080`

### คำสั่งรันผ่าน SSH หรือ Terminal (ทางเลือก):
```bash
# เข้าสู่โฟลเดอร์บน NAS
cd /volume1/docker/attendance

# สั่งรัน container (ไม่ต้องใช้ --build)
docker compose up -d

# ตรวจสอบสถานะ
docker compose ps
```

---

## วิธีที่ 2: ติดตั้งผ่าน Web Station / Web Server ของ NAS (ไม่ต้องใช้ Docker)
เนื่องจากระบบนี้เมื่อ Build แล้วจะได้ไฟล์สถิต (Static HTML, CSS, JavaScript) สามารถเปิดผ่าน Web Station ได้ทันที

### ขั้นตอน:
1. **Build ไฟล์ในเครื่อง (หรือใช้โฟลเดอร์ `dist/` ที่มีให้แล้ว):**
   ```bash
   # สำคัญ: ต้องรันติดตั้ง dependencies ก่อน 1 ครั้ง (เพื่อดาวน์โหลด vite)
   npm install

   # สั่ง build สร้างไฟล์สำหรับ production
   npm run build
   ```
   *(💡 **ทางลัด:** ในโปรเจกต์นี้มีโฟลเดอร์ **`dist/`** ที่ build ให้เสร็จเรียบร้อยแล้ว ท่านสามารถข้ามคำสั่ง `npm run build` แล้วนำไฟล์ใน `dist/` ไปใช้งานได้ทันที)*
2. **คัดลอกไฟล์ขึ้น NAS:**
   - เปิด **File Station** บน NAS
   - เข้าไปที่โฟลเดอร์ `web` (โฟลเดอร์เริ่มต้นของ Web Station)
   - สร้างโฟลเดอร์ย่อย เช่น `/web/attendance/`
   - คัดลอกไฟล์และโฟลเดอร์ทั้งหมด **ที่อยู่ข้างในโฟลเดอร์ `dist/`** ไปวางใน `/web/attendance/`
3. **ตั้งค่าในแอป Web Station บน Synology:**
   - เปิดแอป **Web Station**
   - ไปที่ **Web Service** -> สร้าง Service ใหม่ (เลือก Static Website)
   - กำหนด **Document Root** ไปที่โฟลเดอร์ `/web/attendance`
   - ไปที่ **Web Portal** -> สร้าง Portal (เลือก Port-based เช่น พอร์ต 8088 หรือตามต้องการ)
4. **เข้าใช้งาน:**
   - เข้าผ่าน `http://<IP-ของ-NAS>:8088` หรือ `http://<IP-ของ-NAS>/attendance`

---

## หมายเหตุและการตั้งค่าเพิ่มเติม
- **Port:** สามารถเปลี่ยนพอร์ตจาก `8080` เป็นพอร์ตอื่นที่ว่างได้ในไฟล์ `docker-compose.yml` บรรทัด `ports: - "8080:80"`
- **HTTPS / SSL:** หากต้องการใช้งานผ่าน HTTPS ภายในมหาวิทยาลัย สามารถตั้งค่า Reverse Proxy ใน **Control Panel -> Login Portal -> Advanced -> Reverse Proxy** บน Synology NAS แล้วผูกกับ Let's Encrypt Certificate ของมหาวิทยาลัยได้ทันที
