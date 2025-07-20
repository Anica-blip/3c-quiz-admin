const CANVAS_W = 360, CANVAS_H = 640;

const BLOCK_TYPES = [
  { type: "title", label: "Title", w: 275, h: 55, x: 42, y: 231, size: 18, align: "left", color: "#222222", maxlen: 200 },
  { type: "desc", label: "Description", w: 275, h: 256, x: 42, y: 294, size: 16, align: "left", color: "#444444", maxlen: 1000 },
  { type: "question", label: "Question", w: 294, h: 24, x: 31, y: 109, size: 18, align: "left", color: "#222222", maxlen: 200 },
  { type: "answer", label: "Answer", w: 294, h: 24, x: 31, y: 216, size: 16, align: "left", color: "#003366", maxlen: 200 }
];

function blankQuiz() {
  return {
    id: "quiz.01",
    title: "New Quiz",
    pages: [
      { bg: "static/2.png", blocks: [] }
    ]
  };
}
function loadQuizzes() {
  let q = localStorage.getItem('3c-quiz-admin-quizzes-v3');
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
  localStorage.setItem('3c-quiz-admin-quizzes-v3', JSON.stringify(quizzes));
}

let quizzes = loadQuizzes();
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
    <div class="mainpanel">
      <div class="header">
        <h1>3c-quiz-admin</h1>
      </div>
      <div class="editor-canvas-wrap">
        <div>
          ${renderCanvas(page)}
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
          <div class="block-content" contenteditable="true" dir="ltr"
            oninput="onBlockTextInput(${bi},this)"
            spellcheck="true"
            style="direction:ltr; unicode-bidi:plaintext; font-size:inherit;color:inherit; text-align:${b.align||'left'}; width:100%;min-height:24px;outline:none;background:transparent;border:none;overflow-wrap:break-word;white-space:pre-wrap;resize:none;display:block;vertical-align:top;padding:0;margin:0;max-height:none;overflow-y:auto;">
            ${b.text ? b.text.replace(/</g,"&lt;").replace(/\n/g,"<br>") : ""}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

window.onBlockTextInput = function(bi, el) {
  let page = quizzes[currentQuizIdx].pages[selectedPageIdx];
  let b = page.blocks[bi];
  let text = el.innerText.replace(/\u200B/g, '');
  if (b.maxlen) text = text.slice(0, b.maxlen);
  b.text = text;
  saveQuizzes();
};

window.onSelectBlock = function(idx) {
  selectedBlockIdx = idx;
  renderApp();
};

if (quizzes.length===0) quizzes.push(blankQuiz());
if (quizzes[0].pages.length===0) quizzes[0].pages.push({ bg: "static/2.png", blocks: [] });
renderApp();

function attachCanvasEvents() {
  // Drag/resize code can be added if needed, but keep .text-block NOT flex
}
