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

## Deviations from TQF (manual decisions, confirmed by the department head)

- **261304 Comp Arch** — TQF says `261214`, but CPE 2568 plans contain only the
  renumbered `261314`; stored as the OR group `["261214","261314"]`.
  A petition to add 261314 to the official prerequisite was filed with the
  registration office in November 2026; once TQF lists it, this is no longer
  a deviation.

## Corrections applied after review (2026-07-17)

- **Linear Algebra was the wrong course code.** The curricula listed `206235`,
  which has no TQF record; the real course is **206325**, prerequisite
  `206112 or 206203 or 206261` (verified on TQF). Renamed in the CPE 2568
  curricula and in `courses.json`.
- **267491 Project Survey added to ISCE 2569 InfoSys (Co-op), Y3-2.** It was
  missing from that plan while 267492 Project requires it — there is no co-op
  exemption. This was the only invalid course left after the TQF import; all 11
  curriculum templates now validate clean.

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
