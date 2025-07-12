// 3c-quiz-admin: Stable, crash-resistant drag/drop editor

const CANVAS_W = 360, CANVAS_H = 640;
const BLOCK_TYPES = [
  { type: "title", label: "Title", text: "Title goes here", color: "#222222", size: 24 },
  { type: "desc", label: "Description", text: "Description...", color: "#444444", size: 18 },
  { type: "question", label: "Question", text: "Question text?", color: "#222222", size: 18 },
  { type: "answer", label: "Answer", text: "Answer option", color: "#003366", size: 16 },
  { type: "result", label: "Result", text: "Result text...", color: "#1B5E20", size: 20 }
];

function blankQuiz() {
  return {
    id: "quiz.01",
    title: "New Quiz",
    pages: [
      { bg: "static/1.png", blocks: [] }
    ]
  };
}
function loadQuizzes() {
  let q = localStorage.getItem('3c-quiz-admin-quizzes-v2');
  if (!q) return [blankQuiz()];
  try {
    const arr = JSON.parse(q);
    if (!Array.isArray(arr) || arr.length === 0) return [blankQuiz()];
    return arr;
  } catch {
    return [blankQuiz()];
  }
}
function saveQuizzes() {
  localStorage.setItem('3c-quiz-admin-quizzes-v2', JSON.stringify(quizzes));
}
function suggestImageForPage(pages) {
  if (!pages.length) return "static/1.png";
  let last = pages[pages.length-1].bg || "";
  let match = last.match(/^static\/([a-zA-Z]*)(\d*|[a-z]*)\.png$/);
  if (!match) return "static/1.png";
  let [_, prefix, suffix] = match;
  if (/^\d+$/.test(suffix)) {
    let n = parseInt(suffix) + 1;
    return `static/${prefix}${n}.png`;
  } else if (/^[a-zA-Z]$/.test(suffix)) {
    let char = suffix.toLowerCase();
    let nextChar = String.fromCharCode(char.charCodeAt(0)+1);
    return `static/${prefix}${nextChar}.png`;
  } else if (/^\d+[a-zA-Z]$/.test(suffix)) {
    let num = suffix.match(/^(\d+)/)[1];
    let char = suffix.match(/[a-zA-Z]$/)[0];
    let nextChar = String.fromCharCode(char.charCodeAt(0)+1);
    return `static/${prefix}${num}${nextChar}.png`;
  }
  return "static/1.png";
}

// App state
let quizzes = loadQuizzes();
let currentQuizIdx = 0;
let selectedPageIdx = 0;
let selectedBlockIdx = -1;

// Render functions
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
          <button onclick="onMovePageUp()" ${selectedPageIdx===0?'disabled':''}>&uarr;</button>
          <button onclick="onMovePageDown()" ${selectedPageIdx===pages.length-1?'disabled':''}>&darr;</button>
        </div>
      </div>
      <div class="block-controls">
        <strong>Add Block</strong>
        ${BLOCK_TYPES.map(b => `
          <button onclick="onAddBlock('${b.type}')">${b.label}</button>
        `).join('')}
      </div>
    </div>
    <div class="mainpanel">
      <div class="header">
        <h1>3c-quiz-admin</h1>
        <button onclick="onNewQuiz()">New Quiz</button>
        <div style="flex:1"></div>
        <span><b>ID:</b> ${quiz.id}</span>
        <input type="text" value="${quiz.title}" style="margin-left:12px;width:180px;" onchange="onQuizTitleChange(this.value)">
      </div>
      <div style="margin-bottom:16px;">
        <button onclick="onPrevPage()" ${selectedPageIdx===0?'disabled':''}>&lt; Prev</button>
        <span style="margin:0 12px;">Page ${selectedPageIdx+1} / ${pages.length}</span>
        <button onclick="onNextPage()" ${selectedPageIdx===pages.length-1?'disabled':''}>Next &gt;</button>
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
            <button onclick="onSavePage()">💾 Save Page</button>
            <button onclick="onSaveQuiz()">💾 Save Quiz</button>
            <button onclick="onExportQuiz()">⬇ Export JSON</button>
            <button onclick="onImportQuiz()">⬆ Import JSON</button>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(attachCanvasEvents, 30);
}

