const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "fit_plan_v5";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEALS_PER_DAY = ["lunch", "dinner"];

/**
 * ===== Training templates =====
 */
function buildWorkoutTemplate(daysPerWeek) {
  if (daysPerWeek === 3) return { Mon: workoutFullA(), Wed: workoutFullB(), Fri: workoutFullC() };
  return { Mon: workoutUpperA(), Tue: workoutLowerA(), Thu: workoutUpperB(), Sat: workoutLowerB() };
}

function workoutFullA() {
  return {
    title: "Full Body A (Push + Legs + Core)",
    duration: "35–50 min",
    moves: [
      "Squat (bodyweight/backpack/dumbbell) — 3–4 x 8–15",
      "Push-up (incline/knee/standard) — 3–4 x 6–15",
      "RDL (dumbbell/backpack) — 3–4 x 8–15",
      "Side plank — 2–3 x 30–60s"
    ],
    note: "Keep 1–2 reps in reserve (RIR 1–2)."
  };
}
function workoutFullB() {
  return {
    title: "Full Body B (Pull + Single-leg + Shoulder)",
    duration: "35–50 min",
    moves: [
      "Row (band/dumbbell) — 3–4 x 8–15",
      "Bulgarian split squat — 3–4 x 8–12/side",
      "Overhead press (band/dumbbell) — 3–4 x 8–15",
      "Dead bug / leg raise — 2–3 x 10–15"
    ],
    note: "At home, rows + face pulls keep your shoulders happy."
  };
}
function workoutFullC() {
  return {
    title: "Full Body C (Glutes + Push/Pull + Core)",
    duration: "35–50 min",
    moves: [
      "Hip thrust / Glute bridge — 3–4 x 10–20",
      "Push-up variation — 3–4 x 8–15",
      "Band face pull / Reverse fly — 3 x 12–20",
      "Plank — 2–3 x 30–60s"
    ],
    note: "If you later get dumbbells, add load for progression."
  };
}

function workoutUpperA() {
  return {
    title: "Upper A (Push + Pull)",
    duration: "35–50 min",
    moves: [
      "Push-up — 4 x 6–15",
      "Row (band/dumbbell) — 4 x 8–15",
      "Overhead press — 3 x 8–15",
      "Band face pull / Reverse fly — 3 x 12–20"
    ],
    note: "Alternate push and pull to save time."
  };
}
function workoutLowerA() {
  return {
    title: "Lower A (Squat focus)",
    duration: "35–50 min",
    moves: [
      "Squat — 4 x 8–15",
      "Bulgarian split squat — 3 x 8–12/side",
      "Calf raises — 3 x 12–20",
      "Core: plank — 2–3 x 30–60s"
    ],
    note: "No weights? Use tempo: 3s down, 1s pause, drive up."
  };
}
function workoutUpperB() {
  return {
    title: "Upper B (Shoulder + Back)",
    duration: "35–50 min",
    moves: [
      "Overhead press — 4 x 8–15",
      "Row — 4 x 8–15",
      "Push-up (easier version) — 3 x 8–15",
      "Band curls / triceps extensions — 2–3 x 10–20"
    ],
    note: "Arms are optional—do them if you enjoy it."
  };
}
function workoutLowerB() {
  return {
    title: "Lower B (Hinge + Glutes)",
    duration: "35–50 min",
    moves: [
      "RDL (band/dumbbell/backpack) — 4 x 8–15",
      "Hip thrust / Glute bridge — 4 x 10–20",
      "Lunge / step-up — 3 x 8–12/side",
      "Core: dead bug — 2–3 x 10–15"
    ],
    note: "Hinge days protect your back and improve posture."
  };
}

/**
 * ===== Nutrition math =====
 */
