const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "fit_plan_v1";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// 3-day template: Full body A / B / C
// 4-day template: Upper / Lower / Upper / Lower (simple split)
function buildWorkoutTemplate(daysPerWeek) {
  if (daysPerWeek === 3) {
    return {
      Mon: workoutFullA(),
      Wed: workoutFullB(),
      Fri: workoutFullC()
    };
  }
  return {
    Mon: workoutUpperA(),
    Tue: workoutLowerA(),
    Thu: workoutUpperB(),
    Sat: workoutLowerB()
  };
}

// Meal guidance rules (simple, not exact calories)
function mealGuidance(isTrainingDay, goal) {
  if (isTrainingDay) {
    if (goal === "cut") return "Training-day meal: high protein + moderate carbs (keep it controlled).";
    if (goal === "bulk") return "Training-day meal: high protein + carbs a bit higher (fuel performance).";
    return "Training-day meal: high protein + don’t go too low-carb (better strength).";
  } else {
    if (goal === "cut") return "Rest-day meal: high protein + lighter carbs/fats (easy deficit).";
    if (goal === "bulk") return "Rest-day meal: high protein + balanced (don’t skip calories).";
    return "Rest-day meal: high protein + lighter overall (but not starving).";
  }
}

function proteinTarget(weightKg) {
  if (!weightKg || weightKg <= 0) return null;
  return Math.round(weightKg * 1.6);
}

function workoutFullA() {
  return {
    title: "Full Body A (Push + Legs + Core)",
    duration: "35–50 min",
    moves: [
      "Squat (bodyweight / backpack / dumbbell) — 3–4 x 8–15",
      "Push-up (incline/knee/standard) — 3–4 x 6–15",
      "RDL (dumbbell/backpack) — 3–4 x 8–15",
      "Side plank — 2–3 x 30–60s"
    ],
    note: "Keep 1–2 reps in reserve (RIR 1–2). If too easy, add weight or slow the eccentric."
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
    note: "Pull work matters at home—rows + band face pulls are your best friends."
  };
}
function workoutFullC() {
  return {
    title: "Full Body C (Glutes + Push/Pull + Core)",
    duration: "35–50 min",
    moves: [
      "Hip thrust / Glute bridge (add load if possible) — 3–4 x 10–20",
      "Push-up variation — 3–4 x 8–15",
      "Band face pull / Reverse fly — 3 x 12–20",
      "Plank — 2–3 x 30–60s"
    ],
    note: "If you get dumbbells later, add a hinge or a lunge here."
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
    note: "Alternate push and pull to save time: push-up → row → push-up → row…"
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
    note: "Arms are optional—do them if you enjoy it and will stick to it."
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
    note: "Hinge days protect your back and make your posture feel better."
  };
}

function defaultState() {
  return {
    weightKg: "",
    daysPerWeek: 3,
    goal: "recomp",
    completed: {} // key: "Mon"..."Sun"
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

function render(state) {
  $("weightKg").value = state.weightKg;
  $("daysPerWeek").value = String(state.daysPerWeek);
  $("goal").value = state.goal;

  const p = proteinTarget(Number(state.weightKg));
  const template = buildWorkoutTemplate(state.daysPerWeek);

  const trainingDays = Object.keys(template);
  const summaryLines = [];
  summaryLines.push(`Training days: ${trainingDays.join(", ")}`);
  if (p) summaryLines.push(`Protein target (baseline): ~ ${p} g/day`);

  $("summary").textContent = summaryLines.join(" · ");

  const planEl = $("plan");
  planEl.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "plan-grid";

  DAYS.forEach((d) => {
    const isTraining = Boolean(template[d]);
    const dayCard = document.createElement("div");
    dayCard.className = "day";

    const title = document.createElement("h3");
    title.textContent = d + (isTraining ? " — Training" : " — Rest");
    dayCard.appendChild(title);

    const tag1 = document.createElement("span");
    tag1.className = "tag";
    tag1.textContent = isTraining ? "Workout" : "Recovery";
    dayCard.appendChild(tag1);

    const tag2 = document.createElement("span");
    tag2.className = "tag";
    tag2.textContent = isTraining ? "Training-day meal" : "Rest-day meal";
    dayCard.appendChild(tag2);

    const meal = document.createElement("p");
    meal.className = "kv";
    meal.innerHTML = `<strong>Meal:</strong> ${mealGuidance(isTraining, state.goal)}`;
    dayCard.appendChild(meal);

    if (isTraining) {
      const w = template[d];

      const wTitle = document.createElement("p");
      wTitle.className = "kv";
      wTitle.innerHTML = `<strong>Workout:</strong> ${w.title}`;
      dayCard.appendChild(wTitle);

      const wDur = document.createElement("p");
      wDur.className = "kv";
      wDur.innerHTML = `<strong>Duration:</strong> ${w.duration}`;
      dayCard.appendChild(wDur);

      const ul = document.createElement("ul");
      w.moves.forEach(m => {
        const li = document.createElement("li");
        li.textContent = m;
        ul.appendChild(li);
      });
      dayCard.appendChild(ul);

      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = w.note;
      dayCard.appendChild(note);
    } else {
      const rec = document.createElement("p");
      rec.className = "muted";
      rec.textContent = "Recovery idea: 20–40 min walk + light mobility (hips/shoulders).";
      dayCard.appendChild(rec);
    }

    const cbWrap = document.createElement("label");
    cbWrap.className = "checkbox";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(state.completed[d]);
    cb.addEventListener("change", () => {
      state.completed[d] = cb.checked;
      saveState(state);
    });
    cbWrap.appendChild(cb);
    cbWrap.appendChild(document.createTextNode("Done"));
    dayCard.appendChild(cbWrap);

    grid.appendChild(dayCard);
  });

  planEl.appendChild(grid);
}

function main() {
  const state = loadState();
  render(state);

  $("generateBtn").addEventListener("click", () => {
    state.weightKg = $("weightKg").value;
    state.daysPerWeek = Number($("daysPerWeek").value);
    state.goal = $("goal").value;
    // Keep completed ticks
    saveState(state);
    render(state);
  });

  $("resetBtn").addEventListener("click", () => {
    const s = defaultState();
    saveState(s);
    render(s);
  });
}

main();
