// ============================================================
// SMART CLASS - Firebase Web App
// ============================================================
// 1. Isi FIREBASE_CONFIG di bawah.
// 2. Upload index.html, style.css, dan app.js ke GitHub.
// 3. Aktifkan GitHub Pages.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// ============================================================
// FIREBASE CONFIG
// GANTI DENGAN CONFIG PROJECT FIREBASE KAMU
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://GANTI_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "GANTI_MESSAGING_SENDER_ID",
  appId: "GANTI_APP_ID"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);

// ============================================================
// ELEMENT
// ============================================================

const loginPage = document.getElementById("loginPage");
const dashboardPage = document.getElementById("dashboardPage");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const displayName = document.getElementById("displayName");
const logoutBtn = document.getElementById("logoutBtn");

const connectionStatus = document.getElementById("connectionStatus");

const currentDay = document.getElementById("currentDay");
const className = document.getElementById("className");
const classTime = document.getElementById("classTime");
const classRoom = document.getElementById("classRoom");
const classStatus = document.getElementById("classStatus");
const classCard = document.getElementById("classCard");

const arriveBtn = document.getElementById("arriveBtn");
const attendanceText = document.getElementById("attendanceText");

const voltageEl = document.getElementById("voltage");
const currentEl = document.getElementById("current");
const powerEl = document.getElementById("power");
const relayStatus = document.getElementById("relayStatus");
const lastUpdate = document.getElementById("lastUpdate");

const relayOnBtn = document.getElementById("relayOnBtn");
const relayOffBtn = document.getElementById("relayOffBtn");
const adminSection = document.getElementById("adminSection");

const clock = document.getElementById("clock");
const toast = document.getElementById("toast");

// ============================================================
// STATE
// ============================================================

let currentUser = null;
let activeClass = null;
let currentRelay = false;

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];

// ============================================================
// LOGIN
// ============================================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) return;

  loginMessage.textContent = "Memeriksa akun...";

  try {
    const userSnap = await get(ref(db, `users/${username}`));

    if (!userSnap.exists()) {
      loginMessage.textContent = "Username tidak ditemukan.";
      return;
    }

    const user = userSnap.val();

    // Untuk prototype.
    // Untuk sistem produksi, gunakan Firebase Authentication.
    if (String(user.password) !== password) {
      loginMessage.textContent = "Password salah.";
      return;
    }

    currentUser = {
      username,
      ...user
    };

    localStorage.setItem(
      "smartClassUser",
      JSON.stringify(currentUser)
    );

    showDashboard();

  } catch (error) {
    console.error(error);
    loginMessage.textContent =
      "Gagal terhubung ke Firebase.";
  }
});

// ============================================================
// LOGOUT
// ============================================================

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("smartClassUser");
  currentUser = null;
  dashboardPage.classList.add("hidden");
  loginPage.classList.remove("hidden");
  loginForm.reset();
  loginMessage.textContent = "";
});

// ============================================================
// DASHBOARD
// ============================================================

function showDashboard() {
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");

  displayName.textContent =
    currentUser.name || currentUser.username;

  // Admin section jika role admin
  if (currentUser.role === "admin") {
    adminSection.classList.remove("hidden");
  } else {
    adminSection.classList.add("hidden");
  }

  updateClock();
  findCurrentClass();
  listenPowerData();
  listenRelay();
}

// ============================================================
// JAM
// ============================================================

function updateClock() {
  const now = new Date();

  clock.textContent = now.toLocaleTimeString(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  ) + " WIB";

  currentDay.textContent =
    now.toLocaleDateString(
      "id-ID",
      {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );
}

setInterval(updateClock, 1000);

// ============================================================
// CARI KELAS YANG SEDANG BERLANGSUNG
// ============================================================

async function findCurrentClass() {
  try {
    const snapshot = await get(ref(db, "classes"));

    if (!snapshot.exists()) {
      showNoClass("Data jadwal belum tersedia.");
      return;
    }

    const classes = snapshot.val();
    const now = new Date();

    const jakartaTime = new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }
    ).format(now);

    const dayName = new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone: "Asia/Jakarta",
        weekday: "long"
      }
    ).format(now);

    const currentMinutes =
      convertTimeToMinutes(jakartaTime);

    let found = null;

    Object.entries(classes).forEach(([id, item]) => {

      if (!item) return;

      const scheduleDay =
        String(item.hari || "").toLowerCase();

      if (scheduleDay !== dayName.toLowerCase()) {
        return;
      }

      const start =
        convertTimeToMinutes(item.mulai);

      const end =
        convertTimeToMinutes(item.selesai);

      if (
        currentMinutes >= start &&
        currentMinutes <= end
      ) {
        found = {
          id,
          ...item
        };
      }
    });

    activeClass = found;

    if (found) {
      showActiveClass(found);
      checkAttendance();
    } else {
      showNoClass("Tidak ada kelas aktif saat ini.");
    }

  } catch (error) {
    console.error(error);
    showNoClass("Gagal membaca jadwal.");
  }
}

function convertTimeToMinutes(time) {
  if (!time) return -1;

  const parts = String(time).split(":");

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  return hour * 60 + minute;
}

// Cek jadwal setiap 30 detik
setInterval(findCurrentClass, 30000);

// ============================================================
// TAMPILKAN KELAS
// ============================================================

