(function() {
  function showFatalError(msg) {
    document.body.innerHTML = '';
    const errDiv = document.createElement('div');
    errDiv.style = "color:#c00;font-size:1.4em;margin:32px;";
    errDiv.innerText = "FATAL ERROR: " + msg;
    document.body.appendChild(errDiv);
    console.error("FATAL ERROR:", msg);
  }

  function waitForSupabase(callback) {
    if (window.supabase && window.supabase.createClient) {
      callback(window.supabase.createClient(
        'https://cgxjqsbrditbteqhdyus.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4'
      ));
    } else {
      setTimeout(() => waitForSupabase(callback), 30);
    }
  }

  waitForSupabase(function(supabaseClient) {
    try {

const CANVAS_W = 360, CANVAS_H = 640;

const BLOCK_TYPES = [
  { type: "title", label: "Title", w: 275, h: 55, x: 42, y: 231, size: 18, align: "left", color: "#222222", maxlen: 200 },
  { type: "desc", label: "Description", w: 275, h: 256, x: 42, y: 294, size: 16, align: "left", color: "#444444", maxlen: 1000 },
  { type: "question", label: "Question", w: 294, h: 55, x: 31, y: 109, size: 18, align: "left", color: "#222222", maxlen: 200 }
];

// The full list of required static pages (update here if you add/remove pages)
const REQUIRED_PAGES = [
  "static/2.png", // intro
  "static/3a.png", "static/3b.png", "static/3c.png", "static/3d.png",
  "static/3e.png", "static/3f.png", "static/3g.png", "static/3h.png",
  "static/4.png", // pre-results
  "static/5a.png", "static/5b.png", "static/5c.png", "static/5d.png", // results
  "static/6.png" // thank you
];

// Helper to ensure all required pages exist in the quiz (in correct order)
function ensureAllPages(quiz) {
  quiz.pages = quiz.pages || [];
  const presentPages = quiz.pages.map(p => p.bg);
  REQUIRED_PAGES.forEach((bg, idx) => {
    if (!presentPages.includes(bg)) {
      // Insert missing page in order
      quiz.pages.splice(idx, 0, { bg, blocks: [] });
    }
  });
  // Remove any extra pages not in REQUIRED_PAGES
  quiz.pages = quiz.pages.filter(p => REQUIRED_PAGES.includes(p.bg));
}

function blankQuiz() {
  const q = {
    id: "",
    title: "New Quiz",
    pages: REQUIRED_PAGES.map(bg => ({ bg, blocks: [] }))
  };
  return q;
}

// ... rest of your unchanged code for UI, adding/removing blocks, etc. ...

function loadQuizzes() {
  let q = localStorage.getItem('3c-quiz-admin-quizzes-v3');
  if (!q) return [];
  try {
    const arr = JSON.parse(q);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}
function saveQuizzes() {
  localStorage.setItem('3c-quiz-admin-quizzes-v3', JSON.stringify(quizzes));
}

function newQuizId() {
  let used = quizzes.map(q => {
    let m = q.id.match(/^quiz\.(\d+)$/);
    return m ? parseInt(m[1]) : null;
  }).filter(n => n !== null);
  let n = 1;
  while (used.includes(n)) n++;
  return `quiz.${String(n).padStart(2,'0')}`;
}

let quizzes = loadQuizzes();
if (quizzes.length === 0) quizzes.push(Object.assign(blankQuiz(), {id: "quiz.01"}));
let currentQuizIdx = 0;
let selectedPageIdx = 0;
let selectedBlockIdx = -1;

// Ensure required pages on every load
quizzes.forEach(ensureAllPages);

function renderApp() {
  try {
    const app = document.getElementById('app');
    if (!app) throw new Error("App container not found!");
    const quiz = quizzes[currentQuizIdx] || blankQuiz();
    ensureAllPages(quiz);
    const pages = quiz.pages || [blankQuiz().pages[0]];
    const page = pages[selectedPageIdx] || pages[0];

    app.innerHTML = `
      <div class="sidebar">
        <div class="page-list">
          <strong>Pages</strong>
          <ul>
            ${pages.map((p, i) => `
              <li style="display:flex;align-items:center;gap:5px;">
                <button class="${i===selectedPageIdx?'active':''}" onclick="onSelectPage(${i})">
                  <img class="page-img-thumb" src="${p.bg || ''}" alt="">
                  <span class="img-filename">${(p.bg||'').replace('static/','')}</span>
                </button>
                <button onclick="onRemovePage(${i})" class="danger" style="font-size:0.95em;padding:2px 7px;" disabled>✕</button>
                <button onclick="onMovePageUpSingle(${i})" ${i===0?'disabled':''} title="Move Up" style="padding:2px 5px;font-size:1em;">⬆️</button>
                <button onclick="onMovePageDownSingle(${i})" ${i===pages.length-1?'disabled':''} title="Move Down" style="padding:2px 5px;font-size:1em;">⬇️</button>
              </li>
            `).join('')}
          </ul>
          <div class="page-actions">
            <button onclick="onAddPage()" disabled>+ Add Page</button>
            <button onclick="onDuplicatePage()" disabled>Duplicate Page</button>
          </div>
        </div>
        <div class="block-controls">
          <strong>Add Block</strong>
          <button onclick="onAddBlock('title')">Title</button>
          <button onclick="onAddBlock('desc')">Description</button>
          <button onclick="onAddBlock('question')">Question</button>
          <button onclick="onAddAnswerBlock('A')">Answer A</button>
          <button onclick="onAddAnswerBlock('B')">Answer B</button>
          <button onclick="onAddAnswerBlock('C')">Answer C</button>
          <button onclick="onAddAnswerBlock('D')">Answer D</button>
          <button onclick="onRemoveAllBlocks()" class="danger" style="margin-top:4px;">Remove All</button>
          <button onclick="onRemoveBlockSidebar()" class="danger" style="margin-top:8px;" ${selectedBlockIdx<0?"disabled":""}>Remove Block</button>
        </div>
      </div>
      <div class="mainpanel">
        <div class="header">
          <h1>3c-quiz-admin</h1>
          <button onclick="onNewQuizTab()">New Quiz</button>
          <div style="flex:1"></div>
          <span><b>Quiz ID:</b> <span style="background:#fe0;padding:2px 6px;border-radius:4px">${quiz.id}</span></span>
          <input type="text" value="${quiz.title}" style="margin-left:12px;width:180px;" onchange="onQuizTitleChange(this.value)">
        </div>
        <div style="margin-bottom:16px;">
          <button onclick="onPrevPage()" ${selectedPageIdx===0?'disabled':''}>&larr;</button>
          <span style="margin:0 12px;">Page ${selectedPageIdx+1} / ${pages.length}</span>
          <button onclick="onNextPage()" ${selectedPageIdx===pages.length-1?'disabled':''}>&rarr;</button>
          <button onclick="onAddPage()" style="margin-left:12px;" disabled>+ Create Next Page</button>
          <button onclick="onSavePage()" style="margin-left:8px;">💾 Save Page</button>
        </div>
        <div class="editor-canvas-wrap">
          <div>
            ${renderCanvas(page)}
            <div style="margin:6px 0;">
              <label>Background:
                <input type="text" value="${page.bg||''}" style="width:160px;" onchange="onBgChange(this.value)" disabled>
              </label>
              <button onclick="onPickBg()" disabled>Pick Image</button>
            </div>
          </div>
          <div>
            ${renderBlockSettings(page)}
            <div class="save-area">
              <button onclick="onSaveQuiz()">💾 Save Quiz</button>
              <button onclick="onExportQuiz()">⬇ Export JSON</button>
              <button onclick="onImportQuiz()">⬆ Import JSON</button>
              <div id="supabase-status" style="margin-top:10px;font-size:0.98em;color:#0a0"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(attachCanvasEvents, 30);
    setTimeout(()=>{
      if (selectedBlockIdx >= 0) {
        let canvas = document.getElementById("editor-canvas");
        if (canvas) {
          let blockEls = canvas.querySelectorAll('.text-block');
          let contentEl = blockEls[selectedBlockIdx]?.querySelector('.block-content');
          if (contentEl) contentEl.focus();
        }
      }
    }, 100);
  } catch(e) {
    showFatalError("Render error: " + e.message);
  }
}

// All your unchanged block/page handlers here...

window.onSaveQuiz = async function() {
  const statusDiv = document.getElementById("supabase-status");
  if (statusDiv) statusDiv.textContent = '';
  let qz = quizzes[currentQuizIdx];
  ensureAllPages(qz);

  let quiz_slug = qz.id;
  let quiz_url = `https://anica-blip.github.io/3c-quiz/${quiz_slug}`;
  let dbQuiz = {
    quiz_slug,
    quiz_url,
    title: qz.title,
  };

  // Map each required page to its Supabase column
  // 2.png: intro, 3a-h.png: questions, 4.png: pre-results, 5a-d.png: results, 6.png: thankyou
  // Question pages: save as JSON {question, answers, correct}
  // Results: save as JSON {title, description, bg}
  // Others: save as text (description, etc.)

  // Map intro
  dbQuiz["2.png"] = (qz.pages.find(p => p.bg === "static/2.png")?.blocks[0]?.text || "");

  // Map question pages
  const questionKeys = [
    "3a.png", "3b.png", "3c.png", "3d.png", "3e.png", "3f.png", "3g.png", "3h.png"
  ];
  questionKeys.forEach((k, i) => {
    let page = qz.pages.find(p => p.bg === `static/${k}`);
    if (page) {
      let question = page.blocks.find(b => b.type === "question")?.text || "";
      let answers = ["A","B","C","D"].map(letter =>
        page.blocks.find(b => b.type === "answer" && b.resultType === letter)?.text || ""
      );
      // Optionally, you can save correct answer index or type if you want (here left off)
      if (question || answers.some(x => x)) {
        dbQuiz[k] = JSON.stringify({ question, answers });
      }
    }
  });

  // Pre-results (page 4.png) - just save first block text
  dbQuiz["4.png"] = (qz.pages.find(p => p.bg === "static/4.png")?.blocks[0]?.text || "");

  // Result pages (5a-d.png)
  ["A","B","C","D"].forEach(letter => {
    let page = qz.pages.find(p => p.bg === `static/5${letter.toLowerCase()}.png`);
    if (page) {
      let title = page.blocks.find(b => b.type === "title")?.text || "";
      let description = page.blocks.find(b => b.type === "desc")?.text || "";
      dbQuiz[`5${letter.toLowerCase()}.png`] = JSON.stringify({ title, description, bg: `static/5${letter.toLowerCase()}.png` });
    }
  });

  // Thank you page (6.png)
  dbQuiz["6.png"] = (qz.pages.find(p => p.bg === "static/6.png")?.blocks[0]?.text || "");

  if (!supabaseClient) {
    showFatalError("Supabase client not loaded yet, please reload and try again.");
    return;
  }

  let { error } = await supabaseClient
    .from('quizzes')
    .upsert([dbQuiz], { onConflict: "quiz_slug" });

  if (error) {
    if (statusDiv) {
      statusDiv.style.color = "#c00";
      statusDiv.textContent = "❌ Error saving quiz: " + error.message;
    }
    alert("Supabase save failed: " + error.message);
  } else {
    if (statusDiv) {
      statusDiv.style.color = "#0a0";
      statusDiv.textContent = "✅ Quiz saved to Supabase!";
    }
    alert("Quiz saved to Supabase!");
  }
};

// ...rest of your unchanged logic for rendering canvas, block settings, handlers, etc...

renderApp();

    } catch(e) {
      showFatalError(e.message || e);
    }
  });

})();
