// Minimal Mindra front-end app
// - Contains sample course data (courses)
// - Client-side mock auth using localStorage (mindra_user)
// - Progress tracking in localStorage (mindra_progress)
// - Render logic for course list, course view, quizzes
// - Simple content editor for prototyping (admin modal)

const state = {
  user: null,
  courses: [], // populated below
  currentCourse: null,
  currentModuleIndex: 0,
};

// --- Sample data (replace with fetch from API) ---
state.courses = [
  {
    id: "course-html-basics",
    title: "HTML & Semantic Markup",
    summary: "Learn the basics of HTML markup and build accessible pages.",
    level: "Beginner",
    modules: [
      {
        id: "html-intro",
        title: "Introduction to HTML",
        content: `<p>HTML (HyperText Markup Language) is the foundation of web pages. Learn tags like &lt;h1&gt;, &lt;p&gt;, &lt;a&gt;, and semantic elements.</p>`,
        media: { images: [], video: "" },
        quiz: [
          {
            q: "Which tag defines a paragraph?",
            options: ["<p>", "<div>", "<span>", "<section>"],
            answerIndex: 0,
          },
        ],
      },
      {
        id: "html-forms",
        title: "Forms & Inputs",
        content: `<p>Forms collect user input. We'll cover inputs, labels, and accessibility basics.</p>`,
        quiz: [
          {
            q: "Which attribute links a label to an input?",
            options: ["for", "id", "name", "type"],
            answerIndex: 0,
          },
        ],
      },
    ],
  },
  {
    id: "course-js-practical",
    title: "Practical JavaScript",
    summary: "Small practical exercises to learn DOM, events, and state.",
    level: "Intermediate",
    modules: [
      {
        id: "js-dom",
        title: "DOM Manipulation",
        content: `<p>Interact with the page using the Document Object Model (DOM).</p>`,
        quiz: [
          {
            q: "Which method selects an element by CSS selector?",
            options: ["getElementById()", "querySelector()", "getElementsByClassName()", "createElement()"],
            answerIndex: 1,
          },
        ],
      },
    ],
  },
];

// --- Utilities ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function saveUser(user) {
  state.user = user;
  if (user) localStorage.setItem("mindra_user", JSON.stringify(user));
  else localStorage.removeItem("mindra_user");
}

function loadUser() {
  const raw = localStorage.getItem("mindra_user");
  if (raw) {
    try { state.user = JSON.parse(raw); } catch (e) { state.user = null; }
  }
}

function getProgressStore() {
  const raw = localStorage.getItem("mindra_progress") || "{}";
  try { return JSON.parse(raw); } catch (e) { return {}; }
}
function saveProgressStore(store) {
  localStorage.setItem("mindra_progress", JSON.stringify(store));
}
function getUserProgress() {
  const store = getProgressStore();
  return (state.user && store[state.user.email]) ? store[state.user.email] : {};
}
function setUserProgress(progress) {
  if (!state.user) return;
  const store = getProgressStore();
  store[state.user.email] = progress;
  saveProgressStore(store);
}

