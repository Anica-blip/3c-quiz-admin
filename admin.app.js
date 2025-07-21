const $ = (sel) => document.querySelector(sel);
const app = $("#app");

// Get quiz file from URL parameter, default to quiz-json/quiz.01.json
const params = new URLSearchParams(window.location.search);
const QUIZ_FILE = params.get("quiz") || "quiz-json/quiz.01.json";

let quizData = null;
let state = {
  page: 0,
  loaded: false,
  answers: [],
};

async function loadQuiz(file) {
  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error("Quiz file not found");
    quizData = await response.json();
    state.page = 0;
    state.loaded = true;
    render();
  } catch (err) {
    app.innerHTML = `<div class="error">Error loading quiz: ${err.message}</div>`;
  }
}

function getPageSequence() {
  if (!quizData) return [];
  let seq = [];
  // Add cover if present
  if (quizData.coverBg) seq.push({ type: "cover", bg: quizData.coverBg });
  // Add intro if present
  if (quizData.introBg) seq.push({ type: "intro", bg: quizData.introBg });
  // Add questions
  quizData.questions.forEach((q, idx) => {
    seq.push({ type: "question", bg: q.bg, qIndex: idx });
  });
  // Add pre-results and results
  if (quizData.preResultsBg) seq.push({ type: "pre-results", bg: quizData.preResultsBg });
  ["A", "B", "C", "D"].forEach(type => {
    if (quizData.results && quizData.results[type]) {
      seq.push({ type: `result${type}`, bg: quizData.results[type].bg, resultType: type });
    }
  });
  if (quizData.thankyouBg) seq.push({ type: "thankyou", bg: quizData.thankyouBg });
  return seq;
}

function renderFullscreenBgPage({ bg, button, showBack }) {
  app.innerHTML = `
    <div class="fullscreen-bg" style="background-image:url('${bg}');"></div>
    <div class="fullscreen-bottom">
      ${showBack ? `<button class="back-arrow-btn" id="backBtn" title="Go Back">&#8592;</button>` : ""}
      ${button ? `<button class="main-btn" id="${button.id}">${button.label}</button>` : ""}
    </div>
  `;
  if (showBack) {
    $("#backBtn").onclick = () => {
      state.page = Math.max(0, state.page - 1);
      render();
    };
  }
  if (button) {
    $(`#${button.id}`).onclick = button.onClick;
  }
}

