const STORAGE_KEY = "chore-quest-state";
const PARENT_SESSION_KEY = "chore-quest-parent-unlocked";
const PARENT_PIN = "4826";
const STATE_VERSION = 2;

const profiles = [
  { id: "miles", name: "Miles", age: 13, role: "Oldest adventurer" },
  { id: "logan", name: "Logan", age: 10, role: "Middle mission runner" },
  { id: "zoe", name: "Zoe", age: 7, role: "Youngest quest star" },
];

const profileMap = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

const baseTasks = [
  {
    id: crypto.randomUUID(),
    title: "Make the bed",
    reward: 4,
    difficulty: "Easy",
    completed: false,
    scope: "shared",
    assigneeId: null,
    completedById: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Wash the dishes",
    reward: 9,
    difficulty: "Medium",
    completed: false,
    scope: "assigned",
    assigneeId: "logan",
    completedById: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Laundry round",
    reward: 14,
    difficulty: "Boss",
    completed: false,
    scope: "assigned",
    assigneeId: "miles",
    completedById: null,
  },
];

const difficultyXp = {
  Easy: 20,
  Medium: 35,
  Boss: 55,
};

const rankTitles = [
  "Rookie Spark",
  "Momentum Maker",
  "Household Ranger",
  "Quest Captain",
  "Legend of the Living Room",
];

const state = loadState();
const ui = {
  activeDashboard: profiles[0].id,
};
const parentAccess = {
  unlocked: sessionStorage.getItem(PARENT_SESSION_KEY) === "true",
  pendingDashboard: null,
};

const els = {
  form: document.getElementById("task-form"),
  taskInput: document.getElementById("task-input"),
  rewardInput: document.getElementById("reward-input"),
  difficultyInput: document.getElementById("difficulty-input"),
  scopeInput: document.getElementById("scope-input"),
  assigneeInput: document.getElementById("assignee-input"),
  assigneeLabel: document.getElementById("assignee-label"),
  taskList: document.getElementById("task-list"),
  openCount: document.getElementById("open-count"),
  completedCount: document.getElementById("completed-count"),
  potentialValue: document.getElementById("potential-value"),
  earningsValue: document.getElementById("earnings-value"),
  xpValue: document.getElementById("xp-value"),
  levelValue: document.getElementById("level-value"),
  comboValue: document.getElementById("combo-value"),
  progressFill: document.getElementById("progress-fill"),
  progressPercent: document.getElementById("progress-percent"),
  statusNote: document.getElementById("status-note"),
  taskTemplate: document.getElementById("task-template"),
  profileCardTemplate: document.getElementById("profile-card-template"),
  dashboardSwitcher: document.getElementById("dashboard-switcher"),
  profileGrid: document.getElementById("profile-grid"),
  heroTitle: document.getElementById("hero-title"),
  heroText: document.getElementById("hero-text"),
  snapshotLabel: document.getElementById("snapshot-label"),
  scoreOneLabel: document.getElementById("score-one-label"),
  scoreTwoLabel: document.getElementById("score-two-label"),
  scoreThreeLabel: document.getElementById("score-three-label"),
  scoreFourLabel: document.getElementById("score-four-label"),
  progressCopy: document.getElementById("progress-copy"),
  boardEyebrow: document.getElementById("board-eyebrow"),
  boardTitle: document.getElementById("board-title"),
  sideEyebrow: document.getElementById("side-eyebrow"),
  sideTitle: document.getElementById("side-title"),
  profileGridLabel: document.getElementById("profile-grid-label"),
  nextTipLabel: document.getElementById("next-tip-label"),
  nextTip: document.getElementById("next-tip"),
  ledgerTitle: document.getElementById("ledger-title"),
  ledgerList: document.getElementById("ledger-list"),
  accessBanner: document.getElementById("access-banner"),
  focusForm: document.getElementById("focus-form"),
  clearCompleted: document.getElementById("clear-completed"),
  lockParent: document.getElementById("lock-parent"),
  formTitle: document.getElementById("form-title"),
  parentBoard: document.getElementById("parent-board"),
  todayLabel: document.getElementById("today-label"),
  summaryOneLabel: document.getElementById("summary-one-label"),
  summaryTwoLabel: document.getElementById("summary-two-label"),
  summaryThreeLabel: document.getElementById("summary-three-label"),
  pinModal: document.getElementById("pin-modal"),
  pinForm: document.getElementById("pin-form"),
  pinInput: document.getElementById("pin-input"),
  pinError: document.getElementById("pin-error"),
  pinCopy: document.getElementById("pin-copy"),
  pinCancel: document.getElementById("pin-cancel"),
};

