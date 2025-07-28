import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'; // <- change to your project URL
const SUPABASE_KEY = 'YOUR_ANON_KEY'; // <- change to your anon/public key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (sel) => document.querySelector(sel);
const app = $("#app");

const QUIZ_SLUG = "quiz.01";

let quizData = null;
let state = {
  page: 0,
  loaded: false,
  answers: [],
};

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
    if (quizData.res