// --- Rendering ---
function renderCoursesGrid(targetId, courses = state.courses) {
  const el = $(`#${targetId}`);
  el.innerHTML = "";
  courses.forEach(c => {
    const card = document.createElement("article");
    card.className = "course-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="course-title">${escapeHTML(c.title)}</div>
          <div class="muted small">${escapeHTML(c.summary)}</div>
        </div>
        <div class="course-meta">
          <span class="muted small">${escapeHTML(c.level)}</span>
        </div>
      </div>
      <div style="margin-top:auto;display:flex;gap:0.5rem;align-items:center">
        <button class="btn-primary btn-open" data-id="${c.id}">Open</button>
        <button class="btn-link btn-edit" data-id="${c.id}">Edit</button>
      </div>
    `;
    el.appendChild(card);
  });

  // attach handlers
  $$(".btn-open").forEach(b => b.addEventListener("click", (e) => {
    const id = e.currentTarget.dataset.id;
    openCourse(id);
  }));
  $$(".btn-edit").forEach(b => b.addEventListener("click", (e) => {
    openEditorFor(e.currentTarget.dataset.id);
  }));
}

function escapeHTML(s){ return String(s).replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

function openCourse(courseId) {
  const course = state.courses.find(c => c.id === courseId);
  if (!course) return;
  state.currentCourse = course;
  state.currentModuleIndex = 0;
  navigateTo("course-view");
  renderCourseView();
  trackEvent("open_course", { courseId });
}

function renderCourseView() {
  const wrapper = $("#course-content");
  const c = state.currentCourse;
  if (!c) { wrapper.innerHTML = "<p>No course selected.</p>"; return; }

  const module = c.modules[state.currentModuleIndex];
  const progress = getUserProgress();
  const completed = (progress[c.id] && progress[c.id][module.id]) || false;

  wrapper.innerHTML = `
    <h2>${escapeHTML(c.title)}</h2>
    <div class="muted small">${escapeHTML(c.summary)} · ${escapeHTML(c.level)}</div>
    <hr>
    <h3>${escapeHTML(module.title)} ${completed ? "✅" : ""}</h3>
    <div class="module-content">${module.content}</div>
    <div style="margin-top:1rem;display:flex;gap:0.5rem">
      <button id="btn-start-quiz" class="btn-primary">Start Quiz</button>
      <button id="btn-mark-complete" class="btn-link">${completed ? "Mark incomplete" : "Mark complete"}</button>
      <div style="margin-left:auto" class="muted small">Module ${state.currentModuleIndex + 1} / ${c.modules.length}</div>
    </div>
    <div style="margin-top:1rem" id="module-nav"></div>
  `;

  $("#btn-start-quiz").addEventListener("click", () => startQuiz(module));
  $("#btn-mark-complete").addEventListener("click", () => toggleModuleComplete(c.id, module.id));

  const nav = $("#module-nav");
  c.modules.forEach((m, idx) => {
    const btn = document.createElement("button");
    btn.className = "btn-link";
    btn.textContent = `${idx + 1}. ${m.title}`;
    btn.addEventListener("click", () => {
      state.currentModuleIndex = idx;
      renderCourseView();
    });
    nav.appendChild(btn);
  });
}

function toggleModuleComplete(courseId, moduleId) {
  if (!state.user) { showAuthModal(); return; }
  const progress = getUserProgress();
  if (!progress[courseId]) progress[courseId] = {};
  progress[courseId][moduleId] = !progress[courseId][moduleId];
  setUserProgress(progress);
  renderCourseView();
  trackEvent("toggle_complete", { courseId, moduleId, value: progress[courseId][moduleId] });
}

function startQuiz(module) {
  // render simple quiz modal
  openQuizModal(module);
  trackEvent("start_quiz", { moduleId: module.id });
}

function openQuizModal(module) {
  const modal = $("#modal-quiz");
  const root = $("#quiz-root");
  modal.setAttribute("aria-hidden", "false");
  let qIndex = 0;
  let score = 0;

  function renderQuestion() {
    const q = module.quiz[qIndex];
    if (!q) return finish();
    root.innerHTML = `
      <h3>Quiz: ${escapeHTML(module.title)}</h3>
      <div class="muted small">Question ${qIndex+1} / ${module.quiz.length}</div>
      <hr>
      <p><strong>${escapeHTML(q.q)}</strong></p>
      <div id="quiz-options"></div>
      <div style="margin-top:1rem">
        <button id="quiz-next" class="btn-primary">Next</button>
      </div>
      <div id="quiz-feedback" class="muted small" style="margin-top:0.5rem"></div>
    `;
    const optRoot = $("#quiz-options");
    q.options.forEach((o, idx) => {
      const oEl = document.createElement("button");
      oEl.className = "btn-link";
      oEl.style.display = "block";
      oEl.style.textAlign = "left";
      oEl.textContent = o;
      oEl.dataset.idx = idx;
      oEl.addEventListener("click", () => {
        const chosen = Number(oEl.dataset.idx);
        const correct = q.answerIndex;
        const fb = $("#quiz-feedback");
        if (chosen === correct) {
          fb.textContent = "Correct ✅";
          score++;
          trackEvent("quiz_answer", { moduleId: module.id, qIndex, correct: true });
        } else {
          fb.textContent = `Wrong — correct answer: ${escapeHTML(q.options[correct])}`;
          trackEvent("quiz_answer", { moduleId: module.id, qIndex, correct: false });
        }
      });
      optRoot.appendChild(oEl);
    });

    $("#quiz-next").addEventListener("click", () => {
      qIndex++;
      if (qIndex >= module.quiz.length) finish();
      else renderQuestion();
    });
  }

  function finish() {
    root.innerHTML = `
      <h3>Quiz complete</h3>
      <p class="muted">Score: ${score} / ${module.quiz.length}</p>
      <div style="display:flex;gap:0.5rem">
        <button id="quiz-close" class="btn-primary">Close</button>
      </div>
    `;
    $("#quiz-close").addEventListener("click", closeQuizModal);

    // record simple progress if score qualifies (e.g., >0)
    if (state.user) {
      const course = state.currentCourse;
      if (course) {
        const progress = getUserProgress();
        if (!progress[course.id]) progress[course.id] = {};
        if (score > 0) progress[course.id][module.id] = true;
        setUserProgress(progress);
      }
    }
    trackEvent("finish_quiz", { moduleId: module.id, score });
  }

  function closeQuizModal() {
    modal.setAttribute("aria-hidden", "true");
    $("#quiz-root").innerHTML = "";
    renderCourseView();
  }

  $("#close-quiz").onclick = closeQuizModal;
  renderQuestion();
}

// --- Simple navigation ---
function navigateTo(pageId) {
  $$(".page").forEach(p => p.classList.remove("page-active"));
  $("#home").classList.remove("page-active");
  const p = $(`#${pageId}`);
  if (p) p.classList.add("page-active");
  // manage aria-hidden
  $$(".page").forEach(el => el.setAttribute("aria-hidden", el !== p));
}

// --- Auth modal & handlers (mocked) ---
function showAuthModal() {
  $("#modal-auth").setAttribute("aria-hidden", "false");
  $("#auth-title").textContent = "Log in";
  $("#switch-auth").textContent = "Create account";
  $("#auth-form").dataset.mode = "login";
  $("#auth-message").textContent = "";
}
function showRegisterModal() {
  $("#modal-auth").setAttribute("aria-hidden", "false");
  $("#auth-title").textContent = "Create account";
  $("#switch-auth").textContent = "Have an account? Log in";
  $("#auth-form").dataset.mode = "register";
  $("#auth-message").textContent = "";
}

function closeAuthModal() {
  $("#modal-auth").setAttribute("aria-hidden", "true");
  $("#auth-email").value = "";
  $("#auth-password").value = "";
  $("#auth-message").textContent = "";
}

// Very small mock "user DB" inside localStorage — DO NOT USE IN PRODUCTION
function getUserStore() {
  const raw = localStorage.getItem("mindra_users") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}
function saveUserStore(s) { localStorage.setItem("mindra_users", JSON.stringify(s)); }

function handleAuthSubmit(e) {
  e.preventDefault();
  const mode = e.currentTarget.dataset.mode || "login";
  const email = $("#auth-email").value.trim().toLowerCase();
  const pass = $("#auth-password").value;
  if (!email || !pass) { $("#auth-message").textContent = "Email and password required"; return; }

  const store = getUserStore();
  if (mode === "register") {
    if (store[email]) { $("#auth-message").textContent = "Account exists — try logging in"; return; }
    store[email] = { email, password: pass, name: email.split("@")[0] };
    saveUserStore(store);
    saveUser({ email, name: store[email].name });
    $("#auth-message").textContent = "Account created — you are now logged in";
    trackEvent("register", { email });
    setTimeout(closeAuthModal, 700);
  } else {
    const u = store[email];
    if (!u || u.password !== pass) { $("#auth-message").textContent = "Invalid credentials"; return; }
    saveUser({ email, name: u.name });
    $("#auth-message").textContent = "Welcome back";
    trackEvent("login", { email });
    setTimeout(closeAuthModal, 500);
  }
}

function logout() {
  trackEvent("logout", { email: state.user?.email });
  saveUser(null);
  renderHeader();
}

// --- Progress page rendering ---
function renderProgressPage() {
  const root = $("#progress-list");
  if (!state.user) {
    root.innerHTML = `<p class="muted">Sign in to track your progress.</p>`;
    return;
  }
  const progress = getUserProgress();
  root.innerHTML = "";
  state.courses.forEach(c => {
    const cNode = document.createElement("div");
    const modules = c.modules.map(m => ({ id: m.id, title: m.title, done: progress[c.id] && progress[c.id][m.id] }));
    const doneCount = modules.filter(m=>m.done).length;
    cNode.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
        <div><strong>${escapeHTML(c.title)}</strong> <div class="muted small">${c.summary}</div></div>
        <div class="muted small">${doneCount}/${modules.length} done</div>
      </div>
    `;
    root.appendChild(cNode);
  });
}

// --- Editor (admin prototyping) ---
function openEditorFor(courseId) {
  // simple open: find course and populate editor
  const modal = $("#modal-editor");
  modal.setAttribute("aria-hidden", "false");
  const course = state.courses.find(c => c.id === courseId);
  if (course) {
    $("#editor-title").value = course.title;
    $("#editor-summary").value = course.summary;
    $("#editor-level").value = course.level || "Beginner";
    $("#editor-modules").value = JSON.stringify(course.modules, null, 2);
    $("#editor-form").dataset.editing = courseId;
  } else {
    $("#editor-title").value = "";
    $("#editor-summary").value = "";
    $("#editor-level").value = "Beginner";
    $("#editor-modules").value = "";
    $("#editor-form").dataset.editing = "";
  }
}

function closeEditor() {
  $("#modal-editor").setAttribute("aria-hidden", "true");
  $("#editor-msg").textContent = "";
}

function handleEditorSubmit(e) {
  e.preventDefault();
  const editing = e.currentTarget.dataset.editing;
  const title = $("#editor-title").value.trim();
  const summary = $("#editor-summary").value.trim();
  const level = $("#editor-level").value;
  const modulesText = $("#editor-modules").value.trim();
  if (!title) { $("#editor-msg").textContent = "Title required"; return; }
  let modules;
  try { modules = modulesText ? JSON.parse(modulesText) : []; } catch (err) {
    $("#editor-msg").textContent = "Modules must be valid JSON";
    return;
  }
  if (editing) {
    // update
    const i = state.courses.findIndex(c=>c.id===editing);
    if (i >= 0) {
      state.courses[i].title = title;
      state.courses[i].summary = summary;
      state.courses[i].level = level;
      state.courses[i].modules = modules;
      $("#editor-msg").textContent = "Updated course";
      trackEvent("edit_course", { courseId: editing });
    }
  } else {
    // create id
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    state.courses.push({ id, title, summary, level, modules });
    $("#editor-msg").textContent = "Created course";
    trackEvent("create_course", { courseId: id });
  }
  renderCoursesGrid("courses-list");
  renderCoursesGrid("courses-grid");
  setTimeout(closeEditor, 700);
}

// --- Header & top-level events ---
function renderHeader() {
  const loginBtn = $("#btn-login");
  if (state.user) {
    loginBtn.textContent = `Hi, ${state.user.name}`;
    loginBtn.onclick = () => logout();
    $("#btn-admin").style.display = "inline-block";
  } else {
    loginBtn.textContent = "Log in";
    loginBtn.onclick = () => showAuthModal();
    $("#btn-admin").style.display = "inline-block";
  }
}

// Simple client-side event tracking (replace with real analytics backend)
function trackEvent(name, payload = {}) {
  const ev = { name, payload, ts: Date.now(), user: state.user?.email || null };
  // For now we console.log and store a small history in localStorage
  console.log("MINDRA_EVENT", ev);
  const raw = localStorage.getItem("mindra_telemetry") || "[]";
  try {
    const arr = JSON.parse(raw);
    arr.push(ev);
    localStorage.setItem("mindra_telemetry", JSON.stringify(arr.slice(-500))); // keep last 500
  } catch (e) {
    localStorage.setItem("mindra_telemetry", JSON.stringify([ev]));
  }
}

// --- Wiring & event listeners ---
function wireUi() {
  // nav
  $("#nav-home").addEventListener("click", () => navigateTo("home"));
  $("#nav-courses").addEventListener("click", () => navigateTo("courses"));
  $("#nav-progress").addEventListener("click", () => { navigateTo("progress"); renderProgressPage(); });

  $("#start-now").addEventListener("click", () => navigateTo("courses"));
  $("#btn-login").addEventListener("click", () => showAuthModal());
  $("#close-auth").addEventListener("click", () => closeAuthModal());
  $("#close-quiz").addEventListener("click", () => $("#modal-quiz").setAttribute("aria-hidden", "true"));
  $("#close-editor").addEventListener("click", () => closeEditor());
  $("#back-to-courses").addEventListener("click", () => navigateTo("courses"));

  // auth form
  $("#auth-form").addEventListener("submit", handleAuthSubmit);
  $("#switch-auth").addEventListener("click", (e) => {
    const mode = $("#auth-form").dataset.mode || "login";
    if (mode === "login") showRegisterModal(); else showAuthModal();
  });

  // editor form
  $("#editor-form").addEventListener("submit", handleEditorSubmit);

  // admin open
  $("#btn-admin").addEventListener("click", () => {
    // simple gate: show editor but require sign in for persistence
    openEditorFor();
  });

  // initial render of course grids
  renderCoursesGrid("courses-list");
  renderCoursesGrid("courses-grid");

  // Render header based on auth state
  renderHeader();
}

// --- Init ---
function init() {
  loadUser();
  wireUi();
  // expose state for debugging
  window.Mindra = state;
  trackEvent("app_init", {});
}

init();
