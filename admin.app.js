// --- CONFIGURE YOUR SUPABASE DETAILS HERE ---
const SUPABASE_URL = 'https://cgxjqsbrditbteqhdyus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4';
const QUIZZES_TABLE = 'quizzes';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- STATE ----
let quiz = {
  title: "",
  slug: "",
  description: "",
  pages: [
    { blocks: [] }
  ]
};
let currentPage = 0;

// ---- DOM ELEMENTS ----
const quizTitle = document.getElementById('quiz-title');
const quizSlug = document.getElementById('quiz-slug');
const quizDescription = document.getElementById('quiz-description');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const addPageBtn = document.getElementById('add-page');
const removePageBtn = document.getElementById('remove-page');
const pageIndicator = document.getElementById('page-indicator');
const blocksList = document.getElementById('blocks-list');
const newBlockType = document.getElementById('new-block-type');
const addBlockBtn = document.getElementById('add-block');
const saveQuizBtn = document.getElementById('save-quiz');
const saveStatus = document.getElementById('save-status');

// ---- TYPE AUTO-MAPPING FOR ANSWERS ----
const answerTypeMap = {
  answerA: { label: "A", resultType: "A" },
  answerB: { label: "B", resultType: "B" },
  answerC: { label: "C", resultType: "C" },
  answerD: { label: "D", resultType: "D" }
};

// ---- INIT ----
function render() {
  // Meta fields
  quizTitle.value = quiz.title;
  quizSlug.value = quiz.slug;
  quizDescription.value = quiz.description;
  // Page indicator
  pageIndicator.textContent = `Page ${currentPage+1} / ${quiz.pages.length}`;
  // Block list
  blocksList.innerHTML = "";
  if (!quiz.pages[currentPage]) quiz.pages[currentPage] = { blocks: [] };
  quiz.pages[currentPage].blocks.forEach((block, idx) => {
    const row = document.createElement("div");
    row.className = "block-row";
    // Type (show as text, not editable for answers to preserve mapping)
    if (block.type === "answer") {
      const typeText = document.createElement("span");
      typeText.textContent = `Answer ${block.label}`;
      row.appendChild(typeText);
    } else {
      const typeSel = document.createElement("select");
      ["title","description","question"].forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
        if (block.type === t) opt.selected = true;
        typeSel.appendChild(opt);
      });
      typeSel.onchange = e => { block.type = e.target.value; render(); };
      row.appendChild(typeSel);
    }

    // Text/content
    const txt = document.createElement("input");
    txt.type = "text";
    txt.placeholder = "Content";
    txt.value = block.text || "";
    txt.oninput = e => { block.text = e.target.value; };
    row.appendChild(txt);

    // X/Y coords
    const x = document.createElement("input");
    x.type = "number";
    x.placeholder = "X";
    x.value = block.x || 0;
    x.oninput = e => { block.x = parseInt(e.target.value, 10) || 0; };
    row.appendChild(x);

    const y = document.createElement("input");
    y.type = "number";
    y.placeholder = "Y";
    y.value = block.y || 0;
    y.oninput = e => { block.y = parseInt(e.target.value, 10) || 0; };
    row.appendChild(y);

    // Remove button
    const remBtn = document.createElement("button");
    remBtn.textContent = "Remove";
    remBtn.onclick = () => {
      quiz.pages[currentPage].blocks.splice(idx, 1);
      render();
    };
    row.appendChild(remBtn);

    blocksList.appendChild(row);
  });
}

// ---- EVENT HANDLERS ----
quizTitle.oninput = e => { quiz.title = e.target.value; };
quizSlug.oninput = e => { quiz.slug = e.target.value; };
quizDescription.oninput = e => { quiz.description = e.target.value; };

// Navigation
prevPageBtn.onclick = () => {
  if (currentPage > 0) currentPage--;
  render();
};
nextPageBtn.onclick = () => {
  if (currentPage < quiz.pages.length - 1) currentPage++;
  render();
};
addPageBtn.onclick = () => {
  quiz.pages.splice(currentPage + 1, 0, { blocks: [] });
  currentPage++;
  render();
};
removePageBtn.onclick = () => {
  if (quiz.pages.length > 1) {
    quiz.pages.splice(currentPage, 1);
    if (currentPage >= quiz.pages.length) currentPage = quiz.pages.length - 1;
    render();
  }
};

addBlockBtn.onclick = () => {
  const type = newBlockType.value;
  let block;
  if (type.startsWith("answer")) {
    // Automatic label and result type
    const map = answerTypeMap[type];
    block = { type: "answer", label: map.label, resultType: map.resultType, text: "", x: 0, y: 0 };
  } else {
    block = { type, text: "", x: 0, y: 0 };
  }
  quiz.pages[currentPage].blocks.push(block);
  render();
};

// ---- SUPABASE SAVE ----
saveQuizBtn.onclick = async () => {
  saveStatus.textContent = "";
  // Quiz slug and title required
  if (!quiz.slug || !quiz.title) {
    saveStatus.textContent = "Please enter a quiz slug and title.";
    saveStatus.className = "save-error";
    return;
  }
  // Build quiz_url
  const quiz_url = `https://anica-blip.github.io/3c-quiz/${quiz.slug}`;
  // Compose DB object
  const pages = quiz.pages.map(page => ({
    blocks: page.blocks.map(block => {
      if (block.type === "answer") {
        return {
          type: "answer",
          label: block.label,
          resultType: block.resultType,
          text: block.text,
          x: block.x,
          y: block.y
        };
      }
      return { ...block };
    })
  }));

  const dbQuiz = {
    quiz_slug: quiz.slug,
    quiz_url,
    title: quiz.title,
    description: quiz.description,
    pages
  };
  // Upsert by slug (replace if exists)
  let { error } = await supabase
    .from(QUIZZES_TABLE)
    .upsert([dbQuiz], { onConflict: "quiz_slug" });
  if (error) {
    saveStatus.textContent = "Error saving quiz: " + error.message;
    saveStatus.className = "save-error";
  } else {
    saveStatus.textContent = "Quiz saved successfully!";
    saveStatus.className = "save-success";
  }
};

// ---- INITIAL RENDER ----
render();
