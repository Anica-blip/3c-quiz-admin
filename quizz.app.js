import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://cgxjqsbrditbteqhdyus.supabase.co'; // <- your project URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4'; // <- your anon/public key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (sel) => document.querySelector(sel);
const app = $("#app");

let QUIZ_SLUG = null;
let QUIZ_TITLE = "";
let QUIZ_URL = "";

let quizData = null;
let state = {
  page: 0,
  loaded: false,
  answers: [],
};

async function generateNextQuizSlug() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id');
  if (error || !data) return "quiz.01";
  const nextNum = data.length + 1;
  return `quiz.${String(nextNum).padStart(2, '0')}`;
}

function generateQuizUrl(slug) {
  // Change this to your actual quiz viewing URL pattern
  return `https://your-site.com/quiz/${slug}`;
}

async function loadQuizFromSupabase(slug) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_slug', slug)
      .single();

    if (error || !data) throw new Error("Quiz not found");

    const questionPages = [
      "3a.png", "3b.png", "3c.png", "3d.png", "3e.png", "3f.png", "3g.png", "3h.png"
    ];
    const questions = [];
    questionPages.forEach((col, idx) => {
      if (data[col]) {
        const qObj = JSON.parse(data[col]);
        questions.push({
          text: qObj.question,
          answers: (qObj.answers || []).map((a, aIdx) => ({
            label: typeof a === "string" ? a : (a.label || ""),
            type: (qObj.answerTypes && qObj.answerTypes[aIdx]) || "A"
          })),
          bg: qObj.bg || null
        });
      }
    });

    QUIZ_TITLE = data.title || "";
    QUIZ_SLUG = data.quiz_slug;
    QUIZ_URL = generateQuizUrl(QUIZ_SLUG);

    quizData = {
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
  if (quizData.introBg) seq.push({ type: "intro", bg: quizData.introBg });
  quizData.questions.forEach((q, idx) => {
    seq.push({ type: "question", bg: q.bg, qIndex: idx });
  });
  if (quizData.preResultsBg) seq.push({ type: "pre-results", bg: quizData.preResultsBg });
  ["A", "B", "C", "D"].forEach(type => {
    if (quizData.results[type]) seq.push({ type: "result", resultType: type, data: quizData.results[type] });
  });
  if (quizData.thankyouBg || quizData.thankyouMessage) seq.push({ type: "thankyou", bg: quizData.thankyouBg, message: quizData.thankyouMessage });
  return seq;
}

async function onNewQuiz() {
  QUIZ_SLUG = await generateNextQuizSlug();
  QUIZ_TITLE = "";
  QUIZ_URL = generateQuizUrl(QUIZ_SLUG);
  quizData = {
    introBg: null,
    questions: [],
    preResultsBg: null,
    results: {},
    thankyouBg: null,
    thankyouMessage: "You have completed the quiz."
  };
  state = {
    page: 0,
    loaded: false,
    answers: [],
  };
  render();
}

async function saveQuizToSupabase(quizObj) {
  const titleInput = $("#quizTitleInput");
  QUIZ_TITLE = titleInput ? titleInput.value : QUIZ_TITLE;

  const payload = {
    quiz_slug: QUIZ_SLUG,
    title: QUIZ_TITLE,
    "2.png": quizObj.introBg,
    "3a.png": quizObj.questions[0] ? JSON.stringify(quizObj.questions[0]) : null,
    "3b.png": quizObj.questions[1] ? JSON.stringify(quizObj.questions[1]) : null,
    "3c.png": quizObj.questions[2] ? JSON.stringify(quizObj.questions[2]) : null,
    "3d.png": quizObj.questions[3] ? JSON.stringify(quizObj.questions[3]) : null,
    "3e.png": quizObj.questions[4] ? JSON.stringify(quizObj.questions[4]) : null,
    "3f.png": quizObj.questions[5] ? JSON.stringify(quizObj.questions[5]) : null,
    "3g.png": quizObj.questions[6] ? JSON.stringify(quizObj.questions[6]) : null,
    "3h.png": quizObj.questions[7] ? JSON.stringify(quizObj.questions[7]) : null,
    "4.png": quizObj.preResultsBg,
    "5a.png": quizObj.results.A ? JSON.stringify(quizObj.results.A) : null,
    "5b.png": quizObj.results.B ? JSON.stringify(quizObj.results.B) : null,
    "5c.png": quizObj.results.C ? JSON.stringify(quizObj.results.C) : null,
    "5d.png": quizObj.results.D ? JSON.stringify(quizObj.results.D) : null,
    "6.png": quizObj.thankyouBg,
    thankyou_message: quizObj.thankyouMessage
  };

  const { data, error } = await supabase
    .from('quizzes')
    .insert([payload])
    .select();

  if (error) {
    alert("Error saving quiz: " + error.message);
  } else {
    const quizRow = data && data[0];
    QUIZ_URL = quizRow
      ? generateQuizUrl(quizRow.quiz_slug)
      : "unknown";
    $("#quizUrlDisplay").innerText = `Quiz URL: ${QUIZ_URL}`;
    alert("Quiz saved as: " + QUIZ_SLUG + " (" + QUIZ_TITLE + ")\nURL: " + QUIZ_URL);
  }
  render();
}

function render() {
  app.innerHTML = `
    <div>
      <label for="quizTitleInput">Quiz Title:</label>
      <input type="text" id="quizTitleInput" value="${QUIZ_TITLE}" placeholder="Enter quiz title">
      <div>Quiz Editor for ${QUIZ_SLUG || "[new quiz]"}</div>
      <div id="quizUrlDisplay">Quiz URL: ${QUIZ_URL ? QUIZ_URL : ""}</div>
      <button id="newQuizBtn">New Quiz</button>
      <button id="saveQuizBtn">Save Quiz</button>
    </div>
  `;
  $("#newQuizBtn")?.addEventListener("click", onNewQuiz);
  $("#saveQuizBtn")?.addEventListener("click", () => saveQuizToSupabase(quizData));
}

// Initial load: load the first quiz (optional)
loadQuizFromSupabase("quiz.01");