els.todayLabel.textContent = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date());

els.scopeInput.addEventListener("change", updateAssignmentVisibility);

els.form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!isParentDashboard()) {
    requestParentAccess("Enter the parent PIN to open the admin dashboard.");
    return;
  }

  const title = els.taskInput.value.trim();
  const reward = Number(els.rewardInput.value);
  const difficulty = els.difficultyInput.value;
  const scope = els.scopeInput.value;
  const assigneeId = scope === "assigned" ? els.assigneeInput.value : null;

  if (!title || !Number.isFinite(reward) || reward <= 0) {
    return;
  }

  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    reward,
    difficulty,
    completed: false,
    scope,
    assigneeId,
    completedById: null,
  });

  saveState();
  render();
  els.form.reset();
  els.rewardInput.value = "8";
  els.difficultyInput.value = "Medium";
  els.scopeInput.value = "shared";
  updateAssignmentVisibility();
  els.taskInput.focus();
});

els.focusForm.addEventListener("click", () => {
  if (isParentDashboard()) {
    focusTaskForm();
    return;
  }

  requestParentAccess("Enter the parent PIN to open the admin dashboard.", "parent");
});

els.lockParent.addEventListener("click", () => {
  lockParentAccess();
});

els.clearCompleted.addEventListener("click", () => {
  if (!isParentDashboard()) {
    requestParentAccess("Enter the parent PIN to open the admin dashboard.", "parent");
    return;
  }

  clearCompletedTasks();
});

els.pinForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (els.pinInput.value === PARENT_PIN) {
    unlockParentAccess();

    if (parentAccess.pendingDashboard) {
      ui.activeDashboard = parentAccess.pendingDashboard;
      parentAccess.pendingDashboard = null;
    } else {
      ui.activeDashboard = "parent";
    }

    closePinModal();
    render();
    return;
  }

  els.pinError.textContent = "That PIN does not match. Try again.";
  els.pinInput.select();
});

els.pinCancel.addEventListener("click", () => {
  parentAccess.pendingDashboard = null;
  closePinModal();
});

els.pinModal.addEventListener("cancel", () => {
  parentAccess.pendingDashboard = null;
});

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return createFreshState();
  }

  try {
    const parsed = JSON.parse(saved);
    return migrateState(parsed);
  } catch {
    return createFreshState();
  }
}

function createFreshState() {
  return {
    version: STATE_VERSION,
    profiles,
    tasks: baseTasks,
    history: [],
  };
}