function bmrMifflin(weightKg, heightCm, ageYears, sex) {
  const w = Number(weightKg), h = Number(heightCm), a = Number(ageYears);
  if (![w, h, a].every(v => Number.isFinite(v) && v > 0)) return null;
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(base + (sex === "female" ? -161 : 5));
}
function tdeeFromBmr(bmr, activityFactor) {
  if (!bmr || !activityFactor) return null;
  return Math.round(bmr * Number(activityFactor));
}
function applyGoal(tdee, goal) {
  if (!tdee) return null;
  if (goal === "cut") return Math.round(tdee * 0.85);
  if (goal === "bulk") return Math.round(tdee * 1.10);
  return tdee;
}
function splitTrainingRest(base) {
  const train = Math.max(1600, base + 250);
  const rest = Math.max(1400, base - 250);
  return { training: train, rest: rest };
}
function proteinTarget(weightKg) {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return null;
  return Math.round(w * 1.6);
}
function mealGuidanceText(isTrainingDay, goal) {
  if (isTrainingDay) {
    if (goal === "cut") return "Training-day: high protein + moderate carbs (controlled).";
    if (goal === "bulk") return "Training-day: high protein + carbs slightly higher (fuel).";
    return "Training-day: high protein + don’t go too low-carb (strength).";
  } else {
    if (goal === "cut") return "Rest-day: high protein + lighter carbs/fats (easy deficit).";
    if (goal === "bulk") return "Rest-day: high protein + balanced (don’t under-eat).";
    return "Rest-day: high protein + lighter overall (not starving).";
  }
}

/**
 * ===== State =====
 * assigned[day] = { lunch: {kind:'meal', id} or {kind:'ramen'}, dinner: ... }
 */
function defaultState() {
  return {
    weightKg: "",
    heightCm: "",
    ageYears: "",
    sex: "male",
    activity: "1.375",
    daysPerWeek: 3,
    goal: "recomp",
    ramenCount: 1,
    ramenKcal: 500,
    ramenProtein: 12,
    completed: {}, // "Mon_lunch": true etc
    meals: [],     // {id,name,type,kcal,protein,source}
    assigned: {}   // see above
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const obj = JSON.parse(raw);
    return { ...defaultState(), ...obj };
  } catch {
    return defaultState();
  }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * ===== CSV Import =====
 * headers: name,type,kcal,protein
 */
function parseCsv(text) {
  const rows = [];
  let cur = "";
  let inQuotes = false;
  let row = [];

  const pushCell = () => {
    row.push(cur.trim().replace(/^"|"$/g, "").replaceAll('""', '"'));
    cur = "";
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === "") { row = []; return; }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && next === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }

    if (!inQuotes && ch === ",") { pushCell(); continue; }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      pushCell(); pushRow(); continue;
    }
    cur += ch;
  }
  pushCell(); pushRow();
  return rows;
}

function normalizeMealType(t) {
  const x = String(t || "").trim().toLowerCase();
  if (x === "training" || x === "train") return "training";
  if (x === "rest" || x === "recovery") return "rest";
  if (x === "either" || x === "any") return "either";
  return null;
}

function csvToMeals(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error("CSV has no data rows.");

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const idx = (name) => headers.indexOf(name);

  const iName = idx("name");
  const iType = idx("type");
  const iKcal = idx("kcal");
  const iProtein = idx("protein");
  if ([iName, iType, iKcal, iProtein].some(i => i === -1)) {
    throw new Error("Missing required headers. Need: name,type,kcal,protein");
  }

  const meals = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const name = (row[iName] ?? "").trim();
    const type = normalizeMealType(row[iType]);
    const kcal = Number(row[iKcal]);
    const protein = Number(row[iProtein]);

    if (!name) continue;
    if (!type) continue;
    if (!Number.isFinite(kcal) || kcal <= 0) continue;
    if (!Number.isFinite(protein) || protein < 0) continue;

    meals.push({ id: uid(), name, type, kcal: Math.round(kcal), protein: Math.round(protein), source: "csv" });
  }

  if (!meals.length) throw new Error("No valid meals parsed. Check your rows.");
  return meals;
}

/**
 * ===== Planning logic =====
 */
function dayIsTraining(template, day) {
  return Boolean(template[day]);
}

// Split daily target into lunch/dinner. Simple: 50/50.
// If you later want dinner heavier: set dinnerRatio=0.55.
function slotTargets(dailyKcal, dinnerRatio = 0.5) {
  const dinner = Math.round(dailyKcal * dinnerRatio);
  const lunch = dailyKcal - dinner;
  return { lunch, dinner };
}

function mealAllowedForType(meal, desired) {
  if (desired === "training") return meal.type === "training" || meal.type === "either";
  return meal.type === "rest" || meal.type === "either";
}

