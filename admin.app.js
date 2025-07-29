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

let quizzes = [];
let supabaseQuizzes = [];
let currentQuizIdx = 0;
let selectedPageIdx = 0;
let selectedBlockIdx = -1;

function blankQuiz() {
  return {
    id: "",
    title: "New Quiz",
    pages: []
  };
}

// Fetch quizzes from Supabase for archive/list/numbering
async function fetchSupabaseQuizzes() {
  const { data, error } = await supabaseClient
    .from('quizzes')
    .select('quiz_slug, title');
  supabaseQuizzes = data || [];
  return supabaseQuizzes;
}

// Load quizzes from localStorage (legacy, for compatibility)
function loadLocalQuizzes() {
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

// Generate new quiz ID based on Supabase data to avoid duplicates
async function newQuizId() {
  await fetchSupabaseQuizzes();
  const used = supabaseQuizzes.map(q => {
    let m = q.quiz_slug.match(/^quiz\.(\d+)$/);
    return m ? parseInt(m[1]) : null;
  }).filter(n => n !== null);
  let n = 1;
  while (used.includes(n)) n++;
  return `quiz.${String(n).padStart(2,'0')}`;
}

// Render quiz archive table from Supabase data
async function renderQuizArchive() {
  await fetchSupabaseQuizzes();
  if (!supabaseQuizzes.length) return `<div>No quizzes found in Supabase.</div>`;
  return `
    <div style="margin-top:30px;">
      <h2>Quiz Archive</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th>Quiz #</th>
            <th>Title</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
        ${supabaseQuizzes.map(q => `
          <tr>
            <td>${q.quiz_slug}</td>
            <td>${q.title || ''}</td>
            <td>
              <input type="text" value="https://anica-blip.github.io/3c-quiz/${q.quiz_slug}" readonly style="width:80%;">
              <button onclick="navigator.clipboard.writeText('https://anica-blip.github.io/3c-quiz/${q.quiz_slug}')">Copy</button>
              <a href="https://anica-blip.github.io/3c-quiz/${q.quiz_slug}" target="_blank">Open</a>
            </td>
          </tr>
        `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ========== UI/Editor Logic ==========

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

function renderBlockSettings(page) {
  let b = (page.blocks||[])[selectedBlockIdx];
  if (!b) return `<div style="margin-top:20px;">Select a block to edit its settings here.</div>`;
  return `
    <div style="margin-bottom:8px;">
      <button onclick="onSelectBlock(${selectedBlockIdx})" style="font-weight:bold;">${b.label||b.type}</button>
    </div>
    <div class="block-settings">
      <div style="font-size:1em;">
        <b>W</b>: ${b.w} &times; <b>H</b>: ${b.h}<br>
        <b>X</b>: ${b.x} &times; <b>Y</b>: ${b.y}
      </div>
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

// Main render function, now async for archive
async function renderApp() {
  try {
    const app = document.getElementById('app');
    if (!app) throw new Error("App container not found!");
    const quiz = quizzes[currentQuizIdx] || blankQuiz();
    const pages = quiz.pages || [];
    const page = pages[selectedPageIdx] || {};

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
      <div id="quiz-archive-wrap"></div>
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

    // Render quiz archive
    const archiveDiv = document.getElementById('quiz-archive-wrap');
    if (archiveDiv) archiveDiv.innerHTML = await renderQuizArchive();
  } catch(e) {
    showFatalError("Render error: " + e.message);
  }
}

// ========== Block/Page/Quiz Control Logic ==========

window.onAddAnswerBlock = function(letter) {
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
window.onRemoveBlockSidebar = function() {
  if (selectedBlockIdx < 0) return;
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  page.blocks.splice(selectedBlockIdx,1);
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
};
window.onAddBlock = function(type) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let tpl = BLOCK_TYPES.find(b => b.type===type);
  if (!tpl) return;
  page.blocks = page.blocks||[];
  page.blocks.push({
    type: tpl.type,
    label: tpl.label,
    text: "",
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

window.onSaveQuiz = async function() {
  const statusDiv = document.getElementById("supabase-status");
  if (statusDiv) statusDiv.textContent = '';
  let qz = quizzes[currentQuizIdx];

  let quiz_slug = qz.id;
  let quiz_url = `https://anica-blip.github.io/3c-quiz/${quiz_slug}`;
  let dbQuiz = {
    quiz_slug,
    quiz_url,
    title: qz.title,
    pages: qz.pages // store all quiz pages/blocks here, as JSON
  };

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
    await renderApp(); // Refresh archive after save
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

window.onSelectPage = function(idx) {
  selectedPageIdx = idx;
  selectedBlockIdx = -1;
  renderApp();
};
window.onMovePageUpSingle = function(idx) {
  if (idx <= 0) return;
  let quiz = quizzes[currentQuizIdx];
  let pages = quiz.pages;
  [pages[idx-1], pages[idx]] = [pages[idx], pages[idx-1]];
  selectedPageIdx = idx-1;
  saveQuizzes();
  renderApp();
};
window.onMovePageDownSingle = function(idx) {
  let quiz = quizzes[currentQuizIdx];
  let pages = quiz.pages;
  if (idx >= pages.length-1) return;
  [pages[idx+1], pages[idx]] = [pages[idx], pages[idx+1]];
  selectedPageIdx = idx+1;
  saveQuizzes();
  renderApp();
};
window.onRemovePage = function(idx) {
  let quiz = quizzes[currentQuizIdx];
  quiz.pages.splice(idx, 1);
  if (selectedPageIdx >= quiz.pages.length) selectedPageIdx = quiz.pages.length-1;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
};
window.onAddPage = function() {
  let quiz = quizzes[currentQuizIdx];
  quiz.pages = quiz.pages || [];
  quiz.pages.push({ bg: "", blocks: [] });
  selectedPageIdx = quiz.pages.length-1;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
};
window.onDuplicatePage = function() {
  let quiz = quizzes[currentQuizIdx];
  let page = quiz.pages[selectedPageIdx];
  if (!page) return;
  let copy = JSON.parse(JSON.stringify(page));
  quiz.pages.splice(selectedPageIdx+1, 0, copy);
  selectedPageIdx = selectedPageIdx+1;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
};
window.onNewQuizTab = async function() {
  // Generate a new quiz ID based on Supabase to avoid collision
  const id = await newQuizId();
  const newQuiz = Object.assign(blankQuiz(), {id});
  quizzes.push(newQuiz);
  currentQuizIdx = quizzes.length-1;
  selectedPageIdx = 0;
  selectedBlockIdx = -1;
  saveQuizzes();
  renderApp();
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
    quizzes[currentQuizIdx].pages[selectedPageIdx].bg = val.startsWith('static/') ? val : "static/" + val.replace(/^static\//,'');
    saveQuizzes();
    renderApp();
  }
};

// ========== Initialization ==========

(async function init() {
  quizzes = loadLocalQuizzes();
  if (quizzes.length === 0) {
    const id = await newQuizId();
    quizzes.push(Object.assign(blankQuiz(), {id}));
  }
  await renderApp();
})();

    } catch(e) {
      showFatalError(e.message || e);
    }
  });

})();