function renderCanvas(page) {
  if (!page) return `<div class="editor-canvas"></div>`;
  return `
    <div class="editor-canvas" id="editor-canvas" style="width:${CANVAS_W}px;height:${CANVAS_H}px;">
      <img class="bg" src="${page.bg||''}" alt="bg">
      ${(page.blocks||[]).map((b,bi) => `
        <div class="text-block${bi===selectedBlockIdx?' selected':''}"
          style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;font-size:${b.size}px;color:${b.color};"
          data-idx="${bi}">
          <span class="block-label">${b.label||b.type}</span>
          <div class="block-content" contenteditable="true"
            oninput="onBlockTextInput(${bi},this.innerText)"
            spellcheck="false"
            style="font-size:inherit;color:inherit;width:100%;height:100%;">
            ${b.text.replace(/\n/g,"<br>")}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
function renderBlockSettings(page) {
  let b = (page.blocks||[])[selectedBlockIdx];
  if (!b) return `<div style="margin-top:20px;">Select a block to edit its settings here.</div>`;
  return `
    <div style="margin-bottom:8px;">
      <button onclick="onSelectBlock(${selectedBlockIdx})" style="font-weight:bold;">${b.label||b.type}</button>
      <button onclick="onRemoveBlock()" class="danger" style="margin-left:10px;">Remove Block</button>
    </div>
    <div class="block-settings">
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
  `;
}

// Page actions
window.onAddPage = function() {
  let quiz = quizzes[currentQuizIdx];
  let suggestion = suggestImageForPage(quiz.pages);
  quiz.pages.push({ bg: suggestion, blocks: [] });
  selectedPageIdx = quiz.pages.length-1;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onRemovePage = function(idx) {
  let quiz = quizzes[currentQuizIdx];
  if (quiz.pages.length <= 1) return;
  quiz.pages.splice(idx,1);
  if (selectedPageIdx >= quiz.pages.length) selectedPageIdx = quiz.pages.length-1;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onSelectPage = function(idx) {
  selectedPageIdx = idx;
  selectedBlockIdx = -1;
  renderApp();
}
window.onMovePageUp = function() {
  let quiz = quizzes[currentQuizIdx];
  if (selectedPageIdx === 0) return;
  [quiz.pages[selectedPageIdx-1], quiz.pages[selectedPageIdx]] = [quiz.pages[selectedPageIdx], quiz.pages[selectedPageIdx-1]];
  selectedPageIdx--;
  saveQuizzes();
  renderApp();
}
window.onMovePageDown = function() {
  let quiz = quizzes[currentQuizIdx];
  if (selectedPageIdx >= quiz.pages.length-1) return;
  [quiz.pages[selectedPageIdx+1], quiz.pages[selectedPageIdx]] = [quiz.pages[selectedPageIdx], quiz.pages[selectedPageIdx+1]];
  selectedPageIdx++;
  saveQuizzes();
  renderApp();
}
window.onPrevPage = function() {
  if (selectedPageIdx > 0) {
    selectedPageIdx--; selectedBlockIdx = -1; renderApp();
  }
}
window.onNextPage = function() {
  let quiz = quizzes[currentQuizIdx];
  if (selectedPageIdx < quiz.pages.length-1) {
    selectedPageIdx++; selectedBlockIdx = -1; renderApp();
  }
}

// Block controls
window.onAddBlock = function(type) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let tpl = BLOCK_TYPES.find(b => b.type===type);
  const blockCount = (page.blocks||[]).length;
  page.blocks = page.blocks||[];
  page.blocks.push({
    type,
    label: tpl.label,
    text: tpl.text,
    x: 60+blockCount*10,
    y: 90+blockCount*30,
    w: 240,
    h: 38,
    size: tpl.size,
    color: tpl.color
  });
  selectedBlockIdx = page.blocks.length-1;
  saveQuizzes();
  renderApp();
}
window.onRemoveBlock = function() {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  if (selectedBlockIdx===-1) return;
  page.blocks.splice(selectedBlockIdx,1);
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onSelectBlock = function(idx) {
  selectedBlockIdx = idx;
  renderApp();
}

window.onBlockTextInput = function(bi, val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks[bi].text = val;
  saveQuizzes();
}
window.onBlockFontSize = function(bi, val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks[bi].size = parseInt(val)||18;
  saveQuizzes();
  renderApp();
}
window.onBlockColor = function(bi, val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks[bi].color = val;
  saveQuizzes();
  renderApp();
}
window.onBlockPos = function(bi, prop, val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks[bi][prop] = parseInt(val)||0;
  saveQuizzes();
  renderApp();
}

// Quiz controls
window.onNewQuiz = function() {
  quizzes.push(blankQuiz());
  currentQuizIdx = quizzes.length-1;
  selectedPageIdx = 0;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onQuizTitleChange = function(val) {
  quizzes[currentQuizIdx].title = val;
  saveQuizzes();
}
// BG image
window.onBgChange = function(val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.bg = val;
  saveQuizzes();
  renderApp();
}
window.onPickBg = function() {
  let val = prompt(`Enter background image filename (in static/):\nCurrent: ${quizzes[currentQuizIdx].pages[selectedPageIdx].bg}`);
  if (val) {
    quizzes[currentQuizIdx].pages[selectedPageIdx].bg = "static/" + val.replace(/^static\//,'');
    saveQuizzes(); renderApp();
  }
}

// Save/Export/Import
window.onSaveQuiz = function() {
  saveQuizzes();
  alert("Saved!");
}
window.onSavePage = function() {
  saveQuizzes();
  alert("Page saved!");
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
          selectedPageIdx = 0;
          selectedBlockIdx = -1;
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

// Dragging/resizing blocks
function attachCanvasEvents() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) return;
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let dragging = false, resizing = false, dragIdx = -1;
  let startX, startY, startBlock = null;
  canvas.querySelectorAll('.text-block').forEach((blockEl, bi) => {
    blockEl.onmousedown = e => {
      if (e.target.classList.contains('block-content')) return;
      const rect = blockEl.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      resizing = (offsetX > blockEl.offsetWidth-18 && offsetY > blockEl.offsetHeight-18);
      dragging = true;
      dragIdx = bi;
      startX = e.clientX;
      startY = e.clientY;
      startBlock = {...page.blocks[bi]};
      selectedBlockIdx = bi;
      renderApp();
      e.preventDefault();
    };
  });
  window.onmousemove = e => {
    if (!dragging || dragIdx===-1) return;
    let block = page.blocks[dragIdx];
    if (!block) return;
    if (resizing) {
      let dw = e.clientX-startX, dh = e.clientY-startY;
      block.w = Math.max(24, startBlock.w+dw);
      block.h = Math.max(24, startBlock.h+dh);
    } else {
      let dx = e.clientX-startX, dy = e.clientY-startY;
      block.x = Math.max(0, Math.min(CANVAS_W-block.w, startBlock.x+dx));
      block.y = Math.max(0, Math.min(CANVAS_H-block.h, startBlock.y+dy));
    }
    saveQuizzes();
    renderApp();
  };
  window.onmouseup = e => {
    dragging = false; resizing = false; dragIdx = -1;
    document.body.style.userSelect = "";
  };
}

renderApp();
