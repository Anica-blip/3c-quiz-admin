import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'; // <- change to your project URL
const SUPABASE_KEY = 'YOUR_ANON_KEY'; // <- change to your anon/public key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (sel) => document.querySelector(sel);
const app = $("#app");

// Change this to the specific quiz_slug you want to load from Supabase:
const QUIZ_SLUG = "quiz.01";

let quizData = null;
let state = {
  page: 0,
  loaded: false,
  answers: [],
};

async function loadQuizFromSupabase(slug) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_slug', slug)
      .single();

    if (error || !data) throw new Error("Quiz not found");

    // Build questions array from 3a.png through 3h.png columns
    const questionPages = [
      "3a.png", "3b.png", "3c.png", "3d.png", "3e.png", "3f.png", "3g.png", "3h.png"
    ];
    const questions = [];
    questionPages.forEach((col, idx) => {
      if (data[col]) {
        // Each column is a JSON string: {question, answers, correct, ...}
        const qObj = JSON.parse(data[col]);
        questions.push({
          text: qObj.question,
          answers: (qObj.answers || []).map((a, aIdx) => ({
            label: typeof a === "string" ? a : (a.label || ""),
            type: (qObj.answerTypes && qObj.answerTypes[aIdx]) || "A"
          })),
          bg: qObj.bg || null // optionally store background image URL, if you want per-question background
        });
      }
    });

    quizData = {
      // If you have a cover, you can add coverBg: data["cover"] || null,
      introBg: data["2.png"] || null,
      questions,
      preResultsBg: data["4.png"] || null,
      results: {
        A: data["5a.png"] ? JSON.parse(data["5a.png"]) : null,
        B: data["5b.png"] ? JSON.parse(data["5b.png"]) : null,
        C: data["5c.png"] ? JSON.parse(data["5c.png"]) : null,
        D: data["5d.png"] ? JSON.parse(data["5d.png"]) : null,
      },
      thankyouBg: data["6.png"] || null,
      thankyouMessage: data["thankyou_message"] || "You have completed the quiz.",
    };

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

  // INTRO PAGE (was cover or intro)
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
      <div class="fullscreen-bg" style="background-image:url('${current.bg || ""}')"></div>
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

// Load quiz from Supabase on page start
loadQuizFromSupabase(QUIZ_SLUG);