// Non-repeat picker: removes used meals when possible
function pickBestMealFromPool(pool, targetKcal, desiredType) {
  const candidates = pool.filter(m => mealAllowedForType(m, desiredType));
  if (!candidates.length) return null;

  let best = null;
  let bestScore = Infinity;

  for (const m of candidates) {
    const kcalDiff = Math.abs(m.kcal - targetKcal);
    const proteinPenalty = Math.max(0, 60 - m.protein);
    const score = kcalDiff + proteinPenalty * 3;
    if (score < bestScore) { bestScore = score; best = m; }
  }
  return best;
}

// Choose which dinners become ramen: we assign ramen to the last N rest-day dinners.
// (Simple & predictable. If you want smarter placement later, we can upgrade.)
function chooseRamenDays(template, ramenCount) {
  const restDays = DAYS.filter(d => !dayIsTraining(template, d));
  const dinners = restDays.map(d => ({ day: d, slot: "dinner" }));
  // take last N
  return new Set(dinners.slice(Math.max(0, dinners.length - ramenCount)).map(x => `${x.day}_${x.slot}`));
}

/**
 * ===== Rendering =====
 */
function renderTargets(state) {
  const w = Number(state.weightKg);
  const h = Number(state.heightCm);
  const a = Number(state.ageYears);
  const p = proteinTarget(w);

  const bmr = bmrMifflin(w, h, a, state.sex);
  const tdee = tdeeFromBmr(bmr, Number(state.activity));
  const base = applyGoal(tdee, state.goal);
  const split = base ? splitTrainingRest(base) : null;

  const el = $("targets");
  if (!bmr || !tdee || !base || !split) {
    el.textContent = "Fill in weight/height/age then Generate / Update.";
    return;
  }

  el.innerHTML = `
    <div class="kv"><strong>BMR (Mifflin):</strong> ${bmr} kcal/day</div>
    <div class="kv"><strong>TDEE (× activity):</strong> ${tdee} kcal/day</div>
    <div class="kv"><strong>Goal-adjusted base:</strong> ${base} kcal/day (${state.goal})</div>
    <div class="kv"><strong>Training-day target:</strong> ~ ${split.training} kcal</div>
    <div class="kv"><strong>Rest-day target:</strong> ~ ${split.rest} kcal</div>
    <div class="kv"><strong>Protein target:</strong> ~ ${p} g/day</div>
  `;
}

function renderMealList(state) {
  const el = $("mealList");
  if (!state.meals.length) {
    el.textContent = "No meals imported yet.";
    el.className = "muted";
    return;
  }

  const rows = state.meals
    .slice()
    .sort((a, b) => (b.protein - a.protein) || (a.kcal - b.kcal))
    .map(m => `
      <div class="day" style="margin-top:10px;">
        <h3 style="margin:0 0 6px;">${escapeHtml(m.name)}</h3>
        <span class="tag">${m.type}</span>
        <div class="kv"><strong>Calories:</strong> ${m.kcal} kcal</div>
        <div class="kv"><strong>Protein:</strong> ${m.protein} g</div>
        <div class="actions" style="margin-top:10px;">
          <button data-del="${m.id}" class="ghost">Delete</button>
        </div>
      </div>
    `).join("");

  el.className = "";
  el.innerHTML = rows;

  el.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      state.meals = state.meals.filter(m => m.id !== id);

      // remove assignment references
      for (const day of DAYS) {
        const a = state.assigned[day];
        if (!a) continue;
        for (const slot of MEALS_PER_DAY) {
          if (a[slot]?.kind === "meal" && a[slot].id === id) delete a[slot];
        }
      }

      saveState(state);
      render(state);
    });
  });
}

function assignmentText(state, slotAssign) {
  if (!slotAssign) return "<span class='muted'>None</span>";
  if (slotAssign.kind === "ramen") {
    return `Homemade ramen (${state.ramenKcal} kcal, ${state.ramenProtein}g protein)`;
  }
  const m = state.meals.find(x => x.id === slotAssign.id);
  if (!m) return "<span class='muted'>None</span>";
  return `${escapeHtml(m.name)} (${m.kcal} kcal, ${m.protein}g protein)`;
}

