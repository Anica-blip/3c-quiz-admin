const CANVAS_W = 360, CANVAS_H = 640;

const BLOCK_TYPES = [
  { type: "title", label: "Title", w: 275, h: 55, x: 42, y: 231, size: 18, align: "left", color: "#222222", maxlen: 200 },
  { type: "desc", label: "Description", w: 275, h: 256, x: 42, y: 294, size: 16, align: "left", color: "#444444", maxlen: 1000 },
  { type: "question", label: "Question", w: 294, h: 55, x: 31, y: 109, size: 18, align: "left", color: "#222222", maxlen: 200 }
];

const SUPABASE_URL = 'https://cgxjqsbrditbteqhdyus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4';
const SUPABASE_TABLE = 'quizzes';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
            <li style="display:flex;align-items:center;gap:5px;">
              <button class="${i===selectedPageIdx?'active':''}" onclick="onSelectPage(${i})">
                <img class="page-img-thumb" src="${p.bg || ''}" alt="">
                <span class="img-filename">${(p.bg||'').replace('static/','')}</span>
              </button>
              <button onclick="onRemovePage(${i})" class="danger" style="font-size:0.95em;padding:2px 7px;">✕</button>
              <button onclick="onMovePageUpSingle(${i})" ${i===0?'disabled':''} title="Move Up" style="padding:2px 5px;font-size:1em;">⬆️</button>
              <button onclick="onMovePageDownSingle(${i})" ${i===pages.length-1?'disabled':''} title="Move Down" style="padding:2px 5px;font-size:1em;">⬇️</button>
            </li>
          `).join('')}
        </ul>
        <div class="page-actions">
          <button onclick="onAddPage()">+ Add Page</button>
          <button onclick="onDuplicatePage()">Duplicate Page</button>
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
}

// "Answer A"-"Answer D" block adders
window.onAddAnswerBlock = function(letter) {
  // You can update these coords later!
  let coords = {
    "A": { x: 31, y: 216 },
    "B": { x: 31, y: 286 },
    "C": { x: 31, y: 356 },
    "D": { x: 31, y: 426 }
  };
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks = page.blocks || [];
  page.blocks.push({
    type: "answer",
    label: `Answer ${letter}`,
    resultType: letter,
    text: "",
    x: coords[letter].x, y: coords[letter].y,
    w: 294, h: 55,
    size: 16,
    color: "#003366",
    align: "left",
    maxlen: 200
  });
  selectedBlockIdx = page.blocks.length-1;
  saveQuizzes();
  renderApp();
};

// The rest of your unchanged block controls:
window.onRemoveBlockSidebar = function() {
  if (selectedBlockIdx < 0) return;
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks.splice(selectedBlockIdx,1);
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
};
window.onAddPage = function() {
  let quiz = quizzes[currentQuizIdx];
  quiz.pages.push({ bg: "static/2.png", blocks: [] });
  selectedPageIdx = quiz.pages.length-1;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
}
window.onDuplicatePage = function() {
  let quiz = quizzes[currentQuizIdx];
  let currentPage = quiz.pages[selectedPageIdx];
  let newPage = {
    bg: currentPage.bg,
    blocks: currentPage.blocks.map(b => ({...b}))
  };
  quiz.pages.push(newPage);
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

window.onAddBlock = function(type) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let tpl = BLOCK_TYPES.find(b => b.type===type);
  if (!tpl) return;
  page.blocks = page.blocks||[];
  page.blocks.push({
    type: tpl.type,
    label: tpl.label,
    text: "", // Empty so you can always type
    x: tpl.x, y: tpl.y,
    w: tpl.w, h: tpl.h,
    size: tpl.size,
    color: tpl.color,
    align: tpl.align,
    maxlen: tpl.maxlen
  });
  selectedBlockIdx = page.blocks.length-1;
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
  // Get plain text (not innerHTML) so delete/backspace/paste works
  let text = el.innerText.replace(/\u200B/g, '');
  if (b.maxlen) text = text.slice(0, b.maxlen);
  b.text = text;
  setTimeout(()=>{
    let canvas = document.getElementById("editor-canvas");
    if (!canvas) return;
    let blockEls = canvas.querySelectorAll('.text-block');
    let contentEl = blockEls[bi]?.querySelector('.block-content');
    if (contentEl) {
      contentEl.style.height = "auto";
      let box = contentEl.getBoundingClientRect();
      let h = Math.max(b.h, box.height + 8);
      b.h = Math.min(h, CANVAS_H - b.y);
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

window.onQuizTitleChange = function(val) {
  quizzes[currentQuizIdx].title = val;
  saveQuizzes();
};
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

// Supabase save logic
window.onSaveQuiz = async function() {
  const statusDiv = document.getElementById("supabase-status");
  if (statusDiv) statusDiv.textContent = '';
  let qz = quizzes[currentQuizIdx];

  // Build quiz_slug and quiz_url
  let quiz_slug = qz.id;
  let quiz_url = `https://anica-blip.github.io/3c-quiz/${quiz_slug}`;

  // Only text/blocks for app! NO backgrounds.
  let pagesForSave = qz.pages.map(p => ({
    blocks: (p.blocks||[]).map(b => {
      let block = {
        type: b.type,
        label: b.label,
        text: b.text,
        x: b.x, y: b.y,
        w: b.w, h: b.h,
        size: b.size,
        color: b.color,
        align: b.align,
        maxlen: b.maxlen
      };
      if (b.type === "answer") block.resultType = b.resultType;
      return block;
    })
  }));

  let dbQuiz = {
    quiz_slug,
    quiz_url,
    title: qz.title,
    pages: pagesForSave
  };

  if (!supabaseClient) {
    alert("Supabase client not loaded yet, please wait and try again.");
    return;
  }

  let { error } = await supabaseClient
    .from(SUPABASE_TABLE)
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

function attachCanvasEvents() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) return;
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let dragIdx = -1, resizing = false, startX, startY, startBlock = null;
  canvas.querySelectorAll('.text-block').forEach((blockEl, bi) => {
    blockEl.onmousedown = e => {
      if (e.target.classList.contains('block-label') ||
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

renderApp();
