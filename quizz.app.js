import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://cgxjqsbrditbteqhdyus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (sel) => document.querySelector(sel);
const app = $("#app");

let QUIZ_SLUG = null;
let QUIZ_TITLE = "";
let QUIZ_URL = "";
let quizArchive = []; // will hold all quizzes for listing

let quizData = null;
let state = {
  page: 0,
  loaded: false,
  answers: [],
};

async function fetchQuizArchive() {
  // Get all quizzes ordered by id desc (recent first)
  const { data, error } = await supabase
    .from('quizzes')
    .select('quiz_slug,title')
    .order('id', { ascending: false });
  quizArchive = data || [];
}

async function generateNextQuizSlug() {
  await fetchQuizArchive();
  const nextNum = (quizArchive.length || 0) + 1;
  return `quiz.${String(nextNum).padStart(2, '0')}`;
}

function generateQuizUrl(slug) {
  // CHANGE THIS TO YOUR ACTUAL QUIZ VIEWER ROUTE!
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
    await fetchQuizArchive();
    render();
  } catch (err) {
    app.innerHTML = `<div class="error">Error loading quiz: ${err.message}</div>`;
  }
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
  await fetchQuizArchive();
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
    await fetchQuizArchive(); // refresh archive after insert
    render();
    // Focus and select the URL for easy copying
    setTimeout(() => {
      const urlField = $("#quizUrlCopyField");
      if (urlField) {
        urlField.value = QUIZ_URL;
        urlField.focus();
        urlField.select();
      }
    }, 200);
    alert("Quiz saved as: " + QUIZ_SLUG + " (" + QUIZ_TITLE + ")\nURL: " + QUIZ_URL);
  }
}

function renderQuizArchive() {
  if (!quizArchive.length) return `<div>No quizzes found.</div>`;
  return `
    <div style="margin-top:30px;">
      <h2 style="margin-bottom:8px;color:#4682b4;">Quiz Archive</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#eaf4fc;">
            <th style="text-align:left;padding:6px;">Quiz #</th>
            <th style="text-align:left;padding:6px;">Title</th>
            <th style="text-align:left;padding:6px;">URL</th>
          </tr>
        </thead>
        <tbody>
        ${quizArchive.map(q => `
          <tr>
            <td style="padding:6px;">${q.quiz_slug}</td>
            <td style="padding:6px;">${q.title||''}</td>
            <td style="padding:6px;">
              <input type="text" value="${generateQuizUrl(q.quiz_slug)}" readonly style="width:80%;">
              <button onclick="navigator.clipboard.writeText('${generateQuizUrl(q.quiz_slug)}')">Copy</button>
              <a href="${generateQuizUrl(q.quiz_slug)}" target="_blank" style="margin-left:12px;">Open</a>
            </td>
          </tr>
        `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function render() {
  app.innerHTML = `
    <div>
      <label for="quizTitleInput">Quiz Title:</label>
      <input type="text" id="quizTitleInput" value="${QUIZ_TITLE}" placeholder="Enter quiz title">
      <div>Quiz Editor for ${QUIZ_SLUG || "[new quiz]"} <span style="font-size:smaller;color:#aaa;">(slug: ${QUIZ_SLUG || ""})</span></div>
      <div id="quizUrlBlock" style="margin:14px 0;padding:12px;border:2px solid #4682b4;border-radius:8px;background:#f3f8ff;">
        <strong style="display:block;font-size:1.1em;margin-bottom:8px;">Quiz URL for sharing:</strong>
        <input type="text" id="quizUrlCopyField" value="${QUIZ_URL}" readonly style="width:75%;font-size:1em;padding:6px;">
        <button id="copyQuizUrlBtn" style="margin-left:12px;padding:5px 14px;">Copy URL</button>
        <span id="quizUrlCopiedMsg" style="margin-left:8px;color:green;display:none;">Copied!</span>
      </div>
      <button id="newQuizBtn" style="margin-right:12px;">New Quiz</button>
      <button id="saveQuizBtn">Save Quiz</button>
      ${renderQuizArchive()}
    </div>
  `;
  $("#newQuizBtn")?.addEventListener("click", onNewQuiz);
  $("#saveQuizBtn")?.addEventListener("click", () => saveQuizToSupabase(quizData));
  $("#copyQuizUrlBtn")?.addEventListener("click", () => {
    const urlField = $("#quizUrlCopyField");
    if (urlField) {
      urlField.select();
      document.execCommand('copy');
      const msg = $("#quizUrlCopiedMsg");
      if (msg) {
        msg.style.display = 'inline';
        setTimeout(() => { msg.style.display = 'none'; }, 1100);
      }
    }
  });
}

// Initial load: get archive and load the first quiz
(async () => {
  await fetchQuizArchive();
  loadQuizFromSupabase("quiz.01");
})();