function migrateState(parsed) {
  const rawTasks = Array.isArray(parsed.tasks) && parsed.tasks.length ? parsed.tasks : baseTasks;
  const rawHistory = Array.isArray(parsed.history) ? parsed.history : [];

  return {
    version: STATE_VERSION,
    profiles,
    tasks: rawTasks.map((task) => ({
      id: task.id || crypto.randomUUID(),
      title: task.title || "Untitled quest",
      reward: Number.isFinite(Number(task.reward)) ? Number(task.reward) : 0,
      difficulty: difficultyXp[task.difficulty] ? task.difficulty : "Medium",
      completed: Boolean(task.completed),
      scope: task.scope === "assigned" ? "assigned" : "shared",
      assigneeId: profileMap[task.assigneeId] ? task.assigneeId : null,
      completedById: profileMap[task.completedById] ? task.completedById : null,
    })),
    history: rawHistory.map((entry) => ({
      id: entry.id || crypto.randomUUID(),
      taskId: entry.taskId || null,
      title: entry.title || "Legacy quest",
      reward: Number.isFinite(Number(entry.reward)) ? Number(entry.reward) : 0,
      profileId: profileMap[entry.profileId] ? entry.profileId : null,
      profileName: profileMap[entry.profileId]?.name || entry.profileName || "Family quest",
      timestamp: Number.isFinite(Number(entry.timestamp)) ? Number(entry.timestamp) : Date.now(),
    })),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function focusTaskForm() {
  els.taskInput.focus();
  els.taskInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function updateAssignmentVisibility() {
  const assigned = els.scopeInput.value === "assigned";
  els.assigneeLabel.classList.toggle("is-hidden", !assigned);
  els.assigneeInput.disabled = !assigned || !isParentDashboard();
}

function unlockParentAccess() {
  parentAccess.unlocked = true;
  sessionStorage.setItem(PARENT_SESSION_KEY, "true");
}

function lockParentAccess() {
  parentAccess.unlocked = false;
  parentAccess.pendingDashboard = null;
  sessionStorage.removeItem(PARENT_SESSION_KEY);

  if (ui.activeDashboard === "parent") {
    ui.activeDashboard = profiles[0].id;
  }

  render();
}

function requestParentAccess(message, dashboard = "parent") {
  parentAccess.pendingDashboard = dashboard;
  els.pinCopy.textContent = message;
  els.pinError.textContent = "";

  if (!els.pinModal.open) {
    els.pinModal.showModal();
  }

  els.pinInput.value = "";
  els.pinInput.focus();
}

function closePinModal() {
  if (els.pinModal.open) {
    els.pinModal.close();
  }
}

function isParentDashboard() {
  return ui.activeDashboard === "parent" && parentAccess.unlocked;
}

function getTaskCreditProfileId(task, creditOverride) {
  if (task.scope === "assigned" && profileMap[task.assigneeId]) {
    return task.assigneeId;
  }

  return profileMap[creditOverride] ? creditOverride : profiles[0].id;
}

function completeTask(id, creditOverride) {
  const task = state.tasks.find((item) => item.id === id);

  if (!task) {
    return;
  }

  if (task.completed) {
    task.completed = false;
    task.completedById = null;
    state.history = state.history.filter((entry) => entry.taskId !== task.id);
    saveState();
    render();
    return;
  }

  const creditedProfileId = getTaskCreditProfileId(task, creditOverride);
  const creditedProfile = profileMap[creditedProfileId];

  task.completed = true;
  task.completedById = creditedProfileId;
  state.history.unshift({
    id: crypto.randomUUID(),
    taskId: task.id,
    title: task.title,
    reward: task.reward,
    profileId: creditedProfileId,
    profileName: creditedProfile.name,
    timestamp: Date.now(),
  });
  state.history = state.history.slice(0, 12);
  saveState();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  state.history = state.history.filter((entry) => entry.taskId !== id);
  saveState();
  render();
}

function clearCompletedTasks() {
  state.tasks = state.tasks.filter((task) => !task.completed);
  state.history = state.history.filter((entry) => state.tasks.some((task) => task.id === entry.taskId) || entry.taskId === null);
  saveState();
  render();
}

function getVisibleTasks(profileId) {
  if (profileId === "parent") {
    return state.tasks;
  }

  return state.tasks.filter((task) => task.scope === "shared" || task.assigneeId === profileId);
}

function getProfileMetrics(profileId) {
  const visibleTasks = getVisibleTasks(profileId);
  const completedTasks = visibleTasks.filter((task) => task.completed);
  const openTasks = visibleTasks.filter((task) => !task.completed);
  const historyEntries = profileId === "parent"
    ? state.history
    : state.history.filter((entry) => entry.profileId === profileId);

  const creditedCompletedTasks = profileId === "parent"
    ? state.tasks.filter((task) => task.completed)
    : state.tasks.filter((task) => task.completedById === profileId);

  const earnings = historyEntries.reduce((sum, entry) => sum + entry.reward, 0);
  const totalXp = creditedCompletedTasks.reduce((sum, task) => sum + difficultyXp[task.difficulty], 0);
  const level = Math.max(1, Math.floor(totalXp / 100) + 1);
  const currentXp = totalXp % 100;
  const combo = Math.max(1, creditedCompletedTasks.length || 1);
  const potential = openTasks.reduce((sum, task) => sum + task.reward, 0);

  return {
    visibleTasks,
    completedTasks,
    openTasks,
    historyEntries,
    earnings,
    totalXp,
    level,
    currentXp,
    combo,
    potential,
  };
}

function getDashboardConfig() {
  if (ui.activeDashboard === "parent") {
    return {
      id: "parent",
      name: "Parent",
      eyebrow: "Parent Dashboard",
      heroTitle: parentAccess.unlocked
        ? "Parent command is live. Assign chores, check them off, and keep all three boards in sync."
        : "The Parent dashboard is visible from the main screen, but it only opens with the family PIN.",
      heroText: parentAccess.unlocked
        ? "Use the admin board to hand out shared chores, assign kid-specific quests, and record who earned each reward."
        : "Miles, Logan, and Zoe can visit their own dashboards any time. Parent tools stay locked until the PIN is entered correctly.",
      boardTitle: parentAccess.unlocked ? "Family control board" : "Parent dashboard preview",
      sideTitle: parentAccess.unlocked ? "Kid snapshots and recent payouts" : "Kid snapshots stay visible while parent tools stay locked",
      nextTip: parentAccess.unlocked
        ? "Assign one quick win and one bigger task so every board feels active."
        : "Tap the Parent card and enter the family PIN to open admin controls.",
    };
  }

  const profile = profileMap[ui.activeDashboard];
  const metrics = getProfileMetrics(profile.id);

  return {
    id: profile.id,
    name: profile.name,
    eyebrow: `${profile.name}'s Dashboard`,
    heroTitle: `${profile.name}'s board keeps shared quests and personal jobs in one calm view.`,
    heroText: `${profile.name} can see assigned chores, shared family quests, rewards earned, and recent wins. Editing stays in the parent dashboard only.`,
    boardTitle: `${profile.name}'s quest board`,
    sideTitle: `${profile.name}'s wins and the rest of the squad`,
    nextTip: metrics.openTasks.length
      ? `Shared quests are fair game, and ${profile.name}'s assigned chores wait right here.`
      : `${profile.name} cleared every visible quest. Time for a fresh one from the parent board.`,
  };
}

function getStatusMessage(metrics) {
  if (ui.activeDashboard === "parent") {
    if (!parentAccess.unlocked) {
      return "Parent entry is visible, but the family PIN is still required to open the admin tools.";
    }

    if (metrics.completedTasks.length === 0) {
      return "No chores are checked off yet. Pick a child board, then come back here to log the first win.";
    }

    if (metrics.openTasks.length === 0) {
      return "Every chore on the board is complete. Add a fresh batch for the next round.";
    }

    return "Three dashboards, one family board. Use this view to assign the next best win.";
  }

  if (metrics.completedTasks.length === 0) {
    return "No wins logged yet on this dashboard. Shared chores and assigned quests will show up here together.";
  }

  if (metrics.openTasks.length === 0) {
    return "This dashboard is clear. A parent can add a fresh quest from the admin board.";
  }

  return "Kid dashboards are read-only, so this board stays simple and easy to scan.";
}

function getTaskScopeLabel(task) {
  if (task.scope === "shared") {
    return "Shared quest";
  }

  return `Assigned to ${profileMap[task.assigneeId]?.name || "a kid"}`;
}

function renderDashboardSwitcher() {
  els.dashboardSwitcher.innerHTML = "";

  const dashboardItems = [
    { id: "parent", name: "Parent", age: "PIN", role: "Admin control board" },
    ...profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      age: profile.age,
      role: profile.role,
    })),
  ];

  dashboardItems.forEach((dashboard) => {
    const fragment = els.profileCardTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".profile-card");
    const age = fragment.querySelector(".profile-age");
    const name = fragment.querySelector(".profile-name");
    const role = fragment.querySelector(".profile-role");

    age.textContent = dashboard.id === "parent" ? "PIN protected" : `${dashboard.age} years old`;
    name.textContent = dashboard.name;
    role.textContent = dashboard.role;

    button.classList.toggle("active", ui.activeDashboard === dashboard.id);
    button.classList.toggle("parent-card", dashboard.id === "parent");

    button.addEventListener("click", () => {
      if (dashboard.id === "parent") {
        if (parentAccess.unlocked) {
          ui.activeDashboard = "parent";
          render();
          return;
        }

        requestParentAccess("Enter the parent PIN to open the Parent dashboard.", "parent");
        return;
      }

      ui.activeDashboard = dashboard.id;
      render();
    });

    els.dashboardSwitcher.append(fragment);
  });
}