function showActiveClass(item) {
  classCard.classList.remove("no-class");

  className.textContent =
    item.nama || "Nama Kelas";

  classTime.textContent =
    `${item.mulai || "--:--"} - ${item.selesai || "--:--"}`;

  classRoom.textContent =
    `Ruang: ${item.ruang || "-"}`;

  classStatus.textContent =
    "BERLANGSUNG";

  arriveBtn.disabled = false;
}

function showNoClass(message) {
  classCard.classList.add("no-class");

  className.textContent = message;
  classTime.textContent = "-";
  classRoom.textContent = "Silakan cek kembali jadwal.";
  classStatus.textContent = "TIDAK ADA KELAS";

  arriveBtn.disabled = true;
  activeClass = null;
}

// ============================================================
// PRESENSI / DATANG
// ============================================================

arriveBtn.addEventListener("click", async () => {

  if (!currentUser || !activeClass) {
    showToast("Tidak ada kelas aktif.");
    return;
  }

  arriveBtn.disabled = true;
  arriveBtn.textContent = "MEMPROSES...";

  try {
    const now = new Date();

    const attendanceData = {
      username: currentUser.username,
      name: currentUser.name || currentUser.username,
      classId: activeClass.id,
      className: activeClass.nama || "",
      room: activeClass.ruang || "",
      status: "HADIR",
      time: now.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta"
      }),
      timestamp: serverTimestamp()
    };

    // Simpan ke database
    await set(
      ref(
        db,
        `attendance/${currentUser.username}/${activeClass.id}`
      ),
      attendanceData
    );

    // Nyalakan relay
    await set(
      ref(db, "control/relay"),
      true
    );

    await set(
      ref(db, "control/lastUser"),
      currentUser.username
    );

    await set(
      ref(db, "control/lastClass"),
      activeClass.nama || ""
    );

    attendanceText.textContent =
      `HADIR • ${attendanceData.time}`;

    showToast("Presensi berhasil. Lampu dinyalakan.");

  } catch (error) {
    console.error(error);
    showToast("Presensi gagal.");
  }

  arriveBtn.textContent = "SUDAH DATANG";
});

// ============================================================
// CEK PRESENSI
// ============================================================

async function checkAttendance() {

  if (!currentUser || !activeClass) return;

  try {
    const snapshot = await get(
      ref(
        db,
        `attendance/${currentUser.username}/${activeClass.id}`
      )
    );

    if (snapshot.exists()) {

      const data = snapshot.val();

      attendanceText.textContent =
        `HADIR • ${data.time || "-"}`;

      arriveBtn.disabled = true;
      arriveBtn.textContent = "SUDAH DATANG";

    } else {

      attendanceText.textContent =
        "Belum melakukan presensi.";

      arriveBtn.disabled = false;
      arriveBtn.textContent = "DATANG";
    }

  } catch (error) {
    console.error(error);
  }
}

// ============================================================
// FIREBASE POWER DATA
// ============================================================

function listenPowerData() {

  const powerRef = ref(db, "power_monitor");

  onValue(powerRef, (snapshot) => {

    if (!snapshot.exists()) {
      connectionStatus.textContent = "● ONLINE";
      connectionStatus.className = "status-badge online";
      return;
    }

    const data = snapshot.val();

    voltageEl.textContent =
      number(data.voltage);

    currentEl.textContent =
      number(data.current);

    powerEl.textContent =
      number(data.power);

    if (data.timestamp) {
      lastUpdate.textContent =
        formatTimestamp(data.timestamp);
    }

    connectionStatus.textContent =
      "● ONLINE";

    connectionStatus.className =
      "status-badge online";
  }, (error) => {

    console.error(error);

    connectionStatus.textContent =
      "● OFFLINE";

    connectionStatus.className =
      "status-badge offline";
  });
}

// ============================================================
// FIREBASE RELAY
// ============================================================

function listenRelay() {

  const relayRef = ref(db, "control/relay");

  onValue(relayRef, (snapshot) => {

    currentRelay = snapshot.val() === true;

    relayStatus.textContent =
      currentRelay ? "ON" : "OFF";

    relayStatus.style.color =
      currentRelay ? "#17a673" : "#e5484d";
  });
}

// ============================================================
// MANUAL RELAY CONTROL
// ============================================================

relayOnBtn.addEventListener("click", async () => {
  await setRelay(true);
});

relayOffBtn.addEventListener("click", async () => {
  await setRelay(false);
});

async function setRelay(state) {

  try {
    await set(
      ref(db, "control/relay"),
      state
    );

    showToast(
      state
        ? "Lampu dinyalakan."
        : "Lampu dimatikan."
    );

  } catch (error) {
    console.error(error);
    showToast("Gagal mengubah relay.");
  }
}

// ============================================================
// UTILITIES
// ============================================================

function number(value) {

  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "0.00";
  }

  return n.toFixed(2);
}

function formatTimestamp(timestamp) {

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  ) + " WIB";
}

function showToast(message) {

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ============================================================
// AUTO LOGIN DARI LOCAL STORAGE
// ============================================================

const savedUser =
  localStorage.getItem("smartClassUser");

if (savedUser) {

  try {

    currentUser = JSON.parse(savedUser);

    showDashboard();

  } catch {

    localStorage.removeItem("smartClassUser");
  }
}
