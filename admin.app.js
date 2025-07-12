// ========== 3c-quiz-admin: Minimal Drag/Drop Quiz Editor ==========

const CANVAS_W = 360, CANVAS_H = 640;
const QUIZ_PAGE_TYPES = [
  { key: "cover", label: "Cover" },
  { key: "questions", label: "Questions" },
  { key: "results", label: "Results" }
];
// Define default text blocks for each page type
const BLOCK_TEMPLATES = {
  cover: [
    { type: "title", label: "Title", text: "Quiz Title", x: 30, y: 150, w: 300, h: 50, size: 24, color: "#222222" },
    { type: "desc", label: "Description", text: "Quiz description paragraph...", x: 30, y: 210, w: 300, h: 80, size: 18, color: "#444444" }
  ],
  questions: [
    { type: "question", label: "Question", text: "What is your question?", x: 24, y: 110, w: 310, h: 44, size: 18, color: "#222222" },
    { type: "answerA", label: "Answer A", text: "Answer option A", x: 24, y: 180, w: 310, h: 38, size: 16, color: "#003366" },
    { type: "answerB", label: "Answer B", text: "Answer option B", x: 24, y: 230, w: 310, h: 38, size: 16, color: "#003366" },
    { type: "answerC", label: "Answer C", text: "Answer option C", x: 24, y: 280, w: 310, h: 38, size: 16, color: "#003366" },
    { type: "answerD", label: "Answer D", text: "Answer option D", x: 24, y: 330, w: 310, h: 38, size: 16, color: "#003366" }
  ],
  results: [
    { type: "resultTitle", label: "Result Title", text: "You got A!", x: 30, y: 180, w: 300, h: 44, size: 24, color: "#1B5E20" },
    { type: "resultDesc", label: "Result Desc", text: "Result description goes here...", x: 30, y: 240, w: 300, h: 80, size: 18, color: "#2E7D32" }
  ]
};

let quizzes = loadQuizzes();
let currentQuizIdx = 0;
let currentPageType = 'cover';
let currentPageIdx = 0;
let selectedBlockIdx = -1;

function loadQuizzes() {
  let q = localStorage.getItem('3c-quiz-admin-quizzes');
  if (!q) return [];
  try { return JSON.parse(q); } catch { return []; }
}
function saveQuizzes() {
  localStorage.setItem('3c-quiz-admin-quizzes', JSON.stringify(quizzes));
}

function blankQuiz() {
  // Default quiz with 5 questions and 4 results
  return {
    id: nextQuizId(),
    title: "New Quiz",
    pages: {
      cover: [{ bg: "static/cover.png", blocks: JSON.parse(JSON.stringify(BLOCK_TEMPLATES.cover)) }],
      questions: Array.from({length: 5}).map((_,i) => ({
        bg: `static/${i+1}.png`,
        blocks: JSON.parse(JSON.stringify(BLOCK_TEMPLATES.questions))
      })),
      results: Array.from({length: 4}).map((_,i) => ({
        bg: `static/${["a","b","c","d"][i]}.png`,
        blocks: JSON.parse(JSON.stringify(BLOCK_TEMPLATES.results))
      }))
    }
  }
}
function nextQuizId() {
  let ids = quizzes.map(q => parseInt(q.id.replace("quiz.",""))).sort((a,b)=>a-b);
  for(let i=1;i<=999;i++) {
    if(!ids.includes(i)) return `quiz.${String(i).padStart(2,"0")}`;
  }
  return `quiz.${String(ids.length+1).padStart(2,"0")}`;
}