function renderProfileGrid() {
  els.profileGrid.innerHTML = "";

  profiles.forEach((profile) => {
    const metrics = getProfileMetrics(profile.id);
    const card = document.createElement("article");
    card.className = "kid-summary-card";

    const name = document.createElement("strong");
    name.textContent = profile.name;

    const subtitle = document.createElement("span");
    subtitle.textContent = `${metrics.openTasks.length} open - $${metrics.earnings} earned`;

    const detail = document.createElement("span");
    detail.textContent = `${metrics.completedTasks.length} done - lvl ${metrics.level}`;

    card.append(name, subtitle, detail);
    els.profileGrid.append(card);
  });
}

function renderLedger(historyEntries) {
  els.ledgerList.innerHTML = "";

  if (!historyEntries.length) {
    const empty = document.createElement("p");
    empty.className = "ledger-empty";
    empty.textContent = "Completed chores will stack here once the family starts clearing quests.";
    els.ledgerList.append(empty);
    return;
  }

  historyEntries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "ledger-item";

    const label = document.createElement("span");
    label.textContent = `${entry.profileName}: ${entry.title}`;

    const amount = document.createElement("strong");
    amount.textContent = `+$${entry.reward}`;

    row.append(label, amount);
    els.ledgerList.append(row);
  });
}

