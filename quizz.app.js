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

let quizData = {
  id: "",
  title: "",
  pages: [],
};
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

// The correct URL for sharing/landing page
function generateQuizUrl(slug) {
  return `https://anica-blip.github.io/3c-quiz-admin/landing.html?quiz=${slug}`;
}

const WORKER_URL = 'https://3c-quiz.3c-innertherapy.workers.dev';

async function loadQuizFromSupabase(slug) {
  try {
    // Step 1: Get index row from Supabase (slug, title, r2_key)
    const { data, error } = await supabase
      .from('quizzes')
      .select('quiz_slug, title, r2_key')
      .eq('quiz_slug', slug)
      .single();

    if (error || !data) throw new Error("Quiz not found in index");
    if (!data.r2_key) throw new Error("Quiz has no R2 file yet — open in admin and save it first");

    // Step 2: Fetch full JSON from R2 via worker
    const r2Res = await fetch(`${WORKER_URL}/quiz/${slug}`);
    if (!r2Res.ok) throw new Error(`R2 fetch failed (${r2Res.status})`);

    const quizJson = await r2Res.json();

    QUIZ_TITLE = data.title || quizJson.title || "";
    QUIZ_SLUG = data.quiz_slug;
    QUIZ_URL = generateQuizUrl(QUIZ_SLUG);

    quizData = {
      id: QUIZ_SLUG,
      title: QUIZ_TITLE,
      pages: quizJson.pages || [],
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
    id: QUIZ_SLUG,
    title: "",
    pages: [],
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

  const r2_key = `Quizzes/${QUIZ_SLUG}.json`;

  // Step 1: Save full JSON to R2 via worker
  try {
    const r2Res = await fetch(`${WORKER_URL}/quiz/${QUIZ_SLUG}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: QUIZ_SLUG, title: QUIZ_TITLE, pages: quizObj.pages }, null, 2)
    });
    if (!r2Res.ok) {
      const errText = await r2Res.text();
      throw new Error(`R2 worker error ${r2Res.status}: ${errText}`);
    }
  } catch (r2Err) {
    alert("R2 save failed: " + r2Err.message);
    return;
  }

  // Step 2: Update Supabase index row (slug, title, url, r2_key — no pages)
  const { data, error } = await supabase
    .from('quizzes')
    .upsert([{
      quiz_slug: QUIZ_SLUG,
      quiz_url: generateQuizUrl(QUIZ_SLUG),
      title: QUIZ_TITLE,
      r2_key
    }], { onConflict: 'quiz_slug' })
    .select();

  if (error) {
    alert("Quiz saved to R2 ✅\nBut Supabase index failed: " + error.message);
  } else {
    const quizRow = data && data[0];
    QUIZ_URL = quizRow ? generateQuizUrl(quizRow.quiz_slug) : generateQuizUrl(QUIZ_SLUG);
    await fetchQuizArchive();
    render();
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
    <div style="direction: ltr; text-align: left;">
      <label for="quizTitleInput">Quiz Title:</label>
      <input type="text" id="quizTitleInput" value="${QUIZ_TITLE}" placeholder="Enter quiz title" style="direction: ltr; text-align: left;">
      <div>Quiz Editor for ${QUIZ_SLUG || "[new quiz]"} <span style="font-size:smaller;color:#aaa;">(slug: ${QUIZ_SLUG || ""})</span></div>
      <div id="quizUrlBlock" style="margin:14px 0;padding:12px;border:2px solid #4682b4;border-radius:8px;background:#f3f8ff;">
        <strong style="display:block;font-size:1.1em;margin-bottom:8px;">Quiz URL for sharing:</strong>
        <input type="text" id="quizUrlCopyField" value="${QUIZ_URL}" readonly style="width:75%;font-size:1em;padding:6px;direction: ltr; text-align: left;">
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
  // Optionally load a quiz by slug if you want
  // loadQuizFromSupabase("quiz.01");
  render();
})();
