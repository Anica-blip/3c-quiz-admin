# 3c-quiz-admin

**Visual Admin/Editor App for 3c-quiz**  
_Dark Purple Edition — v3.2.0_

This app lets you visually create, edit, and manage quiz content for the [3c-quiz](https://github.com/Anica-blip/3c-quiz) platform.  
Design your quizzes using a drag-and-drop WYSIWYG interface: position, style, and preview text blocks directly on your background images for each page.

---

## Credits

**Originally architected by GitHub Copilot.**  
Refined to professional standards by **Claude Sonnet 4.6 (Anthropic)** in collaboration with **Chef Anica / 3C Thread To Success**.

> _"Think it. Do it. Own it."_ — 3C Active Thinking Approach

---

## Features

- **Dark Purple UI** — full dark mode with purple accent theme
- **Mobile-first canvas** with fixed aspect ratio, matching the quiz app
- **Live preview** of each quiz page with the real background image
- **Drag, resize, and style text blocks** for titles, questions, answers, and results
- **Font size and color controls** for each text block
- **Slide-out Block Settings drawer** — opens on first block click, stays silent after close; reopen manually via ⚙ Block Settings button
- **Add, edit, or delete quizzes** with automatic quiz ID assignment (e.g., quiz.01, quiz.02)
- **Export/import quiz data as JSON** for use in the quiz app
- **Quiz Archive table** — view, edit, copy URL, and open all saved quizzes
- **Supabase + Cloudflare R2** integration — quiz JSON stored in R2, index in Supabase
- **Supports up to 8 questions and 4 answers per quiz**

---

## Getting Started

1. **Clone this repository**
   ```
   git clone https://github.com/Anica-blip/3c-quiz-admin.git
   ```

2. **Open `index.html` in your browser**  
   No build step required. All files are static.

3. **Add your images**  
   Place your background images in the `static/` folder. Use the same filenames as in your quiz app (`1.png`, `2.png`, etc).

4. **Start editing!**
   - Create new quizzes or edit existing ones from the Quiz Archive
   - Drag and style your text blocks on the canvas
   - Use ⚙ Block Settings to fine-tune position, size, color, and alignment
   - Save/export your quiz data for the main app

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR  — Title · Credits · Save Quiz · Export · Import │
├─────────────────────────────────────────────────────┤
│  SUBBAR  — New Quiz · Quiz ID · Title · Page Nav · BG │
├────────────┬────────────────────────┬───────────────┤
│  PAGES     │      CANVAS            │  ADD BLOCK    │
│  sidebar   │   (360 × 640 preview)  │  panel        │
│  (left)    │                        │  (right)      │
└────────────┴────────────────────────┴───────────────┘
│  QUIZ ARCHIVE — full table of saved quizzes          │
└──────────────────────────────────────────────────────┘
         [Block Settings drawer slides in from right]
```

---

## Project Structure

```
index.html       — main app entry point (clean, no inline bloat)
admin.app.js     — full editor logic (quiz CRUD, canvas, Supabase, R2)
admin.css        — dark purple theme, layout, drawer, archive styles
static/          — background images used for quiz pages
```

---

## Tech Stack

- Vanilla JS + CSS (no framework, no build step)
- [Supabase](https://supabase.com) — quiz index storage
- [Cloudflare R2](https://developers.cloudflare.com/r2/) via Worker — quiz JSON storage
- Google Fonts — Outfit + Open Sans

---

## License

MIT

---

## See Also

- [3c-quiz (main quiz app)](https://github.com/Anica-blip/3c-quiz)
- [3C Thread To Success](https://github.com/Anica-blip)
