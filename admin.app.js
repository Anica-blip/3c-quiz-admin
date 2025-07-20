// 3c-quiz-admin v9 - Title/Question/Answer are horizontal bars, height expands with font size AND text wrapping.
// Description/Result are square blocks, centered, stack vertically, no overlap, correct text input, correct alignment, remove always works.

const CANVAS_W = 360, CANVAS_H = 640;

// Block type configs: shape, default sizes, label, input rules
const BLOCK_TYPES = [
  { type: "title", label: "Title", text: "Your Title", color: "#222222", size: 28, align: "center", bar: true, maxlen: 200 },
  { type: "desc", label: "Description", text: "Description...", color: "#444444", size: 17, align: "left", bar: false, maxlen: 1000 },
  { type: "question", label: "Question", text: "Question text?", color: "#222222", size: 18, align: "left", bar: true, maxlen: 200 },
  { type: "answer", label: "Answer", text: "Answer option", color: "#003366", size: 16, align: "left", bar: true, maxlen: 200 },
  { type: "result", label: "Result", text: "Result text...", color: "#1B5E20", size: 20, align: "center", bar: false, maxlen: 1000 }
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

// Smart image suggestion
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

// Placement logic: blocks stack vertically, centered, spacing 22px between blocks
function getNextBlockPosition(page, blockType, blockW, blockH) {
  const x = Math.round((CANVAS_W - blockW) / 2);
  let y = 40; // Title default
  if (page.blocks && page.blocks.length > 0) {
    const last = page.blocks[page.blocks.length - 1];
    y = last.y + last.h + 22;
  }
  // Clamp if too low
  if (y + blockH > CANVAS_H - 16) y = CANVAS_H - blockH - 16;
  return { x, y };
}

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
        <button onclick="onRemoveAllBlocks()" class="danger" style="margin-top:4px;">Remove All</button>
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
    <style>
      .editor-canvas { background:#e8e8f0; border-radius:16px; position:relative; box-shadow:0 2px 12px #0002; margin-bottom:12px; overflow:hidden;}
      .editor-canvas img.bg { position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;z-index:0;}
      .text-block { position:absolute;z-index:1;box-sizing:border-box;padding:0 12px;background:#fff8;border:2px solid #6cf3;border-radius:8px;transition:border-color .2s;}
      .text-block.selected { border-color:#2e8cff; background:#e6f0ffcc;}
      .block-label {font-weight:bold;font-size:0.85em;background:#fff3;color:#006bb3;border-radius:6px;padding:2px 10px 2px 3px;position:absolute;left:10px;top:-20px;}
      .block-remove {position:absolute;top:-18px;right:6px; background:#f33;color:#fff;border:none;border-radius:5px;cursor:pointer;padding:0 7px; font-size:1em;}
      .resize-handle {position:absolute;right:0;bottom:0;width:15px;height:15px;border-radius:3px;border:1px solid #66c; background:#fff;cursor:nwse-resize;}
      .sidebar { float:left; width:180px; background:#f7fafd; min-height:${CANVAS_H}px; border-right:1px solid #e2e2e2; box-sizing:border-box; padding:10px; }
      .mainpanel { margin-left:190px; min-width:400px; }
      .page-list ul {list-style:none;padding:0;margin:0;}
      .page-list li {margin-bottom:7px;display:flex;align-items:center;}
      .page-img-thumb {width:28px;height:28px;object-fit:cover;border-radius:6px;margin-right:5px;}
      .img-filename {font-size:0.9em;color:#777;}
      .block-settings label {display:block;margin:4px 0;}
      .save-area button {margin-right:8px;margin-top:8px;}
      .danger {background:#f33!important;color:#fff!important;}
      /* Bar blocks */
      .text-block.bar {height:auto;}
      /* Square blocks */
      .text-block.square {height:auto;}
    </style>
  `;
  setTimeout(attachCanvasEvents, 30);
}

function renderCanvas(page) {
  if (!page) return `<div class="editor-canvas"></div>`;
  return `
    <div class="editor-canvas" id="editor-canvas" style="width:${CANVAS_W}px;height:${CANVAS_H}px;position:relative;">
      <img class="bg" src="${page.bg||''}" alt="bg">
      ${(page.blocks||[]).map((b,bi) => `
        <div class="text-block ${b.bar?'bar':'square'}${bi===selectedBlockIdx?' selected':''}"
          style="
            left:${b.x}px;top:${b.y}px;
            width:${b.w}px;
            min-height:${b.h}px;
            font-size:${b.size}px;
            color:${b.color};
            text-align:${b.align||'left'};
            "
          data-idx="${bi}"
          tabindex="0"
          >
          <span class="block-label">${b.label||b.type}</span>
          <button class="block-remove" onclick="onRemoveBlock(${bi});event.stopPropagation();" title="Remove">&times;</button>
          <div class="block-content" contenteditable="true"
            oninput="onBlockTextInput(${bi},this)"
            spellcheck="false"
            style="
              font-size:inherit;color:inherit;
              text-align:${b.align||'left'};
              width:100%;min-height:24px;max-height:none;outline:none;background:transparent;border:none;
              overflow:visible;word-break:break-word;white-space:pre-wrap;resize:none;">
            ${(b.text||"").replace(/</g,"&lt;").replace(/\n/g,"<br>")}
          </div>
          <div class="resize-handle" data-idx="${bi}" title="Resize"></div>
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
      <button onclick="onRemoveBlock(${selectedBlockIdx})" class="danger" style="margin-left:10px;">Remove Block</button>
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
      <label>Width: 
        <input type="number" min="80" max="${CANVAS_W-16}" value="${b.w}" style="width:48px;"
          onchange="onBlockPos(${selectedBlockIdx},'w',this.value)">
      </label>
      <label>Height: 
        <input type="number" min="24" max="${CANVAS_H}" value="${b.h}" style="width:48px;"
          onchange="onBlockPos(${selectedBlockIdx},'h',this.value)">
      </label>
      <label>X: 
        <input type="number" min="0" max="${CANVAS_W-20}" value="${b.x}" style="width:48px;"
          onchange="onBlockPos(${selectedBlockIdx},'x',this.value)">
      </label>
      <label>Y: 
        <input type="number" min="0" max="${CANVAS_H-20}" value="${b.y}" style="width:48px;"
          onchange="onBlockPos(${selectedBlockIdx},'y',this.value)">
      </label>
      <label>Align:
        <select onchange="onBlockAlign(${selectedBlockIdx},this.value)">
          <option value="left" ${b.align==="left"?"selected":""}>Left</option>
          <option value="center" ${b.align==="center"?"selected":""}>Center</option>
        </select>
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
window.onSavePage = function() {
  saveQuizzes();
  alert("Page saved!");
}

// Block controls
window.onAddBlock = function(type) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let tpl = BLOCK_TYPES.find(b => b.type===type);
  page.blocks = page.blocks||[];

  // Sizing
  let blockW = tpl.bar ? CANVAS_W-48 : CANVAS_W-48;
  let blockH = tpl.bar ? tpl.size+26 : 120;
  if (type==="desc"||type==="result") blockH = 120;
  // Placement
  let pos = getNextBlockPosition(page, type, blockW, blockH);

  page.blocks.push({
    type,
    label: tpl.label,
    text: tpl.text,
    x: pos.x,
    y: pos.y,
    w: blockW,
    h: blockH,
    size: tpl.size,
    color: tpl.color,
    align: tpl.align,
    bar: tpl.bar,
    maxlen: tpl.maxlen
  });
  selectedBlockIdx = page.blocks.length-1;
  saveQuizzes();
  renderApp();
};
window.onRemoveBlock = function(idx) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  if (!page.blocks || idx<0 || idx>=page.blocks.length) return;
  page.blocks.splice(idx,1);
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
};
window.onRemoveAllBlocks = function() {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks = [];
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
};
window.onSelectBlock = function(idx) {
  selectedBlockIdx = idx;
  renderApp();
};
window.onBlockAlign = function(idx, val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let b = page.blocks[idx];
  b.align = val;
  saveQuizzes();
  renderApp();
};
window.onBlockTextInput = function(bi, el) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let b = page.blocks[bi];
  // Clean up pasted/typed HTML to text
  let text = el.innerText.replace(/\u200B/g, '');
  if (b.maxlen) text = text.slice(0, b.maxlen);
  b.text = text;
  // Autosize block height to fit content (multi-line)
  setTimeout(()=>{
    let canvas = document.getElementById("editor-canvas");
    if (!canvas) return;
    let blockEls = canvas.querySelectorAll('.text-block');
    let contentEl = blockEls[bi]?.querySelector('.block-content');
    if (contentEl) {
      contentEl.style.height = "auto";
      let box = contentEl.getBoundingClientRect();
      let h = Math.max(b.size+26, box.height+18);
      // For bars, never shrink below font size
      if (b.bar) h = Math.max(b.size+26, h);
      // For squares, never shrink below 90
      if (!b.bar) h = Math.max(90, h);
      b.h = Math.min(h, CANVAS_H-b.y);
      saveQuizzes();
      renderApp();
    }
  }, 10);
  saveQuizzes();
};
window.onBlockFontSize = function(bi, val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks[bi].size = parseInt(val)||18;
  saveQuizzes();
  renderApp();
};
window.onBlockColor = function(bi, val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks[bi].color = val;
  saveQuizzes();
  renderApp();
};
window.onBlockPos = function(bi, prop, val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks[bi][prop] = parseInt(val)||0;
  saveQuizzes();
  renderApp();
};

// Quiz controls
window.onNewQuiz = function() {
  quizzes.push(blankQuiz());
  currentQuizIdx = quizzes.length-1;
  selectedPageIdx = 0;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
};
window.onQuizTitleChange = function(val) {
  quizzes[currentQuizIdx].title = val;
  saveQuizzes();
};
// BG image
window.onBgChange = function(val) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.bg = val;
  saveQuizzes();
  renderApp();
};
window.onPickBg = function() {
  let val = prompt(`Enter background image filename (in static/):\nCurrent: ${quizzes[currentQuizIdx].pages[selectedPageIdx].bg}`);
  if (val) {
    quizzes[currentQuizIdx].pages[selectedPageIdx].bg = "static/" + val.replace(/^static\//,'');
    saveQuizzes(); renderApp();
  }
};
// Save/Export/Import
window.onSaveQuiz = function() {
  saveQuizzes();
  alert("Saved!");
};
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
};
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
};

// Dragging/resizing blocks
function attachCanvasEvents() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) return;
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let dragIdx = -1, resizing = false, startX, startY, startBlock = null;
  canvas.querySelectorAll('.text-block').forEach((blockEl, bi) => {
    // Drag anywhere in block except controls
    blockEl.onmousedown = e => {
      if (e.target.classList.contains('block-remove') ||
          e.target.classList.contains('block-content') ||
          e.target.classList.contains('resize-handle')) return;
      dragIdx = bi;
      resizing = false;
      startX = e.clientX;
      startY = e.clientY;
      startBlock = {...page.blocks[bi]};
      selectedBlockIdx = bi;
      document.body.style.userSelect = "none";
      e.preventDefault();
    };
    // Resize
    let resizeHandle = blockEl.querySelector('.resize-handle');
    if (resizeHandle) {
      resizeHandle.onmousedown = e => {
        dragIdx = bi;
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startBlock = {...page.blocks[bi]};
        document.body.style.userSelect = "none";
        e.stopPropagation();
        e.preventDefault();
      };
    }
  });
  // Mouse events
  window.onmousemove = e => {
    if (dragIdx===-1) return;
    let block = page.blocks[dragIdx];
    if (!block) return;
    if (resizing) {
      let dw = e.clientX-startX, dh = e.clientY-startY;
      block.w = Math.max(80, Math.min(CANVAS_W-16, startBlock.w+dw));
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
    dragIdx = -1;
    resizing = false;
    document.body.style.userSelect = "";
  };
}

if (quizzes.length===0) quizzes.push(blankQuiz());
if (quizzes[0].pages.length===0) quizzes[0].pages.push({ bg: "static/1.png", blocks: [] });
renderApp();
