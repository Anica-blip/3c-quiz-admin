// ========== 3c-quiz-admin: Autosave & True Drag/Drop ==========

const CANVAS_W = 360, CANVAS_H = 640;
const BLOCK_TYPES = [
  { type: "title", label: "Title", text: "Title goes here", color: "#222222", size: 24 },
  { type: "desc", label: "Description", text: "Description...", color: "#444444", size: 18 },
  { type: "question", label: "Question", text: "Question text?", color: "#222222", size: 18 },
  { type: "answer", label: "Answer", text: "Answer option", color: "#003366", size: 16 },
  { type: "result", label: "Result", text: "Result text...", color: "#1B5E20", size: 20 }
];

let quizzes = loadQuizzes();
let currentQuizIdx = 0;
let selectedPageIdx = 0;
let selectedBlockIdx = -1;

function loadQuizzes() {
  let q = localStorage.getItem('3c-quiz-admin-quizzes-v3');
  if (!q) return [];
  try { return JSON.parse(q); } catch { return []; }
}
function saveQuizzes() {
  localStorage.setItem('3c-quiz-admin-quizzes-v3', JSON.stringify(quizzes));
}

function blankQuiz() {
  return {
    id: nextQuizId(),
    title: "New Quiz",
    pages: [],
  }
}
function nextQuizId() {
  let ids = quizzes.map(q => parseInt(q.id.replace("quiz.",""))).sort((a,b)=>a-b);
  for(let i=1;i<=999;i++) {
    if(!ids.includes(i)) return `quiz.${String(i).padStart(2,"0")}`;
  }
  return `quiz.${String(ids.length+1).padStart(2,"0")}`;
}

// Smart image suggestion logic
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

function renderApp() {
  const app = document.getElementById('app');
  const quiz = quizzes[currentQuizIdx];
  const pages = quiz.pages;
  const page = pages[selectedPageIdx] || {};

  app.innerHTML = `
    <div class="sidebar">
      <div class="page