function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="header">
      <h1>3c-quiz-admin</h1>
      <button onclick="onNewQuiz()">New Quiz</button>
    </div>
    <div class="quiz-list">
      <strong>Quizzes:</strong>
      <ul>
        ${quizzes.map((q,i) => `
          <li>
            <button onclick="onSelectQuiz(${i})"${i===currentQuizIdx?' style="font-weight:bold;"':''}>${q.id}</button>
            <button onclick="onDeleteQuiz(${i})" class="danger">Delete</button>
          </li>
        `).join('')}
      </ul>
    </div>
    <div>
      <strong>Edit Quiz:</strong> ${quizzes[currentQuizIdx]?.id || ''}
      <input type="text" value="${quizzes[currentQuizIdx]?.title||''}" style="margin-left:16px;width:160px;" 
        onchange="onQuizTitleChange(this.value)">
    </div>
    <div style="margin:14px 0;">
      ${QUIZ_PAGE_TYPES.map(pt => `
        <button onclick="onSelectPageType('${pt.key}')"${pt.key===currentPageType?' style="font-weight:bold;"':''}>${pt.label}</button>
      `).join('')}
      &nbsp;
      <button onclick="onPrevPage()" ${currentPageIdx===0?'disabled':''}>&lt; Prev</button>
      <span> Page ${currentPageIdx+1} / ${getPages().length} </span>
      <button onclick="onNextPage()" ${currentPageIdx===getPages().length-1?'disabled':''}>Next &gt;</button>
      &nbsp;
      <button onclick="onAddPage()" ${currentPageType==="cover"||getPages().length>=8?'disabled':''}>Add Page</button>
      <button onclick="onRemovePage()" ${getPages().length<=1?'disabled':''}>Remove Page</button>
    </div>
    <div class="editor-canvas-wrap">
      <div>
        ${renderCanvas()}
      </div>
      <div>
        ${renderBlockControls()}
        <div class="save-area">
          <button onclick="onSaveQuiz()">💾 Save Quiz</button>
          <button onclick="onExportQuiz()">⬇ Export JSON</button>
          <button onclick="onImportQuiz()">⬆ Import JSON</button>
        </div>
      </div>
    </div>
  `;
  window.setTimeout(attachCanvasEvents, 10);
}
function getPages() {
  let qz = quizzes[currentQuizIdx];
  if (!qz) return [];
  return qz.pages[currentPageType] || [];
}
function getPage() {
  return getPages()[currentPageIdx];
}
function renderCanvas() {
  let page = getPage();
  if (!page) return `<div class="editor-canvas"></div>`;
  return `
    <div class="editor-canvas" id="editor-canvas" style="width:${CANVAS_W}px;height:${CANVAS_H}px;">
      <img class="bg" src="${page.bg}" alt="bg">
      ${page.blocks.map((b,bi) => `
        <div class="text-block${bi===selectedBlockIdx?' selected':''}" 
          style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;font-size:${b.size}px;color:${b.color};"
          data-idx="${bi}">
          <span class="block-label">${b.label}</span>
          <div class="block-content" contenteditable="true" 
            oninput="onBlockTextInput(${bi},this.innerText)"
            spellcheck="false"
            style="font-size:inherit;color:inherit;width:100%;height:100%;">
            ${b.text.replace(/\n/g,"<br>")}
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin:6px 0;">
      <label>Background: 
        <input type="text" value="${page.bg}" style="width:160px;" 
          onchange="onBgChange(this.value)">
      </label>
      <button onclick="onPickBg()">Pick Image</button>
    </div>
  `;
}
function renderBlockControls() {
  let page = getPage();
  if (!page) return "";
  let b = page.blocks[selectedBlockIdx];
  return `
    <div style="margin-bottom:8px;">${page.blocks.map((block,bi) => `
      <button onclick="onSelectBlock(${bi})"${selectedBlockIdx===bi?' style="font-weight:bold;"':''}>
        ${block.label}
      </button>
    `).join('')}
      <button onclick="onAddBlock()">+ Add Block</button>
      <button onclick="onRemoveBlock()" ${selectedBlockIdx===-1?'disabled':''}>Remove Block</button>
    </div>
    ${b ? `
      <div class="block-controls">
        <label>Font Size: 
          <input type="number" min="10" max="64" value="${b.size}" style="width:48px;"
            onchange="onBlockFontSize(${selectedBlockIdx},this.value)">
        </label>
        <label>Color: 
          <input type="color" value="${b.color}"
            onchange="onBlockColor(${selectedBlockIdx},this.value)">
        </label>
        <label>X: 
          <input type="number" min="0" max="${CANVAS_W-20}" value="${b.x}" style="width:48px;"
            onchange="onBlockPos(${selectedBlockIdx},'x',this.value)">
        </label>
        <label>Y: 
          <input type="number" min="0" max="${CANVAS_H-20}" value="${b.y}" style="width:48px;"
            onchange="onBlockPos(${selectedBlockIdx},'y',this.value)">
        </label>
        <label>W: 
          <input type="number" min="24" max="${CANVAS_W}" value="${b.w}" style="width:48px;"
            onchange="onBlockPos(${selectedBlockIdx},'w',this.value)">
        </label>
        <label>H: 
          <input type="number" min="24" max="${CANVAS_H}" value="${b.h}" style="width:48px;"
            onchange="onBlockPos(${selectedBlockIdx},'h',this.value)">
        </label>
      </div>
    ` : ""}
  `;
}

// -- Event handlers --
window.onNewQuiz = function() {
  quizzes.push(blankQuiz());
  currentQuizIdx = quizzes.length-1;
  currentPageType = "cover";
  currentPageIdx = 0;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onSelectQuiz = function(idx) {
  currentQuizIdx = idx;
  currentPageType = "cover";
  currentPageIdx = 0;
  selectedBlockIdx = -1;
  renderApp();
}
window.onDeleteQuiz = function(idx) {
  if (!confirm("Delete this quiz?")) return;
  quizzes.splice(idx,1);
  if (currentQuizIdx >= quizzes.length) currentQuizIdx = quizzes.length-1;
  saveQuizzes();
  renderApp();
}
window.onQuizTitleChange = function(val) {
  quizzes[currentQuizIdx].title = val;
  saveQuizzes();
}
window.onSelectPageType = function(type) {
  currentPageType = type;
  currentPageIdx = 0;
  selectedBlockIdx = -1;
  renderApp();
}
window.onPrevPage = function() {
  if (currentPageIdx > 0) {
    currentPageIdx--; selectedBlockIdx = -1; renderApp();
  }
}
window.onNextPage = function() {
  if (currentPageIdx < getPages().length-1) {
    currentPageIdx++; selectedBlockIdx = -1; renderApp();
  }
}
window.onAddPage = function() {
  let qz = quizzes[currentQuizIdx];
  if (!qz) return;
  let key = currentPageType;
  let arr = qz.pages[key];
  let n = arr.length+1;
  let bg = key==="questions" ? `static/${n}.png`
        : key==="results" ? `static/${["a","b","c","d","e","f","g","h"][n-1]}.png`
        : "";
  arr.push({ bg: bg, blocks: JSON.parse(JSON.stringify(BLOCK_TEMPLATES[key])) });
  currentPageIdx = arr.length-1;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onRemovePage = function() {
  let arr = getPages();
  if (arr.length <= 1) return;
  arr.splice(currentPageIdx, 1);
  if (currentPageIdx >= arr.length) currentPageIdx = arr.length-1;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onBgChange = function(val) {
  getPage().bg = val;
  saveQuizzes();
  renderApp();
}
window.onPickBg = function() {
  let imgs = Array.from(document.querySelectorAll('.bg')).map(img => img.src);
  let files = Array.from(document.querySelectorAll('img.bg')).map(i => i.src.split('/').pop());
  let val = prompt(`Enter background image filename (in static/):\nCurrent: ${getPage().bg}\nAvailable: ${files.join(", ")}`);
  if (val) { getPage().bg = "static/" + val.replace(/^static\//,''); saveQuizzes(); renderApp(); }
}
window.onSelectBlock = function(idx) {
  selectedBlockIdx = idx;
  renderApp();
}
window.onAddBlock = function() {
  let pg = getPage(), t = currentPageType;
  pg.blocks.push({
    type: `custom${pg.blocks.length+1}`,
    label: `Block ${pg.blocks.length+1}`,
    text: "New text block",
    x: 60, y: 80+pg.blocks.length*30, w: 220, h: 32, size: 18, color: "#444444"
  });
  selectedBlockIdx = pg.blocks.length-1;
  saveQuizzes();
  renderApp();
}
window.onRemoveBlock = function() {
  let pg = getPage();
  if (selectedBlockIdx===-1) return;
  pg.blocks.splice(selectedBlockIdx,1);
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onBlockTextInput = function(bi, val) {
  let pg = getPage();
  pg.blocks[bi].text = val;
  saveQuizzes();
}
window.onBlockFontSize = function(bi, val) {
  let pg = getPage();
  pg.blocks[bi].size = parseInt(val)||18;
  saveQuizzes();
  renderApp();
}
window.onBlockColor = function(bi, val) {
  let pg = getPage();
  pg.blocks[bi].color = val;
  saveQuizzes();
  renderApp();
}
window.onBlockPos = function(bi, prop, val) {
  let pg = getPage();
  pg.blocks[bi][prop] = parseInt(val)||0;
  saveQuizzes();
  renderApp();
}
window.onSaveQuiz = function() {
  saveQuizzes();
  alert("Saved!");
}
window.onExportQuiz = function() {
  let qz = quizzes[currentQuizIdx];
  let data = JSON.stringify(qz, null, 2);
  let blob = new Blob([data], {type: "application/json"});
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = `${qz.id}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}
window.onImportQuiz = function() {
  let inp = document.createElement("input");
  inp.type = "file";
  inp.accept = ".json,application/json";
  inp.onchange = e => {
    let file = inp.files[0];
    let reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let data = JSON.parse(ev.target.result);
        if (data && data.id && data.pages) {
          quizzes.push(data);
          currentQuizIdx = quizzes.length-1;
          saveQuizzes();
          renderApp();
        } else {
          alert("Invalid quiz file.");
        }
      } catch {
        alert("Import failed.");
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}

// -- Dragging/resizing blocks --
function attachCanvasEvents() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) return;
  let dragIdx = -1, startX, startY, startBlock = null, resizing = false;
  canvas.querySelectorAll('.text-block').forEach((block,bi) => {
    block.onmousedown = e => {
      if (e.target.classList.contains('block-content')) return;
      dragIdx = bi;
      startX = e.clientX; startY = e.clientY;
      startBlock = Object.assign({}, getPage().blocks[bi]);
      resizing = (e.offsetX > block.offsetWidth-16 && e.offsetY > block.offsetHeight-16);
      document.body.style.userSelect = "none";
      selectedBlockIdx = bi;
      renderApp();
    };
  });
  window.onmousemove = e => {
    if (dragIdx===-1) return;
    let pg = getPage();
    let b = pg.blocks[dragIdx];
    if (!b) return;
    if (resizing) {
      let dw = e.clientX-startX, dh = e.clientY-startY;
      b.w = Math.max(24, startBlock.w+dw);
      b.h = Math.max(24, startBlock.h+dh);
    } else {
      let dx = e.clientX-startX, dy = e.clientY-startY;
      b.x = Math.max(0, Math.min(CANVAS_W-b.w, startBlock.x+dx));
      b.y = Math.max(0, Math.min(CANVAS_H-b.h, startBlock.y+dy));
    }
    saveQuizzes();
    renderApp();
  };
  window.onmouseup = e => {
    dragIdx = -1;
    document.body.style.userSelect = "";
  };
}

// --- Initial render ---
if (quizzes.length===0) {
  quizzes.push(blankQuiz());
}
renderApp();

