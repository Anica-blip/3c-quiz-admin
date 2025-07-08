# 3c-quiz-admin

**Visual Admin/Editor App for 3c-quiz**

This app lets you visually create, edit, and manage quiz content for the [3c-quiz](https://github.com/Anica-blip/3c-quiz) platform.  
Design your quizzes using a drag-and-drop WYSIWYG interface: position, style, and preview text blocks directly on your background images for each page.

---

## Features

- **Mobile-first canvas** with fixed aspect ratio, matching the quiz app
- **Live preview** of each quiz page with the real background image
- **Drag, resize, and style text blocks** for titles, questions, answers, and results
- **Font size and color controls** for each text block
- **Add, edit, or delete quizzes** with automatic quiz ID assignment (e.g., quiz.01, quiz.02)
- **Export/import quiz data as JSON** for use in the quiz app
- **Safe zones/overlay** for answer buttons (so you never overlap UI)
- **Supports up to 8 questions and 4 answers per quiz**

---

## Getting Started

1. **Clone this repository**  
   `git clone https://github.com/Anica-blip/3c-quiz-admin.git`

2. **Open `index.html` in your browser**  
   No build step required. All files are static.

3. **Add your images**  
   Place your background images in the `static/` folder. Use the same filenames as in your quiz app (`1.png`, `2.png`, etc).

4. **Start editing!**  
   - Create new quizzes or edit existing ones
   - Drag and style your text blocks
   - Save/export your quiz data for the main app

---

## Project Structure

- `index.html` — main app entry point
- `admin.app.js` — main admin/editor app logic
- `admin.css` — styles for the editor UI
- `static/` — background images used for quiz pages

---

## License

MIT

---

## See Also

- [3c-quiz (main quiz app)](https://github.com/Anica-blip/3c-quiz)

---

_Questions or suggestions? Open an issue or pull request!_
