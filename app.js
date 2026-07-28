// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Hjálparfall: uppfæra teljara í UI
function updateCountUI(exerciseId, count) {
  const card = document.querySelector(`.exercise-card[data-id="${exerciseId}"]`);
  if (!card) return;
  const span = card.querySelector(".count");
  span.textContent = count;
}

// Sækja núverandi tölur úr Firestore
async function loadCounts() {
  const snapshot = await db.collection("exercises").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    updateCountUI(doc.id, data.count || 0);
  });
}

// Skrá „klárað í dag“
async function markDone(exerciseId) {
  const ref = db.collection("exercises").doc(exerciseId);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const current = doc.exists ? (doc.data().count || 0) : 0;
    tx.set(ref, { count: current + 1 }, { merge: true });
  });
  // Uppfæra strax í UI
  const card = document.querySelector(`.exercise-card[data-id="${exerciseId}"]`);
  const span = card.querySelector(".count");
  span.textContent = parseInt(span.textContent, 10) + 1;
}

// Event listeners fyrir alla „done-btn“
document.querySelectorAll(".exercise-card").forEach(card => {
  const id = card.dataset.id;
  const btn = card.querySelector(".done-btn");
  btn.addEventListener("click", () => markDone(id));
});

// Hlaða gögn þegar appið opnar
loadCounts();

// PWA – register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