function renderTasks(metrics) {
  els.taskList.innerHTML = "";

  if (!metrics.visibleTasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = isParentDashboard()
      ? "The family board is empty. Add a shared quest or assign a kid-specific mission."
      : "No chores are showing on this dashboard yet. A parent can add new quests from the Parent board.";
    els.taskList.append(empty);
    return;
  }

  metrics.visibleTasks.forEach((task) => {
    const fragment = els.taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".task-card");
    const toggleButton = fragment.querySelector(".task-toggle");
    const title = fragment.querySelector(".task-title");
    const reward = fragment.querySelector(".task-reward");
    const difficulty = fragment.querySelector(".difficulty-pill");
    const scope = fragment.querySelector(".scope-pill");
    const credit = fragment.querySelector(".credit-pill");
    const xp = fragment.querySelector(".xp-pill");
    const deleteButton = fragment.querySelector(".delete-button");
    const creditRow = fragment.querySelector(".task-credit-row");
    const creditSelect = fragment.querySelector(".credit-select");

    title.textContent = task.title;
    reward.textContent = `$${task.reward}`;
    difficulty.textContent = task.difficulty;
    scope.textContent = getTaskScopeLabel(task);
    xp.textContent = `+${difficultyXp[task.difficulty]} XP`;

    if (task.completed) {
      item.classList.add("completed");
      credit.textContent = `Credited to ${profileMap[task.completedById]?.name || "Family"}`;
    } else if (task.scope === "assigned") {
      credit.textContent = `Credit locked to ${profileMap[task.assigneeId]?.name || "Kid"}`;
    } else {
      credit.textContent = "Shared quests can be credited by parent";
    }

    const parentMode = isParentDashboard();
    toggleButton.hidden = !parentMode;
    deleteButton.hidden = !parentMode;
    creditRow.hidden = !parentMode || task.scope !== "shared" || task.completed;

    if (task.scope === "shared" && task.completedById) {
      creditSelect.value = task.completedById;
    } else if (task.scope === "assigned" && task.assigneeId) {
      creditSelect.value = task.assigneeId;
    } else {
      creditSelect.value = profiles[0].id;
    }

    if (parentMode) {
      toggleButton.addEventListener("click", () => {
        completeTask(task.id, creditSelect.value);
      });

      deleteButton.addEventListener("click", () => {
        deleteTask(task.id);
      });
    }

    els.taskList.append(fragment);
  });
}