function renderPlan(state) {
  const template = buildWorkoutTemplate(state.daysPerWeek);
  const trainingDays = Object.keys(template);

  const w = Number(state.weightKg);
  const h = Number(state.heightCm);
  const a = Number(state.ageYears);

  const bmr = bmrMifflin(w, h, a, state.sex);
  const tdee = tdeeFromBmr(bmr, Number(state.activity));
  const base = applyGoal(tdee, state.goal);
  const split = base ? splitTrainingRest(base) : null;

  const summaryLines = [];
  summaryLines.push(`Training days: ${trainingDays.join(", ")}`);
  const p = proteinTarget(w);
  if (p) summaryLines.push(`Protein baseline: ~${p} g/day`);
  summaryLines.push(`Meals/day: 2 (lunch + dinner)`);
  $("summary").textContent = summaryLines.join(" · ");

  const planEl = $("plan");
  planEl.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "plan-grid";

  DAYS.forEach((d) => {
    const isTraining = Boolean(template[d]);
    const dailyTarget = split ? (isTraining ? split.training : split.rest) : null;
    const targets = dailyTarget ? slotTargets(dailyTarget, 0.5) : null;

    const dayCard = document.createElement("div");
    dayCard.className = "day";

    const title = document.createElement("h3");
    title.textContent = d + (isTraining ? " — Training" : " — Rest");
    dayCard.appendChild(title);

    const tag1 = document.createElement("span");
    tag1.className = "tag";
    tag1.textContent = isTraining ? "Workout" : "Recovery";
    dayCard.appendChild(tag1);

    const mealTargetText = document.createElement("p");
    mealTargetText.className = "kv";
    mealTargetText.innerHTML = dailyTarget
      ? `<strong>Daily target:</strong> ${dailyTarget} kcal · ${mealGuidanceText(isTraining, state.goal)}`
      : `<strong>Meal:</strong> ${mealGuidanceText(isTraining, state.goal)} (fill in setup for kcal targets)`;
    dayCard.appendChild(mealTargetText);

    // Lunch/Dinner display
    const assigned = state.assigned[d] || {};
    const lunchLine = document.createElement("p");
    lunchLine.className = "kv";
    lunchLine.innerHTML = `<strong>Lunch${targets ? ` (≈${targets.lunch} kcal)` : ""}:</strong> ${assignmentText(state, assigned.lunch)}`;
    dayCard.appendChild(lunchLine);

    const dinnerLine = document.createElement("p");
    dinnerLine.className = "kv";
    dinnerLine.innerHTML = `<strong>Dinner${targets ? ` (≈${targets.dinner} kcal)` : ""}:</strong> ${assignmentText(state, assigned.dinner)}`;
    dayCard.appendChild(dinnerLine);

    if (isTraining) {
      const ww = template[d];

      const wTitle = document.createElement("p");
      wTitle.className = "kv";
      wTitle.innerHTML = `<strong>Workout:</strong> ${ww.title}`;
      dayCard.appendChild(wTitle);

      const wDur = document.createElement("p");
      wDur.className = "kv";
      wDur.innerHTML = `<strong>Duration:</strong> ${ww.duration}`;
      dayCard.appendChild(wDur);

      const ul = document.createElement("ul");
      ww.moves.forEach(m => {
        const li = document.createElement("li");
        li.textContent = m;
        ul.appendChild(li);
      });
      dayCard.appendChild(ul);

      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = ww.note;
      dayCard.appendChild(note);
    } else {
      const rec = document.createElement("p");
      rec.className = "muted";
      rec.textContent = "Recovery idea: 20–40 min walk + light mobility (hips/shoulders).";
      dayCard.appendChild(rec);
    }

    // Done checkboxes (lunch + dinner)
    for (const slot of MEALS_PER_DAY) {
      const key = `${d}_${slot}`;
      const cbWrap = document.createElement("label");
      cbWrap.className = "checkbox";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = Boolean(state.completed[key]);
      cb.addEventListener("change", () => {
        state.completed[key] = cb.checked;
        saveState(state);
      });
      cbWrap.appendChild(cb);
      cbWrap.appendChild(document.createTextNode(`Done (${slot})`));
      dayCard.appendChild(cbWrap);
    }

    grid.appendChild(dayCard);
  });

  planEl.appendChild(grid);
}

function render(state) {
  $("weightKg").value = state.weightKg;
  $("heightCm").value = state.heightCm;
  $("ageYears").value = state.ageYears;
  $("sex").value = state.sex;
  $("activity").value = state.activity;
  $("daysPerWeek").value = String(state.daysPerWeek);
  $("goal").value = state.goal;

  $("ramenCount").value = state.ramenCount ?? 1;
  $("ramenKcal").value = state.ramenKcal ?? 500;
  $("ramenProtein").value = state.ramenProtein ?? 12;

  renderTargets(state);
  renderMealList(state);
  renderPlan(state);
}

