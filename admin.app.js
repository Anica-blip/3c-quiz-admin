const CANVAS_W = 360, CANVAS_H = 640;

const BLOCK_TYPES = [
  { type: "title", label: "Title", w: 275, h: 55, x: 42, y: 231, size: 18, align: "left", color: "#222222", maxlen: 200 },
  { type: "desc", label: "Description", w: 275, h: 256, x: 42, y: 294, size: 16, align: "left", color: "#444444", maxlen: 1000 },
  { type: "question", label: "Question", w: 294, h: 55, x: 31, y: 109, size: 18, align: "left", color: "#222222", maxlen: 200 },
  { type: "answer", label: "Answer", w: 294, h: 55, x: 31, y: 216, size: 16, align: "left", color: "#003366", maxlen: 200 }
];

function blankQuiz() {
  return {
    id: "", // Will be set by newQuizId()
    title: "New Quiz",
    pages: [
      { bg: "static/2.png", blocks: [] }
    ]
  };
}
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

// Generate next available quiz ID (reusing deleted numbers)
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

function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;
  const quiz = quizzes[currentQuizIdx] || blankQuiz();
  const pages = quiz.pages || [blankQuiz().pages[0]];
  const page = pages[selectedPageIdx] || pages[0];

  app.innerHTML = `
    <div class="sidebar">
      <div class="page-list">
        <strong>Pages</strong>
        <ul>
          ${pages.map((p, i) => `
            <li>
              <button class="${i===selectedPageIdx?'active':''}" onclick="onSelectPage(${i})">
                <img class="page-img-thumb" src="${p.bg || ''}" alt="">
                <span class="img-filename">${(p.bg||'').replace('static/','')}</span>
              </button>
              <button onclick="onRemovePage(${i})" class="danger" style="font-size:0.95em;padding:2px 7px;">✕</button>
            </li>
          `).join('')}
        </ul>
        <div class="page-actions">
          <button onclick="onAddPage()">+ Add Page</button>
          <button onclick="onDuplicatePage()">Duplicate Page</button>
          <button onclick="onMovePageUp()" ${selectedPageIdx===0?'disabled':''}>&uarr;</button>
          <button onclick="onMovePageDown()" ${selectedPageIdx===pages.length-1?'disabled':''}>&darr;</button>
        </div>
      </div>
      <div class="block-controls">
        <strong>Add Block</strong>
        ${BLOCK_TYPES.map(b => `
          <button onclick="onAddBlock('${b.type}')">${b.label}</button>
        `).join('')}
        <button onclick="onRemoveAllBlocks()" class="danger" style="margin-top:4px;">Remove All</button>
        <button onclick="onRemoveBlockSidebar()" class="danger" style="margin-top:8px;" ${selectedBlockIdx<0?"disabled":""}>Remove Block</button>
      </div>
    </div>
    <div class="mainpanel">
      <div class="header">
        <h1>3c-quiz-admin</h1>
        <button onclick="onNewQuizTab()">New Quiz</button>
        <div style="flex:1"></div>
        <span><b>ID:</b> ${quiz.id}</span>
        <input type="text" value="${quiz.title}" style="margin-left:12px;width:180px;" onchange="onQuizTitleChange(this.value)">
      </div>
      <div style="margin-bottom:16px;">
        <button onclick="onPrevPage()" ${selectedPageIdx===0?'disabled':''}>&larr;</button>
        <span style="margin:0 12px;">Page ${selectedPageIdx+1} / ${pages.length}</span>
        <button onclick="onNextPage()" ${selectedPageIdx===pages.length-1?'disabled':''}>&rarr;</button>
        <button onclick="onAddPage()" style="margin-left:12px;">+ Create Next Page</button>
        <button onclick="onSavePage()" style="margin-left:8px;">💾 Save Page</button>
      </div>
      <div class="editor-canvas-wrap">
        <div>
          ${renderCanvas(page)}
          <div style="margin:6px 0;">
            <label>Background:
              <input type="text" value="${page.bg||''}" style="width:160px;" onchange="onBgChange(this.value)">
            </label>
            <button onclick="onPickBg()">Pick Image</button>
          </div>
        </div>
        <div>
          ${renderBlockSettings(page)}
          <div class="save-area">
            <button onclick="onSaveQuiz()">💾 Save Quiz</button>
            <button onclick="onExportQuiz()">⬇ Export JSON</button>
            <button onclick="onImportQuiz()">⬆ Import JSON</button>
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
}

// Opens a fresh admin/editor in a new tab for a new quiz
window.onNewQuizTab = function() {
  window.open(window.location.href, "_blank");
};

function renderCanvas(page) {
  if (!page) return `<div class="editor-canvas"></div>`;
  return `
    <div class="editor-canvas" id="editor-canvas" style="width:${CANVAS_W}px;height:${CANVAS_H}px;position:relative;">
      <img class="bg" src="${page.bg||''}" alt="bg">
      ${(page.blocks||[]).map((b,bi) => `
        <div class="text-block${bi===selectedBlockIdx?' selected':''}"
          style="
            left:${b.x}px;top:${b.y}px;
            width:${b.w}px;
            height:${b.h}px;
            font-size:${b.size}px;
            color:${b.color};
            text-align:${b.align||'left'};
            "
          data-idx="${bi}"
          tabindex="0"
          onclick="onSelectBlock(${bi});"
          >
          <span class="block-label">${b.label||b.type}</span>
          <div class="block-content" contenteditable="true"
            oninput="onBlockTextInput(${bi},this)"
            spellcheck="true"
            style="
              direction: ltr; 
              unicode-bidi: plaintext;
              writing-mode: horizontal-tb;
              font-size:inherit;color:inherit;
              text-align:${b.align||'left'};
              width:100%;min-height:24px;outline:none;background:transparent;border:none;
              overflow-wrap:break-word;white-space:pre-wrap;resize:none;display:block;vertical-align:top;padding:0;margin:0;max-height:none;overflow-y:auto;"
            >${b.text ? b.text.replace(/</g,"&lt;").replace(/\n/g,"<br>") : ""}</div>
          <div class="resize-handle" data-idx="${bi}" title="Resize"></div>
        </div>
      `).join('')}
    </div>
  `;
}

// ...rest of file unchanged (all your admin/editor logic stays the same)
// [No changes to: renderBlockSettings, all event/window handlers, etc.]

renderApp();
