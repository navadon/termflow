# Prerequisite data: TQF reconciliation report

Prerequisites in `courses.json` now come from the official CMU TQF site
(https://www.mis.cmu.ac.th/tqf/coursepublic.aspx?courseno=NNNNNN&semester=1&year=2569),
fetched for all 285 courses on 2026-07-17.

## Schema

- `prerequisites` is AND-of-OR groups: `[["261102","269102"]]` = 261102 **or** 269102;
  `[["208150"],["261218"]]` = 208150 **and** 261218.
- `cod: true` = "consent of the department" appears in the official prerequisite
  (shown as a green COD badge in the app; informational, not enforced).
- `corequisite` = "concurrent to" course.
- `prerequisiteNote` = non-course conditions (year standing, e-Pro score, major restrictions).

## Deviations from TQF (manual decisions)

- **206235 Linear Algebra** — no TQF record found in 1/2569 back through 1/2567;
  kept the curriculum value `206261`.
- **261304 Comp Arch** — TQF says `261214`, but CPE 2568 plans contain only the
  renumbered `261314`; stored as the OR group `["261214","261314"]`.

## Old curriculum data that TQF overruled (was in the JSON before 2026-07-17)

- 001102 English 2: was prereq 001101 in most files; TQF = e-Pro >= B1 / consent only.
- 261208 Numerical & 261306 Prob for Engr: was 206261; TQF = 206162.
- 261212 Logic Lab: was prereq 207106 (cpe2568); TQF = concurrent to 261210, no prereq.
- 261336 Networks Lab: was prereq 261332 (cpe2568); TQF = concurrent to 261335.
- 261447 Net & Info Sec: was 261335 (isne); TQF = 261332 or 269130.
- 267345 AI & ML: had three different values across ISCE files; TQF = 255201 and 261205 (or consent).
- The 32 per-curriculum prerequisite variants documented in the previous version of
  this file are all resolved: the cross-department cases (e.g. 261102 vs 269102)
  turned out to be OR alternatives in the official data, and the rest were
  data-entry gaps now corrected from TQF.