/**
 * ===== Main =====
 */
function main() {
  const state = loadState();
  render(state);

  $("generateBtn").addEventListener("click", () => {
    state.weightKg = $("weightKg").value;
    state.heightCm = $("heightCm").value;
    state.ageYears = $("ageYears").value;
    state.sex = $("sex").value;
    state.activity = $("activity").value;
    state.daysPerWeek = Number($("daysPerWeek").value);
    state.goal = $("goal").value;

    // ramen settings
    state.ramenCount = Number($("ramenCount").value || 0);
    state.ramenKcal = Number($("ramenKcal").value || 0);
    state.ramenProtein = Number($("ramenProtein").value || 0);

    saveState(state);
    render(state);
  });

  $("resetBtn").addEventListener("click", () => {
    const s = defaultState();
    saveState(s);
    render(s);
  });

  $("clearMealsBtn").addEventListener("click", () => {
    if (!confirm("Clear all meals?")) return;
    state.meals = [];
    state.assigned = {};
    saveState(state);
    render(state);
  });

  $("importCsvBtn").addEventListener("click", async () => {
    const fileInput = $("csvFile");
    const mode = $("importMode").value;
    const file = fileInput.files && fileInput.files[0];
    if (!file) return alert("Please choose a CSV file first.");

    const text = await file.text();
    try {
      const newMeals = csvToMeals(text);
      if (mode === "replace") {
        state.meals = newMeals;
        state.assigned = {};
        state.completed = {};
      } else {
        state.meals = state.meals.concat(newMeals);
      }
      saveState(state);
      render(state);
      fileInput.value = "";
      alert(`Imported ${newMeals.length} meals.`);
    } catch (e) {
      alert(`CSV import failed: ${e.message}`);
    }
  });

  $("autoAssignBtn").addEventListener("click", () => {
    const w = Number(state.weightKg);
    const h = Number(state.heightCm);
    const a = Number(state.ageYears);
    if (!w || !h || !a) return alert("Fill in weight/height/age first, then Generate / Update.");
    if (!state.meals.length) return alert("Import your meal pool CSV first.");

    const bmr = bmrMifflin(w, h, a, state.sex);
    const tdee = tdeeFromBmr(bmr, Number(state.activity));
    const base = applyGoal(tdee, state.goal);
    const split = splitTrainingRest(base);

    const template = buildWorkoutTemplate(state.daysPerWeek);

    // --- no-repeat pool ---
    let pool = state.meals.slice(); // we remove as we assign
    state.assigned = {}; // reset assignments for a clean plan

    // Decide which slots will be ramen
    const ramenCount = Math.max(0, Math.min(7, Number(state.ramenCount || 0)));
    const ramenSlots = chooseRamenDays(template, ramenCount);

    for (const day of DAYS) {
      const isTraining = dayIsTraining(template, day);
      const dailyTarget = isTraining ? split.training : split.rest;
      const slotKcal = slotTargets(dailyTarget, 0.5);

      state.assigned[day] = {};

      for (const slot of MEALS_PER_DAY) {
        const slotKey = `${day}_${slot}`;

        // place ramen
        if (ramenSlots.has(slotKey)) {
          state.assigned[day][slot] = { kind: "ramen" };
          continue;
        }

        const desiredType = isTraining ? "training" : "rest";
        const target = slot === "lunch" ? slotKcal.lunch : slotKcal.dinner;

        // try no-repeat first
        let best = pickBestMealFromPool(pool, target, desiredType);

        // if not possible (e.g., not enough meals), allow reuse from full list
        if (!best) {
          best = pickBestMealFromPool(state.meals, target, desiredType);
        }

        if (best) {
          state.assigned[day][slot] = { kind: "meal", id: best.id };
          // remove from pool to enforce no-repeat (only if it came from pool)
          pool = pool.filter(m => m.id !== best.id);
        }
      }
    }

    saveState(state);
    render(state);
  });

  $("clearAssignmentsBtn").addEventListener("click", () => {
    state.assigned = {};
    saveState(state);
    render(state);
  });
}

main();
