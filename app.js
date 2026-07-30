// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const EXERCISE_IDS = ["band-row", "tricep-extension", "band-pull-apart", "chest-flies", "bicep-curls", "chest-flies-ground"];
const SETS_TO_FILL = 3;
const DAY_LABELS = ["Mán", "Þri", "Mið", "Fim", "Fös", "Lau", "Sun"];

let weekCache = null;

function pad(n) { return n < 10 ? "0" + n : "" + n; }
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function weekDates(mondayDate) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

async function fetchDailyDocs(dateStrs) {
  const results = {};
  await Promise.all(dateStrs.map(async (ds) => {
    const doc = await db.collection("daily").doc(ds).get();
    results[ds] = doc.exists ? doc.data() : {};
  }));
  return results;
}

function dayPercent(dayData) {
  let sum = 0;
  EXERCISE_IDS.forEach(id => { sum += Math.min(dayData[id] || 0, SETS_TO_FILL); });
  return Math.round((sum / (EXERCISE_IDS.length * SETS_TO_FILL)) * 100);
}
function dayComplete(dayData) { return dayPercent(dayData) === 100; }

function updateCountUI(exerciseId, count) {
  const card = document.querySelector(`.exercise-card[data-id="${exerciseId}"]`);
  if (!card) return;
  card.querySelector(".count").textContent = count;
}

async function loadCounts() {
  const snapshot = await db.collection("exercises").get();
  snapshot.forEach(doc => updateCountUI(doc.id, doc.data().count || 0));
}

function updateTodayUIForCard(exerciseId, setsToday) {
  const card = document.querySelector(`.exercise-card[data-id="${exerciseId}"]`);
  if (!card) return;
  const span = card.querySelector(".today-sets");
  if (span) span.textContent = Math.min(setsToday, SETS_TO_FILL);
  const btn = card.querySelector(".done-btn");
  if (btn) btn.disabled = setsToday >= SETS_TO_FILL;
}

const popupQueue = [];
function queuePopup(text) {
  popupQueue.push(text);
  if (popupQueue.length === 1) showNextPopup();
}
function showNextPopup() {
  const overlay = document.getElementById("popup-overlay");
  const textEl = document.getElementById("popup-text");
  if (popupQueue.length === 0) { overlay.classList.add("hidden"); return; }
  textEl.textContent = popupQueue[0];
  overlay.classList.remove("hidden");
}
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("popup-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      popupQueue.shift();
      showNextPopup();
    });
  }
});

function tierForCount(fullDaysCount) {
  if (fullDaysCount >= 7) return { color: "#ec4899" };
  if (fullDaysCount >= 5) return { color: "#f97316" };
  if (fullDaysCount >= 3) return { color: "#22c55e" };
  return { color: "#9ca3af" };
}

function renderDayChecks(dates, weekData) {
  const wrap = document.getElementById("day-checks");
  wrap.innerHTML = "";
  const todayStr = formatDate(new Date());
  dates.forEach((ds, i) => {
    const complete = dayComplete(weekData[ds] || {});
    const div = document.createElement("div");
    div.className = "day-check" + (complete ? " done" : "");
    div.innerHTML = `<span>${DAY_LABELS[i]}${ds === todayStr ? " •" : ""}</span><span class="mark">${complete ? "&#10003;" : ""}</span>`;
    wrap.appendChild(div);
  });
}

