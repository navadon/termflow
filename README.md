# TermFlow

A visual study-plan builder for academic advisors and students. Drag courses
across semesters, check prerequisites on the fly, pick electives from
dropdowns, and track completion per semester and per requirement category —
all against the department's official curricula.

Built with React, Vite, and [React Flow](https://reactflow.dev).

## Features

- **Semester board** — each academic year renders as three columns, labeled
  Y1-1, Y1-2, Y1-3 (the third is the summer session, tinted yellow); courses
  are cards you drag between semester slots.
- **Prerequisite checking** — courses placed before their prerequisites are
  flagged; hovering a course highlights its chain (prerequisites glow green,
  dependent courses glow blue).
- **Elective dropdowns** — GenEd and major-elective slots offer the allowed
  options for that curriculum; an option already used elsewhere is disabled.
- **Completion tracking** — per-course checkboxes, a per-semester
  "mark all completed" checkbox, an overall credit progress bar, and a
  breakdown by category (GenEd / Major / Others).
- **Plans** — Save Plan downloads a JSON file, Open Plan restores one, Reset
  returns to the curriculum's default template. The current plan is also
  autosaved to the browser's localStorage on every change and restored on the
  next visit. Destructive actions (switching curriculum, opening a file,
  resetting, closing the tab) ask for confirmation when there are unsaved
  changes.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build
```

## Data model

Two kinds of JSON, deliberately kept distinct:

- **Curricula** (`src/data/curriculum-*.json`) — the fixed program structures
  maintained by the department: one file per curriculum and plan type
  (regular / co-op). Each file contains:
  - `courses[]` — `id`, `courseId`, `courseTitle`, `creditHours`,
    `prerequisites[]`, optional `corequisite`, `suggestedYear`,
    `suggestedSemester`, `rowIndex` (layout row), and `courseType`
    (`gen edu`, `math and sci`, `gen engr`, `major courses`, `others`).
    Elective placeholder slots have `courseId: null`.
  - `options{}` — per option type (language literacy, digital literacy,
    GenEd elective, major elective, …), the list of allowed courses for the
    dropdowns.
  - `resources[]` — links to the official plan information and program pages.
- **Plans** (`*_plan.json`, produced by Save Plan) — what a user creates for a
  student: `curriculumName`, optional `studentName`, `savedAt`, and `plan[]`
  with each course's chosen semester and completion state. Plans reference
  courses by id, so they stay valid across cosmetic curriculum edits.

### Editing curricula

Course titles should be identical everywhere a `courseId` appears (course
lists and option lists across all files). Schema changes (new fields, file
renames) go in their own small PR before any feature that depends on them.

## Contributing workflow

- `main` is the source of truth; work happens on short-lived feature branches
  merged via pull requests.
- Curriculum JSON conflicts resolve in favor of `main` unless the branch
  exists specifically to change the data.

## Roadmap

- Fill in `resources` for the ISCE 2569 curricula
- Update the ISNE 2566 "Plan Information" link when the 2566 sheet exists
- Advisor-side features: multiple advisees, plan comparison

## Credits

- **Creator & direction** — Navadon Khunlertgit. Set the direction and theme,
  designed the main flow and key features, and orchestrated the project.
- **Features & prototype** — Jedsadakorn Kritsadakul. Proposed and built a
  working proof of concept on the `rev1` branch, including the course
  **color-highlighter** that lights up a prerequisite chain on hover, the
  per-semester **credit-overload indicator**, and richer course data such as
  corequisites, course types, and layout rows.
- **Curriculum data** — prepared the input curriculum JSON files:
  - Kaewta Lungta
  - Poonyaporn Intaphrom
  - Tiger Tanner

_Developed with AI assistance (Google Antigravity, Claude Code)._