function render() {
  app.innerHTML = "";
  if (!state.loaded) {
    app.innerHTML = `<div>Loading quiz...</div>`;
    return;
  }

  const pageSequence = getPageSequence();
  const current = pageSequence[state.page];
  if (!current) {
    app.innerHTML = `<div class="fullscreen-bg" style="background-color:#111"></div>`;
    return;
  }

  let showBack = state.page > 0;
  let nextLabel = "Next";
  if (current.type === "cover") nextLabel = "Start";
  if (current.type === "intro") nextLabel = "Continue";
  if (current.type === "pre-results") nextLabel = "Get Results";
  if (current.type.startsWith("result")) nextLabel = "Finish";

  let nextAction = () => {
    if (current.type === "pre-results") {
      const resultType = calculateResult();
      state.page = pageSequence.findIndex(p => p.type === `result${resultType}`);
      render();
      return;
    } else if (current.type.startsWith("result")) {
      state.page = pageSequence.findIndex(p => p.type === "thankyou");
      render();
      return;
    } else if (current.type === "thankyou") {
      // No button on thank you page
      return;
    }
    state.page = Math.min(state.page + 1, pageSequence.length - 1);
    render();
  };

  // COVER PAGE
  if (current.type === "cover") {
    app.innerHTML = `
      <div class="cover-outer">
        <div class="cover-image-container">
          <img class="cover-img" src="${current.bg}" alt="cover"/>
          <div class="cover-title">${quizData.title || ""}</div>
          <div class="cover-description">${quizData.description || ""}</div>
          <button class="main-btn cover-btn-in-img" id="nextBtn">${nextLabel}</button>
        </div>
      </div>
    `;
    $("#nextBtn").onclick = nextAction;
    return;
  }

  // INTRO PAGE
  if (current.type === "intro") {
    renderFullscreenBgPage({
      bg: current.bg,
      button: { label: nextLabel, id: "mainBtn", onClick: nextAction },
      showBack
    });
    return;
  }

  // QUESTION PAGE
  if (current.type === "question") {
    const q = quizData.questions[current.qIndex];
    app.innerHTML = `
      <div class="fullscreen-bg" style="background-image:url('${current.bg}')"></div>
      <div class="page-content">
        <div class="content-inner">
          <h2>Question ${current.qIndex + 1}</h2>
          <p>${q.text}</p>
          <div class="answers">
            ${q.answers.map((a, i) => `
              <button class="answer-btn" id="answer${i}">${a.label}</button>
            `).join("")}
          </div>
        </div>
      </div>
      <div class="fullscreen-bottom">
        ${showBack ? `<button class="back-arrow-btn" id="backBtn">&#8592;</button>` : ""}
      </div>
    `;
    q.answers.forEach((a, i) => {
      $(`#answer${i}`).onclick = () => {
        state.answers[current.qIndex] = i;
        state.page++;
        render();
      };
    });
    if (showBack) {
      $("#backBtn").onclick = () => {
        state.page = Math.max(state.page - 1, 0);
        render();
      };
    }
    return;
  }

  // PRE-RESULTS PAGE
  if (current.type === "pre-results") {
    renderFullscreenBgPage({
      bg: current.bg,
      button: { label: nextLabel, id: "mainBtn", onClick: nextAction },
      showBack
    });
    return;
  }

  // RESULT PAGE
  if (current.type.startsWith("result")) {
    const resultType = current.resultType;
    const result = quizData.results[resultType] || {};
    app.innerHTML = `
      <div class="fullscreen-bg" style="background-image:url('${result.bg || ""}')"></div>
      <div class="page-content">
        <div class="content-inner">
          <h2>${result.title || "Result " + resultType}</h2>
          <p>${result.description || ""}</p>
        </div>
      </div>
      <div class="fullscreen-bottom">
        <button class="main-btn" id="nextBtn">${nextLabel}</button>
        ${showBack ? `<button class="back-arrow-btn" id="backBtn">&#8592;</button>` : ""}
      </div>
    `;
    $("#nextBtn").onclick = nextAction;
    if (showBack) {
      $("#backBtn").onclick = () => {
        state.page = getPageSequence().findIndex(p => p.type === "pre-results");
        render();
      };
    }
    return;
  }

  // THANK YOU PAGE
  if (current.type === "thankyou") {
    app.innerHTML = `
      <div class="fullscreen-bg" style="background-image:url('${current.bg}')"></div>
      <div class="page-content">
        <div class="content-inner">
          <h2>Thank You!</h2>
          <p>${quizData.thankyouMessage || "You have completed the quiz."}</p>
        </div>
      </div>
      <div class="fullscreen-bottom">
        ${showBack ? `<button class="back-arrow-btn" id="backBtn" title="Go Back">&#8592;</button>` : ""}
      </div>
    `;
    if (showBack) {
      $("#backBtn").onclick = () => {
        state.page = getPageSequence().findIndex(p => p.type === "pre-results");
        render();
      };
    }
    return;
  }

  // FALLBACK
  app.innerHTML = `<div class="fullscreen-bg" style="background-color:#111"></div>`;
}

// Result calculation example: find most frequent answer type
function calculateResult() {
  const counts = {};
  quizData.questions.forEach((q, idx) => {
    const answerIdx = state.answers[idx];
    const answer = q.answers[answerIdx];
    if (answer && answer.type) {
      counts[answer.type] = (counts[answer.type] || 0) + 1;
    }
  });
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "A");
}

// Load on page start
loadQuiz(QUIZ_FILE);