function renderParentBoard() {
  const parentMode = isParentDashboard();
  const submitButton = els.form.querySelector('button[type="submit"]');
  const formControls = [
    els.taskInput,
    els.rewardInput,
    els.difficultyInput,
    els.scopeInput,
    els.assigneeInput,
    submitButton,
  ];

  formControls.forEach((control) => {
    control.disabled = !parentMode;
  });

  els.form.hidden = !parentMode;
  els.parentBoard.classList.toggle("board-locked", !parentMode);
  els.lockParent.hidden = !parentAccess.unlocked;
  els.clearCompleted.hidden = !parentMode;
  els.focusForm.textContent = parentMode ? "Jump to add form" : "Open parent controls";
  els.formTitle.textContent = parentMode
    ? "Assign shared chores or kid-specific quests"
    : "Admin tools stay hidden until the family PIN is entered";
  els.accessBanner.textContent = parentMode
    ? "Parent dashboard unlocked. You can assign chores, credit completions, remove quests, and clean up the board."
    : "The Parent dashboard is visible from the main screen, but the PIN is required before any admin tools appear.";
  els.accessBanner.classList.toggle("unlocked", parentMode);
}

function render() {
  const dashboardId = ui.activeDashboard === "parent" ? "parent" : ui.activeDashboard;
  const config = getDashboardConfig();
  const metrics = getProfileMetrics(dashboardId);
  const progressPercent = Math.round(metrics.currentXp);

  renderDashboardSwitcher();
  renderProfileGrid();
  renderParentBoard();
  renderTasks(metrics);
  renderLedger(metrics.historyEntries);
  updateAssignmentVisibility();

  els.heroTitle.textContent = config.heroTitle;
  els.heroText.textContent = config.heroText;
  els.snapshotLabel.textContent = config.id === "parent" ? "Family Snapshot" : `${config.name}'s Snapshot`;
  els.boardEyebrow.textContent = config.eyebrow;
  els.boardTitle.textContent = config.boardTitle;
  els.sideEyebrow.textContent = config.id === "parent" ? "Family Pulse" : `${config.name}'s Corner`;
  els.sideTitle.textContent = config.sideTitle;
  els.profileGridLabel.textContent = config.id === "parent" ? "Kid dashboard cards" : "The full squad";
  els.nextTipLabel.textContent = config.id === "parent" ? "Best move right now" : `${config.name}'s reminder`;
  els.nextTip.textContent = config.nextTip;
  els.ledgerTitle.textContent = config.id === "parent" ? "Family reward ledger" : `${config.name}'s reward ledger`;
  els.statusNote.textContent = getStatusMessage(metrics);
  els.scoreOneLabel.textContent = "Level";
  els.scoreTwoLabel.textContent = "XP";
  els.scoreThreeLabel.textContent = "Earnings";
  els.scoreFourLabel.textContent = config.id === "parent" ? "Family wins" : "Combo";
  els.progressCopy.textContent = config.id === "parent" ? "Family XP momentum" : "Progress to next level";
  els.summaryOneLabel.textContent = "Open quests";
  els.summaryTwoLabel.textContent = "Completed";
  els.summaryThreeLabel.textContent = "Potential rewards";

  els.levelValue.textContent = String(metrics.level);
  els.xpValue.textContent = `${metrics.currentXp} / 100`;
  els.earningsValue.textContent = `$${metrics.earnings}`;
  els.comboValue.textContent = config.id === "parent" ? String(metrics.completedTasks.length) : `x${metrics.combo}`;
  els.progressFill.style.width = `${progressPercent}%`;
  els.progressPercent.textContent = `${progressPercent}%`;
  els.openCount.textContent = String(metrics.openTasks.length);
  els.completedCount.textContent = String(metrics.completedTasks.length);
  els.potentialValue.textContent = `$${metrics.potential}`;
}

render();