function renderPie(fullDaysCount) {
  const svg = document.getElementById("week-pie");
  const tier = tierForCount(fullDaysCount);
  const r = 50, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  const fraction = fullDaysCount / 7;
  const dash = circumference * fraction;
  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#374151" stroke-width="14"></circle>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${tier.color}" stroke-width="14"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"></circle>
    <text x="${cx}" y="${cy + 5}" text-anchor="middle" class="pie-text">${fullDaysCount}/7</text>
  `;
  const trophy = document.getElementById("trophy");
  trophy.classList.toggle("hidden", fullDaysCount < 7);
}

function renderBatteries(dates, weekData) {
  const wrap = document.getElementById("battery-row");
  wrap.innerHTML = "";
  const todayStr = formatDate(new Date());
  dates.forEach((ds, i) => {
    const dayData = weekData[ds] || {};
    const pct = dayPercent(dayData);
    const div = document.createElement("div");
    div.className = "battery" + (ds === todayStr ? " today" : "");
    let segsHtml = "";
    EXERCISE_IDS.forEach(id => {
      const setsDone = Math.min(dayData[id] || 0, SETS_TO_FILL);
      const fillPct = Math.round((setsDone / SETS_TO_FILL) * 100);
      segsHtml += `<div class="battery-seg"><div class="fill" style="height:${fillPct}%"></div></div>`;
    });
    div.innerHTML = `
      <span>${DAY_LABELS[i]}</span>
      <div class="battery-shell">${segsHtml}</div>
      <span class="battery-label">${pct}%</span>
    `;
    wrap.appendChild(div);
  });
}

async function renderLastWeekSummary(mondayDate) {
  const lastMonday = new Date(mondayDate);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const dates = weekDates(lastMonday);
  const data = await fetchDailyDocs(dates);
  let fullCount = 0;
  dates.forEach(ds => { if (dayComplete(data[ds] || {})) fullCount++; });
  const box = document.getElementById("last-week-box");
  box.textContent = `Síðasta vika: ${fullCount} af 7 dögum náð`;
}

async function refreshWeek() {
  const now = new Date();
  const monday = mondayOf(now);
  const mondayStr = formatDate(monday);
  const dates = weekDates(monday);
  const data = await fetchDailyDocs(dates);

  let fullDaysNow = new Set();
  dates.forEach(ds => { if (dayComplete(data[ds] || {})) fullDaysNow.add(ds); });

  const isSameWeek = weekCache && weekCache.mondayStr === mondayStr;
  const previousFull = isSameWeek ? weekCache.fullDays : new Set();

  fullDaysNow.forEach(ds => {
    if (!previousFull.has(ds)) {
      queuePopup("Vel gert, þú mátt fá þér smá karamellukrem 🍬");
    }
  });

  const prevCount = previousFull.size;
  const newCount = fullDaysNow.size;
  if (newCount >= 4 && prevCount < 4) {
    queuePopup("Núna máttu fá þér stóran kleinuhring og mikið af karamellu 🍩");
  }

  weekCache = { mondayStr, dates, data, fullDays: fullDaysNow };

  renderDayChecks(dates, data);
  renderPie(fullDaysNow.size);
  renderBatteries(dates, data);

  const todayStr = formatDate(now);
  const todayData = data[todayStr] || {};
  EXERCISE_IDS.forEach(id => updateTodayUIForCard(id, todayData[id] || 0));

  renderLastWeekSummary(monday);
}

async function markDone(exerciseId) {
  const todayStr = formatDate(new Date());
  const exerciseRef = db.collection("exercises").doc(exerciseId);
  const dayRef = db.collection("daily").doc(todayStr);

  await db.runTransaction(async (tx) => {
    const exerciseDoc = await tx.get(exerciseRef);
    const dayDoc = await tx.get(dayRef);
    const currentLifetime = exerciseDoc.exists ? (exerciseDoc.data().count || 0) : 0;
    const dayData = dayDoc.exists ? dayDoc.data() : {};
    const currentSets = dayData[exerciseId] || 0;

    if (currentSets >= SETS_TO_FILL) return;

    tx.set(exerciseRef, { count: currentLifetime + 1 }, { merge: true });
    tx.set(dayRef, { [exerciseId]: currentSets + 1 }, { merge: true });
  });

  const freshDoc = await exerciseRef.get();
  updateCountUI(exerciseId, freshDoc.exists ? (freshDoc.data().count || 0) : 0);

  await refreshWeek();
}

// ---------- Flipbook (alvöru myndir í stað teikninga) ----------
const FLIPBOOKS = {
  "band-row": ["images/back-row-1.jpg", "images/back-row-2.jpg", "images/back-row-3.jpg", "images/back-row-4.jpg"],
  "tricep-extension": [
    "images/tricep-extension-1.jpg",
    "images/tricep-extension-2.jpg",
    "images/tricep-extension-3.jpg",
    "images/tricep-extension-4.jpg",
    "images/tricep-extension-3.jpg"
  ],
  "band-pull-apart": [
    "images/pull-apart-1.jpg",
    "images/pull-apart-2.jpg",
    "images/pull-apart-3.jpg",
    "images/pull-apart-4.jpg"
  ],
  "bicep-curls": [
    "images/curls-1.jpg",
    "images/curls-2.jpg",
    "images/curls-3.jpg",
    "images/curls-4.jpg",
    "images/curls-5.jpg"
  ],
  "chest-flies": [
    "images/chest-flies-1.jpg",
    "images/chest-flies-2.jpg",
    "images/chest-flies-3.jpg"
  ],
  "chest-flies-ground": [
    "images/chest-flies-ground-1.jpg",
    "images/chest-flies-ground-2.jpg"
  ],
};

function startFlipbooks() {
  Object.keys(FLIPBOOKS).forEach(exerciseId => {
    const img = document.getElementById(`flip-${exerciseId}`);
    if (!img) return;
    const frames = FLIPBOOKS[exerciseId];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % frames.length;
      img.src = frames[idx];
    }, 1300);
  });
}
startFlipbooks();

document.querySelectorAll(".exercise-card").forEach(card => {
  const id = card.dataset.id;
  const btn = card.querySelector(".done-btn");
  btn.addEventListener("click", () => markDone(id));
});

loadCounts();
refreshWeek();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
