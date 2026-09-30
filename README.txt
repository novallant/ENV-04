# SMART CLASS - Firebase + GitHub Pages

Frontend dashboard untuk:
- Login user
- Deteksi kelas berdasarkan hari dan jam
- Presensi tombol DATANG
- Menyalakan relay melalui Firebase
- Monitoring tegangan
- Monitoring arus
- Monitoring daya
- Monitoring status relay
- Jam WIB real-time

## 1. Struktur file

```text
smart-class/
├── index.html
├── style.css
└── app.js
```

## 2. Firebase Realtime Database

Struktur data yang digunakan:

```text
users/
  bangun/
    name: "Bangun"
    password: "12345"
    role: "user"

classes/
  kelas1/
    nama: "Elektronika Industri"
    hari: "Selasa"
    mulai: "18:30"
    selesai: "20:30"
    ruang: "Lab Elektro"

power_monitor/
  voltage: 225.4
  current: 0.82
  power: 184.8
  timestamp: 123456789

control/
  relay: false
  lastUser: ""
  lastClass: ""

attendance/
  bangun/
    kelas1/
      username: "bangun"
      name: "Bangun"
      classId: "kelas1"
      className: "Elektronika Industri"
      room: "Lab Elektro"
      status: "HADIR"
      time: "29/09/2026 18.30.00"
      timestamp: 123456789
```

## 3. Masukkan Firebase Config

Buka `app.js`.

Cari:

```js
const FIREBASE_CONFIG = {
```

Ganti semua nilai `GANTI_...` dengan Firebase Web App Config dari Firebase Console.

## 4. GitHub Pages

Upload:

- index.html
- style.css
- app.js

ke repository GitHub.

Kemudian:

Settings → Pages → Deploy from branch → main → /root → Save

## 5. Catatan keamanan

Kode login pada prototype ini membaca password dari Realtime Database.
Untuk sistem nyata/produksi, gunakan Firebase Authentication dan Security Rules.

Jangan membiarkan database production dapat ditulis oleh semua orang.
Atur Firebase Realtime Database Security Rules sebelum digunakan secara nyata.
