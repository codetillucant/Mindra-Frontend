// Minimal Mindra front-end app with form-based module editor and admin flow
// - Courses persist to localStorage ('mindra_courses')
// - Admin sign-in toggles admin mode stored in localStorage 'mindra_is_admin' (demo-only)
// - Editor provides add/remove module UI and simple quiz inputs

const ADMIN_PASSWORD = 'mindra123'; // demo password: change before production

const state = {
  user: null,
  isAdmin: false,
  courses: [],
  currentCourse: null,
  currentModuleIndex: 0,
};

// --- Default sample data ---
const DEFAULT_COURSES = [
  {
    id: "course-html-basics",
    title: "HTML & Semantic Markup",
    summary: "Learn the basics of HTML markup and build accessible pages.",
    level: "Beginner",
    modules: [
      { id: "html-intro", title: "Introduction to HTML", content: `<p>HTML (HyperText Markup Language) is the foundation of web pages.</p>`, quiz: [] },
      { id: "html-forms", title: "Forms & Inputs", content: `<p>Forms collect user input.</p>`, quiz: [] },
    ],
  },
];

// --- Storage helpers ---
function loadCourses() {
  const raw = localStorage.getItem("mindra_courses");
  if (!raw) { state.courses = DEFAULT_COURSES.slice(); saveCourses(); return; }
  try { const parsed = JSON.parse(raw); state.courses = Array.isArray(parsed) ? parsed : DEFAULT_COURSES.slice(); } catch (e) { state.courses = DEFAULT_COURSES.slice(); saveCourses(); }
}
function saveCourses() { localStorage.setItem("mindra_courses", JSON.stringify(state.courses)); }

// --- Admin helpers ---
function loadAdmin() {
  state.isAdmin = !!localStorage.getItem('mindra_is_admin');
}
function setAdmin(value) {
  state.isAdmin = !!value;
  if (value) localStorage.setItem('mindra_is_admin', '1'); else localStorage.removeItem('mindra_is_admin');
  renderAdminUI();
}

