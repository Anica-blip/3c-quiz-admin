import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'; // <- change to your project URL
const SUPABASE_KEY = 'YOUR_ANON_KEY'; // <- change to your anon/public key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (sel) => document.querySelector(sel);
const app = $("#app");

// This value is now dynamic!
let QUIZ_SLUG = "quiz.01";

let quizData = null;
let state = {
  page: 0,
  loaded: false,
  answers: [],
};

// Helper to generate next quiz slug (e.g. quiz.02, quiz.03, etc.)
async function generateNextQuizSlug() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('quiz_slug');
  if (error || !data || data.length === 0) return "quiz.01";
  // Find all quiz numbers
  const slugs = data
    .map(q => q.quiz_slug)
    .filter(s => /^quiz\.\d+$/.test(s))
    .map(s => parseInt(s.split('.')[1], 10))
    .sort((a, b) => a - b);
  const nextNum = slugs.length > 0 ? Math.max(...slugs) + 1 : 1;
  return `quiz.${String(nextNum).padStart(2, '0')}`;
}

// Load quiz
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

// EDITOR: Start a new quiz, reset form, and generate a new slug
async function onNewQuiz() {
  QUIZ_SLUG = await generateNextQuizSlug();
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
  // Do any UI resets here, then render
  render();
}

// Save quiz: always INSERT a new row with a new slug
async function saveQuizToSupabase(quizObj) {
  // Make sure to use the current QUIZ_SLUG
  const payload = {
    quiz_slug: QUIZ_SLUG,
    // Map the fields to match your table schema
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
    .insert([payload]);
  if (error) {
    alert("Error saving quiz: " + error.message);
  } else {
    alert("Quiz saved as: " + QUIZ_SLUG);
  }
}

// Example UI hooks
$("#newQuizBtn")?.addEventListener("click", onNewQuiz);
$("#saveQuizBtn")?.addEventListener("click", () => saveQuizToSupabase(quizData));

// Render function (stub, must be filled out for your app)
function render() {
  // Example: Render page based on state and quizData
  if (!state.loaded) {
    app.innerHTML = `<div>Loading...</div>`;
    return;
  }
  // Your rendering logic goes here...
  app.innerHTML = `<div>Quiz Editor for ${QUIZ_SLUG}</div>`;
  // etc.
}

// Initial load (optional, can load latest quiz or default)
loadQuizFromSupabase(QUIZ_SLUG);
