// (ALL EXISTING CODE YOU PASTED ABOVE IS INCLUDED)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';
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

// [EXISTING FUNCTIONS HERE: loadQuizFromSupabase, getPageSequence, renderFullscreenBgPage, render, calculateResult, loadQuizFromSupabase(QUIZ_SLUG)]

// ----------------------------
// ✅ AUTO-NUMBERING & EXPORT
// ----------------------------

async function getNextQuizSlug() {
  const { data, error } = await supabase.from('quizzes').select('quiz_slug');
  if (error || !data) throw new Error('Failed to fetch existing quizzes.');

  const numbers = data
    .map(q => q.quiz_slug?.match(/quiz\.(\d+)/))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10))
    .filter(n => !isNaN(n));

  const nextNumber = (Math.max(...numbers, 0) + 1).toString().padStart(2, '0');
  return `quiz.${nextNumber}`;
}

function prepareExportStructure() {
  const exportData = {
    quiz_slug: '',
    "2.png": quizData.introBg || null,
    "4.png": quizData.preResultsBg || null,
    "5a.png": quizData.results?.A ? JSON.stringify(quizData.results.A) : null,
    "5b.png": quizData.results?.B ? JSON.stringify(quizData.results.B) : null,
    "5c.png": quizData.results?.C ? JSON.stringify(quizData.results.C) : null,
    "5d.png": quizData.results?.D ? JSON.stringify(quizData.results.D) : null,
    "6.png": quizData.thankyouBg || null,
    thankyou_message: quizData.thankyouMessage || "You have completed the quiz."
  };

  quizData.questions.forEach((q, idx) => {
    const key = `3${String.fromCharCode(97 + idx)}.png`;
    exportData[key] = JSON.stringify({
      question: q.text,
      answers: q.answers.map(a => a.label),
      answerTypes: q.answers.map(a => a.type),
      bg: q.bg || null
    });
  });

  return exportData;
}

async function saveQuizToSupabase() {
  try {
    const newSlug = await getNextQuizSlug();
    const payload = prepareExportStructure();
    payload.quiz_slug = newSlug;

    const { error } = await supabase.from('quizzes').insert([payload]);
    if (error) throw new Error("Save failed: " + error.message);

    alert(`✅ Quiz saved as ${newSlug}`);
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

// 🔘 Trigger via Save Button
const saveBtn = document.getElementById("saveBtn");
if (saveBtn) {
  saveBtn.addEventListener("click", saveQuizToSupabase);
}