// --- Utilities ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
function slugify(s) { return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function escapeHTML(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function saveUser(user) { state.user = user; if (user) localStorage.setItem("mindra_user", JSON.stringify(user)); else localStorage.removeItem("mindra_user"); }
function loadUser() { const raw = localStorage.getItem("mindra_user"); if (raw) { try { state.user = JSON.parse(raw); } catch(e){ state.user = null; } } }

// --- Rendering ---
function renderAdminUI(){
  const newBtn = $('#btn-new-course');
  const adminBtn = $('#btn-admin');
  if (!newBtn || !adminBtn) return;
  if (state.isAdmin) {
    newBtn.style.display = 'inline-block';
    adminBtn.textContent = 'Content';
  } else {
    newBtn.style.display = 'none';
    adminBtn.textContent = 'Admin';
  }
}

function renderCoursesGrid(targetId, courses = state.courses) {
  const el = $(`#${targetId}`);
  el.innerHTML = "";
  courses.forEach(c => {
    const card = document.createElement('article');
    card.className = 'course-card';
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

  $$('.btn-open').forEach(b => b.addEventListener('click', (e) => openCourse(e.currentTarget.dataset.id)));
  $$('.btn-edit').forEach(b => b.addEventListener('click', (e) => openEditorFor(e.currentTarget.dataset.id)));
}

function openCourse(courseId){ const course = state.courses.find(c=>c.id===courseId); if(!course) return; state.currentCourse = course; state.currentModuleIndex = 0; navigateTo('course-view'); renderCourseView(); }
function renderCourseView(){ const wrapper = $('#course-content'); const c = state.currentCourse; if(!c){ wrapper.innerHTML = '<p>No course selected.</p>'; return; } const module = c.modules[state.currentModuleIndex]; wrapper.innerHTML = `
  <h2>${escapeHTML(c.title)}</h2>
  <div class="muted small">${escapeHTML(c.summary)} · ${escapeHTML(c.level)}</div>
  <hr>
  <h3>${escapeHTML(module.title)}</h3>
  <div class="module-content">${module.content}</div>
  <div style="margin-top:1rem;display:flex;gap:0.5rem">
    <button id="btn-start-quiz" class="btn-primary">Start Quiz</button>
    <div style="margin-left:auto" class="muted small">Module ${state.currentModuleIndex+1} / ${c.modules.length}</div>
  </div>
  <div style="margin-top:1rem" id="module-nav"></div>
`;
  $('#btn-start-quiz').addEventListener('click', ()=> startQuiz(module));
  const nav = $('#module-nav'); c.modules.forEach((m, idx)=>{ const btn = document.createElement('button'); btn.className='btn-link'; btn.textContent = 
`${idx+1}. ${m.title}`;
    btn.addEventListener('click', ()=>{ state.currentModuleIndex = idx; renderCourseView(); }); nav.appendChild(btn);
  });
}

// --- Quiz (unchanged simplified) ---
function startQuiz(module){ const modal = $('#modal-quiz'); const root = $('#quiz-root'); modal.setAttribute('aria-hidden','false'); root.innerHTML = `<h3>Quiz</h3><p class="muted">No questions yet.</p><div style="margin-top:1rem"><button id="quiz-close" class="btn-primary">Close</button></div>`; $('#quiz-close').addEventListener('click', ()=> modal.setAttribute('aria-hidden','true')); }

// --- Navigation ---
function navigateTo(pageId){ $$('.page').forEach(p=>p.classList.remove('page-active')); const p = $(`#${pageId}`); if(p) p.classList.add('page-active'); $$('.page').forEach(el=> el.setAttribute('aria-hidden', el!==p)); }

// --- Auth (mocked user flow) ---
function showAuthModal(){ $('#modal-auth').setAttribute('aria-hidden','false'); $('#auth-form').dataset.mode='login'; $('#auth-message').textContent=''; }
function closeAuthModal(){ $('#modal-auth').setAttribute('aria-hidden','true'); $('#auth-email').value=''; $('#auth-password').value=''; }
function handleAuthSubmit(e){ e.preventDefault(); const mode = e.currentTarget.dataset.mode||'login'; const email = $('#auth-email').value.trim().toLowerCase(); const pass = $('#auth-password').value; if(!email||!pass){ $('#auth-message').textContent='Email and password required'; return; } const store = getUserStore(); if(mode==='register'){ if(store[email]){ $('#auth-message').textContent='Account exists'; return; } store[email]={email,password:pass,name:email.split('@')[0]}; saveUserStore(store); saveUser({email,name:store[email].name}); $('#auth-message').textContent='Account created'; setTimeout(closeAuthModal,600); } else { const u = store[email]; if(!u||u.password!==pass){ $('#auth-message').textContent='Invalid credentials'; return; } saveUser({email,name:u.name}); $('#auth-message').textContent='Welcome back'; setTimeout(closeAuthModal,400); } }
function getUserStore(){ const raw = localStorage.getItem('mindra_users')||'{}'; try{ return JSON.parse(raw);}catch{ return {}; } }
function saveUserStore(s){ localStorage.setItem('mindra_users', JSON.stringify(s)); }
function saveUser(u){ state.user = u; if(u) localStorage.setItem("mindra_user", JSON.stringify(u)); else localStorage.removeItem("mindra_user"); renderHeader(); }
function loadUser(){ const raw = localStorage.getItem("mindra_user"); if(raw){ try{ state.user = JSON.parse(raw);}catch{ state.user = null;} } }
function logout(){ saveUser(null); }

// --- Admin login handling ---
function showAdminModal(){ $('#modal-admin').setAttribute('aria-hidden','false'); $('#admin-password').value=''; $('#admin-msg').textContent=''; }
function closeAdminModal(){ $('#modal-admin').setAttribute('aria-hidden','true'); $('#admin-password').value=''; $('#admin-msg').textContent=''; }
function handleAdminSubmit(e){ e.preventDefault(); const pass = $('#admin-password').value; if(pass === ADMIN_PASSWORD){ setAdmin(true); $('#admin-msg').textContent = 'Signed in as admin'; setTimeout(closeAdminModal,400); } else { $('#admin-msg').textContent = 'Invalid admin password'; } }

// --- Editor UI (form-based modules) ---
function openEditorFor(courseId){ const modal = $('#modal-editor'); modal.setAttribute('aria-hidden','false'); const heading = $('#editor-heading'); if(courseId){ heading.textContent='Edit Course'; const course = state.courses.find(c=>c.id===courseId); $('#editor-form').dataset.editing = courseId; $('#editor-title').value = course.title; $('#editor-summary').value = course.summary; $('#editor-level').value = course.level||'Beginner'; renderModuleEditor(course.modules); } else { heading.textContent='Create Course'; $('#editor-form').dataset.editing=''; $('#editor-title').value=''; $('#editor-summary').value=''; $('#editor-level').value='Beginner'; renderModuleEditor([]); } }
function closeEditor(){ $('#modal-editor').setAttribute('aria-hidden','true'); $('#editor-msg').textContent=''; }

function renderModuleEditor(modules){ const root = $('#modules-editor'); root.innerHTML=''; modules.forEach((m, idx)=> addModuleItem(root, m, idx)); }

function addModuleItem(root, module = {}, idx){ const id = module.id || ''; const title = module.title || '';
  const content = module.content || '';
  const wrapper = document.createElement('div'); wrapper.className='module-item'; wrapper.style.border='1px solid #eef6ff'; wrapper.style.padding='0.5rem'; wrapper.style.marginBottom='0.5rem'; wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
      <strong>Module</strong>
      <button type="button" class="btn-link btn-remove-module">Remove</button>
    </div>
    <label>Title<input class="module-title" value="${escapeHTML(title)}"></label>
    <label>Content<textarea class="module-content" rows="3">${escapeHTML(content)}</textarea></label>
    <label>Quiz items (optional) <small class="muted">Enter question and comma-separated options; mark correct index</small></label>
    <div class="module-quiz"></div>
    <div style="margin-top:0.5rem;display:flex;gap:0.5rem">
      <button type="button" class="btn-link btn-add-quiz">Add quiz</button>
    </div>
  `;
  root.appendChild(wrapper);

  wrapper.querySelector('.btn-remove-module').addEventListener('click', ()=>{ wrapper.remove(); });
  wrapper.querySelector('.btn-add-quiz').addEventListener('click', ()=> addQuizItem(wrapper, {}));
}

function addQuizItem(moduleWrapper, quiz){ const qRoot = moduleWrapper.querySelector('.module-quiz'); const question = quiz.q || ''; const options = (Array.isArray(quiz.options) ? quiz.options.join('|') : ''); const answerIndex = (typeof quiz.answerIndex === 'number') ? quiz.answerIndex : 0; const item = document.createElement('div'); item.style.borderTop='1px solid #f0f6ff'; item.style.paddingTop='0.5rem'; item.style.marginTop='0.5rem'; item.innerHTML = `
  <label>Question<input class="quiz-q" value="${escapeHTML(question)}"></label>
  <label>Options (separate with |)<input class="quiz-options" value="${escapeHTML(options)}"></label>
  <label>Correct option index<input type="number" class="quiz-answer" value="${answerIndex}" min="0"></label>
  <div style="margin-top:0.25rem"><button type="button" class="btn-link btn-remove-quiz">Remove quiz</button></div>
`;
  qRoot.appendChild(item);
  item.querySelector('.btn-remove-quiz').addEventListener('click', ()=> item.remove());
}

function collectModulesFromEditor(){ const items = $$('#modules-editor .module-item'); const modules = []; items.forEach((it, idx)=>{ const title = it.querySelector('.module-title').value.trim() || `Module ${idx+1}`; const content = it.querySelector('.module-content').value.trim() || '<p>Content coming soon.</p>'; const quizEls = Array.from(it.querySelectorAll('.module-quiz > div')); const quizzes = quizEls.map(qel => { const q = qel.querySelector('.quiz-q').value.trim(); const opts = qel.querySelector('.quiz-options').value.split('|').map(s=>s.trim()).filter(Boolean); const ans = Number(qel.querySelector('.quiz-answer').value) || 0; return { q, options: opts, answerIndex: ans }; }).filter(q=>q.q); const id = it.dataset.id || `${slugify(title)}-mod-${idx+1}`; modules.push({ id, title, content, quiz: quizzes }); }); return modules; }

function handleEditorSubmit(e){ e.preventDefault(); if(!state.isAdmin){ $('#editor-msg').textContent = 'Only admins can save courses.'; return; } const editing = e.currentTarget.dataset.editing; const title = $('#editor-title').value.trim(); if(!title){ $('#editor-msg').textContent = 'Title required'; return; } const summary = $('#editor-summary').value.trim(); const level = $('#editor-level').value; const modules = collectModulesFromEditor(); if(editing){ const i = state.courses.findIndex(c=>c.id===editing); if(i>=0){ state.courses[i].title = title; state.courses[i].summary = summary; state.courses[i].level = level; state.courses[i].modules = modules; $('#editor-msg').textContent = 'Updated course'; saveCourses(); } } else { let id = slugify(title); let suffix=1; while(state.courses.find(c=>c.id===id)){ id = `${slugify(title)}-${suffix++}`; } state.courses.push({ id, title, summary, level, modules }); $('#editor-msg').textContent = 'Created course'; saveCourses(); } renderCoursesGrid('courses-list'); renderCoursesGrid('courses-grid'); setTimeout(closeEditor, 500); }

// --- Header & wiring ---
function renderHeader(){ const loginBtn = $('#btn-login'); if(state.user){ loginBtn.textContent = `Hi, ${state.user.name}`; loginBtn.onclick = ()=> logout(); } else { loginBtn.textContent = 'Log in'; loginBtn.onclick = ()=> showAuthModal(); } renderAdminUI(); }

function wireUi(){ $('#nav-home').addEventListener('click', ()=> navigateTo('home'));
  $('#nav-courses').addEventListener('click', ()=> navigateTo('courses'));
  $('#nav-progress').addEventListener('click', ()=> { navigateTo('progress'); });
  $('#start-now').addEventListener('click', ()=> navigateTo('courses'));
  $('#btn-login').addEventListener('click', ()=> showAuthModal());
  $('#close-auth').addEventListener('click', ()=> closeAuthModal());
  $('#admin-form').addEventListener('submit', handleAdminSubmit);
  $('#close-admin').addEventListener('click', ()=> closeAdminModal());
  $('#btn-admin').addEventListener('click', ()=> { if(state.isAdmin) openEditorFor(); else showAdminModal(); });
  $('#btn-new-course').addEventListener('click', ()=> openEditorFor());
  $('#close-editor').addEventListener('click', ()=> closeEditor());
  $('#btn-add-module').addEventListener('click', ()=> addModuleItem($('#modules-editor')));
  $('#editor-form').addEventListener('submit', handleEditorSubmit);
  $('#auth-form').addEventListener('submit', handleAuthSubmit);
}

function init(){ loadUser(); loadAdmin(); loadCourses(); wireUi(); renderCoursesGrid('courses-list'); renderCoursesGrid('courses-grid'); renderHeader(); }
init();