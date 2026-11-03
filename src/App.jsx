import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  Position,
  MarkerType,
  Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

// --- 1. IMPORT ALL CATALOGS ---
import cpe2563Coop from './data/curriculum-cpe2563-coop.json';
import cpe2563Regular from './data/curriculum-cpe2563-regular.json';
import cpe2568CoopS1 from './data/curriculum-cpe2568-coop-s1.json';
import cpe2568CoopS2 from './data/curriculum-cpe2568-coop-s2.json';
import cpe2568Regular from './data/curriculum-cpe2568-regular.json';
import isce2569CysecCoop from './data/curriculum-isce2569-cysec-coop.json';
import isce2569CysecRegular from './data/curriculum-isce2569-cysec-regular.json';
import isce2569InfosysCoop from './data/curriculum-isce2569-infosys-coop.json';
import isce2569InfosysRegular from './data/curriculum-isce2569-infosys-regular.json';
import isne2566Coop from './data/curriculum-isne2566-coop.json';
import isne2566Regular from './data/curriculum-isne2566-regular.json';
import coursesData from './data/courses.json';

// Curriculum files store only courseId + curriculum-specific placement; shared
// course facts (title, credit hours, type, default prerequisites) live in
// courses.json, keyed by courseId. A curriculum entry may set
// prerequisitesOverride when its prerequisite differs from the shared default.
const resolveCourse = (courseId) => coursesData[courseId] || null;

// Prerequisites are stored as AND-of-OR groups: [["A","B"],["C"]] means
// (A or B) and C. A flat ["A","B"] (legacy shape) is treated as A and B.
const toPrereqGroups = (prereqs) =>
  (prereqs || []).map(g => (Array.isArray(g) ? g : [g])).filter(g => g.length > 0);

const resolveOption = (opt) => {
  const base = resolveCourse(opt.courseId);
  return {
    courseId: opt.courseId,
    courseTitle: base?.courseTitle,
    prerequisites: base?.prerequisites ?? [],
    cod: !!base?.cod,
    corequisite: base?.corequisite ?? null
  };
};

// --- 2. CREATE CURRICULUM DICTIONARY ---
const curriculums = {
  'CPE 2568 (Regular)': cpe2568Regular,
  'CPE 2568 (Co-op Sem 1)': cpe2568CoopS1,
  'CPE 2568 (Co-op Sem 2)': cpe2568CoopS2,
  'CPE 2563 (Regular)': cpe2563Regular,
  'CPE 2563 (Co-op)': cpe2563Coop,
  'ISCE 2569 CySec (Regular)': isce2569CysecRegular,
  'ISCE 2569 CySec (Co-op)': isce2569CysecCoop,
  'ISCE 2569 InfoSys (Regular)': isce2569InfosysRegular,
  'ISCE 2569 InfoSys (Co-op)': isce2569InfosysCoop,
  'ISNE 2566 (Regular)': isne2566Regular,
  'ISNE 2566 (Co-op)': isne2566Coop
};

// --- CONFIGURATION ---
const SEMESTER_WIDTH = 270;
const SEMESTER_HEIGHT = 1520;
const SUMMER_WIDTH = 270;
const GAP_BETWEEN_SEMESTERS = 20;
const GAP_BETWEEN_YEARS = 20;
const TOP_PADDING = 100;

const COURSE_WIDTH = 240;
const COURSE_HEIGHT = 120;
const COURSE_GAP = 20;

const getSemesterX = (year, sem) => {
  if (year === 99 || year == null) return -350;

  const yearBlockWidth = (SEMESTER_WIDTH * 2) + SUMMER_WIDTH + (GAP_BETWEEN_SEMESTERS * 2) + GAP_BETWEEN_YEARS;
  const startX = (year - 1) * yearBlockWidth;

  if (sem === 1) return startX;
  if (sem === 2) return startX + SEMESTER_WIDTH + GAP_BETWEEN_SEMESTERS;
  if (sem === 3) return startX + (SEMESTER_WIDTH * 2) + (GAP_BETWEEN_SEMESTERS * 2);
  return 0;
};

const isNodeInside = (courseNode, semesterNode) => {
  if (!courseNode.position || !semesterNode.position) return false;
  const courseCenterX = courseNode.position.x + (COURSE_WIDTH / 2);
  const courseCenterY = courseNode.position.y + (COURSE_HEIGHT / 2);

  const semLeft = semesterNode.position.x;
  const semRight = semesterNode.position.x + parseFloat(semesterNode.style.width);
  const semTop = semesterNode.position.y;
  const semBottom = semesterNode.position.y + parseFloat(semesterNode.style.height);

  return (
    courseCenterX >= semLeft &&
    courseCenterX <= semRight &&
    courseCenterY >= semTop &&
    courseCenterY <= semBottom
  );
};

const getOptionType = (courseTitle) => {
  if (!courseTitle) return null;
  const title = courseTitle.toLowerCase().trim();
  if (title.includes('lang') || title.includes('language')) return 'languageLiteracy';
  if (title.includes('digital')) return 'digitalLiteracy';
  if (title.includes('global')) return 'globalCitizenship';
  if (title.includes('creativity') || title.includes('innovation') || title.includes('co-creator')) return 'creativityInnovation';
  if (title.includes('entre')) return 'entrepreneurialSkills';
  if (title.includes('gened elective') || title.includes('gen ed elective') || title.includes('gened elec') || title.includes('gen ed elec') || title === 'gened elective') return 'geElective';
  if (title.includes('major elec') || title.includes('major elective')) return 'majorElective';
  return null;
};

const getOptionPlaceholder = (optionType) => {
  switch (optionType) {
    case 'languageLiteracy': return 'Lang Literacy';
    case 'digitalLiteracy': return 'Digital Literacy';
    case 'globalCitizenship': return 'Global Citizenship';
    case 'creativityInnovation': return 'Creativity & Innovation';
    case 'entrepreneurialSkills': return 'Entre Skills';
    case 'geElective': return 'GenEd Elective';
    case 'majorElective': return 'Major Elective';
    default: return 'Select Course';
  }
};

// In-app replacement for window.alert / confirm / prompt. Native dialogs are
// blocked in sandboxed iframes (embedded previews) and by some popup blockers.
const DialogModal = ({ dialog, onClose }) => {
  const inputRef = useRef(null);
  useEffect(() => {
    if (dialog?.type === 'prompt') inputRef.current?.focus();
  }, [dialog]);
  if (!dialog) return null;
  const { type, message, defaultValue } = dialog;

  const ok = () => onClose(type === 'prompt' ? (inputRef.current?.value ?? '') : true);
  const cancel = () => onClose(type === 'prompt' ? null : false);

  return (
    <div
      onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif'
      }}
    >
      <div style={{ background: '#fff', borderRadius: '8px', padding: '20px 24px', width: '360px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{message}</div>
        {type === 'prompt' && (
          <input
            ref={inputRef}
            type="text"
            defaultValue={defaultValue || ''}
            onKeyDown={(e) => { if (e.key === 'Enter') ok(); }}
            style={{ marginTop: '12px', width: '100%', padding: '6px 8px', fontSize: '14px', border: '1px solid #aaa', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          {type !== 'alert' && (
            <button
              onClick={cancel}
              style={{ padding: '6px 14px', background: '#fff', color: '#555', border: '1px solid #aaa', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={ok}
            autoFocus={type !== 'prompt'}
            style={{ padding: '6px 14px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Contributor credits, shown from the top-panel "Credits" button and mirrored
// in the project README.
const CREDITS = [
  {
    names: ['Navadon Khunlertgit'],
    role: 'Creator & direction',
    detail: 'Set the direction and theme, designed the main flow and key features, and orchestrated the project.',
  },
  {
    names: ['Jedsadakorn Kritsadakul'],
    role: 'Features & prototype',
    detail: 'Proposed and prototyped several features — the course color-highlighter that lights up a prerequisite chain on hover, the credit-overload indicator, and richer course data.',
  },
  {
    names: ['Kaewta Lungta', 'Poonyaporn Intaphrom', 'Tiger Tanner'],
    role: 'Curriculum data',
    detail: 'Prepared the input curriculum JSON files.',
  },
];

const REPO_URL = 'https://github.com/navadon/termflow';

const CreditsModal = ({ open, onClose }) => {
  if (!open) return null;
  const year = new Date().getFullYear();
  return (
    <div
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '8px', padding: '22px 26px', width: '440px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
      >
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#222' }}>TermFlow</div>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '18px' }}>Credits &amp; acknowledgements</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {CREDITS.map((c, i) => (
            <div
              key={c.role}
              style={{
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid #eee'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#007bff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.role}</div>
              {c.names.map((n) => (
                <div key={n} style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginTop: '3px' }}>{n}</div>
              ))}
              <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.5, marginTop: '4px' }}>{c.detail}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #eee', marginTop: '6px', paddingTop: '14px', fontSize: '11px', color: '#999', lineHeight: 1.6 }}>
          <a href={REPO_URL} target="_blank" rel="noreferrer" style={{ color: '#007bff', textDecoration: 'none' }}>
            github.com/navadon/termflow
          </a>
          {'  ·  © '}{year}{' Navadon Khunlertgit'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button
            onClick={onClose}
            autoFocus
            style={{ padding: '6px 14px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Sits under the course title: green COD when the department must consent,
// and the "concurrent to" course when the official condition requires one.
const CourseNoteLine = ({ cod, corequisite }) => {
  if (!cod && !corequisite) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontSize: '14px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {cod && (
        <span title="Consent of the Department required" style={{ fontWeight: 'bold', color: '#28a745' }}>
          COD
        </span>
      )}
      {corequisite && (
        <span title={`Must be taken in the same semester as ${corequisite}`} style={{ color: '#777', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          concurrent to {corequisite}
        </span>
      )}
    </div>
  );
};

// Category colors for the card's left stripe: CMU purple for GenEd, Science
// gold (20xxxx), Engineering maroon (25xxxx). Keyed by courseType, except
// Major Elective slots, which get their own color whatever course is picked.
// Card backgrounds stay reserved for status (invalid / moved / completed).
const COURSE_TYPES = [
  { type: 'gen edu', label: 'GenEd', color: '#6F2C91' },
  { type: 'math and sci', label: 'Math & Sci', color: '#C9A227' },
  { type: 'gen engr', label: 'Gen Engr', color: '#800000' },
  { type: 'major courses', label: 'Major', color: '#0072B2' },
  { type: 'major elective', label: 'Major Elect', color: '#009E73' },
  { type: 'others', label: 'Others', color: '#999999' },
];
const COURSE_TYPE_COLOR = Object.fromEntries(COURSE_TYPES.map(t => [t.type, t.color]));

const CategoryStripe = ({ courseType, optionType }) => {
  const color = COURSE_TYPE_COLOR[optionType === 'majorElective' ? 'major elective' : courseType];
  if (!color) return null;
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px',
      background: color, borderTopLeftRadius: '7px', borderBottomLeftRadius: '7px',
      pointerEvents: 'none'
    }} />
  );
};

const CourseNode = ({ id, data }) => {
  const suggestedLabel = `Y${data.suggestedYear}-${data.suggestedSemester}`;
  const isOffSchedule = data.currentYear !== data.suggestedYear || data.currentSemester !== data.suggestedSemester;

  if (data.optionType) {
    const placeholder = getOptionPlaceholder(data.optionType);
    const dropdownOptions = data.dropdownOptions || [];
    return (
      <>
        <CategoryStripe courseType={data.courseType} optionType={data.optionType} />
        <Handle type="target" position={Position.Left} />
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: 8, paddingBottom: 4 }}>
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#444' }}>
              {data.courseId || (data.optionType === 'majorElective' ? 'Major Elect' : 'GenEd')}
              {isOffSchedule && (
                <span style={{ fontSize: '14px', color: '#777', marginLeft: '6px', fontWeight: 'bold' }}>
                  {suggestedLabel}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                {data.creditHours} CR
              </div>
              <input
                type="checkbox"
                className="nodrag"
                checked={!!data.completed}
                disabled={!data.courseId}
                onChange={(e) => {
                  if (data.onToggleComplete) {
                    data.onToggleComplete(id, e.target.checked);
                  }
                }}
                title={!data.courseId ? "Select a course first" : "Mark as completed"}
                style={{
                  cursor: data.courseId ? 'pointer' : 'not-allowed',
                  width: '24px',
                  height: '24px',
                  flexShrink: 0,
                  accentColor: '#28a745'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
            <select
              value={data.courseId || ''}
              className="nodrag"
              onChange={(e) => {
                if (data.onSelectCourse) {
                  data.onSelectCourse(id, e.target.value);
                }
              }}
              disabled={!!data.completed}
              style={{
                flex: 1,
                padding: '2px 4px',
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                lineHeight: '1.25',
                color: '#000',
                borderRadius: '4px',
                border: '1px solid #ccc',
                cursor: 'pointer',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <option value="">{placeholder}</option>
              {dropdownOptions.map(opt => {
                const isTaken = data.otherSelectedIds?.includes(opt.courseId);
                return (
                  <option
                    key={opt.courseId}
                    value={opt.courseId}
                    disabled={isTaken}
                  >
                    {opt.courseId} {opt.courseTitle}
                  </option>
                );
              })}
            </select>
          </div>
          <CourseNoteLine cod={data.cod} corequisite={data.corequisite} />
        </div>
        <Handle type="source" position={Position.Right} />
      </>
    );
  }

  return (
    <>
      <CategoryStripe courseType={data.courseType} optionType={data.optionType} />
      <Handle type="target" position={Position.Left} />
      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: 8, paddingBottom: 4 }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#444' }}>
            {data.courseId || 'GenEd'}
            {isOffSchedule && (
              <span style={{ fontSize: '14px', color: '#777', marginLeft: '6px', fontWeight: 'bold' }}>
                {suggestedLabel}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
              {data.creditHours} CR
            </div>
            <input
              type="checkbox"
              className="nodrag"
              checked={!!data.completed}
              onChange={(e) => {
                if (data.onToggleComplete) {
                  data.onToggleComplete(id, e.target.checked);
                }
              }}
              title="Mark as completed"
              style={{
                cursor: 'pointer',
                width: '24px',
                height: '24px',
                flexShrink: 0,
                accentColor: '#28a745'
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: '16px', lineHeight: '1.25', fontWeight: '600', color: '#000' }}>
          {data.courseTitle}
        </div>
        <CourseNoteLine cod={data.cod} corequisite={data.corequisite} />
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
};

const nodeTypes = {
  course: CourseNode
};

const createSemesterLabel = (year, sem, totalCredits, completedCredits = 0, semStats = null, onToggleSemesterComplete = null) => {
  const titleText = `Y${year}-${sem}`;

  const placeholders = [];
  for (let i = 0; i < 10; i++) {
    placeholders.push(
      <div key={`dropzone-${i}`} style={{
        position: 'absolute',
        top: TOP_PADDING + i * (COURSE_HEIGHT + COURSE_GAP),
        left: (SEMESTER_WIDTH - COURSE_WIDTH) / 2,
        width: COURSE_WIDTH,
        height: COURSE_HEIGHT,
        border: '2px dashed #ccc',
        borderRadius: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        boxSizing: 'border-box'
      }} />
    );
  }

  return (
    <div style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'relative' }}>
      {placeholders}

      <div style={{
        paddingTop: '25px',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '22px',
          fontWeight: '900',
          color: '#333',
          textTransform: 'uppercase',
          fontFamily: 'monospace'
        }}>
          {titleText}
        </div>
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#fff',
          background: totalCredits > 22 ? '#d9534f' : '#555',
          padding: '4px 10px',
          borderRadius: '12px',
        }}>
          {completedCredits}/{totalCredits} CR
        </div>
        {semStats && onToggleSemesterComplete && (
          <input
            type="checkbox"
            className="nodrag nopan"
            checked={semStats.completable > 0 && semStats.completedCount === semStats.completable}
            disabled={semStats.completable === 0}
            onChange={(e) => onToggleSemesterComplete(year, sem, e.target.checked)}
            title={semStats.completable === 0 ? 'No courses in this semester yet' : 'Mark all courses in this semester as completed'}
            style={{
              pointerEvents: 'auto',
              width: '24px',
              height: '24px',
              cursor: semStats.completable === 0 ? 'not-allowed' : 'pointer',
              accentColor: '#28a745'
            }}
          />
        )}
      </div>
    </div>
  );
};

const updateGameState = (currentNodes, onToggleSemesterComplete = null) => {
  const nodeLocationMap = {};
  const semesterCreditMap = {};
  const courseIdToNodeId = {};

  // Extract all currently selected course IDs grouped by optionType
  const selectedIdsByOptionType = {};
  currentNodes.forEach(n => {
    if (n.type === 'course' && n.data?.optionType && n.data?.courseId) {
      if (!selectedIdsByOptionType[n.data.optionType]) {
        selectedIdsByOptionType[n.data.optionType] = [];
      }
      selectedIdsByOptionType[n.data.optionType].push(n.data.courseId);
    }
  });

  currentNodes.forEach(n => {
    if (n.id.startsWith('sem-bg')) {
      semesterCreditMap[n.id] = { total: 0, completed: 0, completable: 0, completedCount: 0 };
    }

    if (n.type === 'course') {
      if (n.data.courseId) {
        courseIdToNodeId[n.data.courseId] = n.id;
      }
    }
  });

  currentNodes.forEach(courseNode => {
    if (courseNode.type !== 'course') return;

    const parentSem = currentNodes.find(semNode =>
      semNode.id.startsWith('sem-bg') && isNodeInside(courseNode, semNode)
    );

    if (parentSem) {
      const parts = parentSem.id.split('-');
      const year = parseInt(parts[2]);
      const sem = parseInt(parts[3]);

      nodeLocationMap[courseNode.id] = { year, sem };
      if (!semesterCreditMap[parentSem.id]) {
        semesterCreditMap[parentSem.id] = { total: 0, completed: 0, completable: 0, completedCount: 0 };
      }
      semesterCreditMap[parentSem.id].total += (courseNode.data.creditHours || 0);
      if (courseNode.data.courseId) {
        semesterCreditMap[parentSem.id].completable += 1;
      }
      if (courseNode.data.completed) {
        semesterCreditMap[parentSem.id].completed += (courseNode.data.creditHours || 0);
        semesterCreditMap[parentSem.id].completedCount += 1;
      }
    } else {
      nodeLocationMap[courseNode.id] = { year: 99, sem: 99 };
    }
  });

  return currentNodes.map(node => {
    if (node.id.startsWith('sem-bg')) {
      const parts = node.id.split('-');
      const year = parseInt(parts[2]);
      const sem = parseInt(parts[3]);
      const semStats = semesterCreditMap[node.id] || { total: 0, completed: 0, completable: 0, completedCount: 0 };
      return {
        ...node,
        data: { ...node.data, label: createSemesterLabel(year, sem, semStats.total, semStats.completed, semStats, onToggleSemesterComplete) }
      };
    }

    if (node.type === 'course') {
      const myLoc = nodeLocationMap[node.id];
      const prereqs = node.data.prerequisites || [];

      let isInvalid = false;
      const missingPrereqs = [];

      // Each group is an OR: satisfied if any member sits earlier in the plan.
      // All groups must be satisfied (AND between groups).
      toPrereqGroups(prereqs).forEach(group => {
        let groupSatisfied = false;
        let anyInPlan = false;
        group.forEach(prereqCode => {
          const prereqNodeId = courseIdToNodeId[prereqCode];
          if (prereqNodeId) {
            anyInPlan = true;
            const prereqLoc = nodeLocationMap[prereqNodeId];
            if (prereqLoc &&
                (prereqLoc.year < myLoc.year ||
                 (prereqLoc.year === myLoc.year && prereqLoc.sem < myLoc.sem))) {
              groupSatisfied = true;
            }
          }
        });
        if (!groupSatisfied) {
          isInvalid = true;
          if (!anyInPlan) missingPrereqs.push(group.join(' or '));
        }
      });

      const isMovedFromSuggested = myLoc.year !== node.data.suggestedYear || myLoc.sem !== node.data.suggestedSemester;
      const optionType = node.data.optionType;
      const otherSelectedIds = optionType && selectedIdsByOptionType[optionType]
        ? selectedIdsByOptionType[optionType].filter(id => id !== node.data.courseId)
        : [];

      return {
        ...node,
        draggable: !node.data.completed,
        data: {
          ...node.data,
          currentYear: myLoc.year === 99 ? null : myLoc.year,
          currentSemester: myLoc.sem === 99 ? null : myLoc.sem,
          otherSelectedIds,
          missingPrereqs
        },
        style: {
          ...node.style,
          background: isInvalid
            ? '#fce8e6'
            : (isMovedFromSuggested
              ? '#fffacd'
              : (node.data.completed ? '#e8f5e9' : 'white')),
          border: '1px solid #333',
          boxShadow: 'none',
          transition: 'background 0.3s ease, border 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease'
        }
      };
    }
    return node;
  });
};

const AUTOSAVE_KEY = 'curriculum-planner-autosave';

const loadAutosave = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY));
    if (saved && saved.curriculumName && curriculums[saved.curriculumName] && Array.isArray(saved.plan)) {
      return saved;
    }
  } catch { /* corrupted or unavailable storage: fall through to defaults */ }
  return null;
};

const generateEdgesForNodes = (currentNodes) => {
  const generatedEdges = [];
  const courseIdToNodeId = {};

  currentNodes.forEach(n => {
    if (n.type === 'course' && n.data?.courseId) {
      courseIdToNodeId[n.data.courseId] = n.id;
    }
  });

  currentNodes.forEach(node => {
    if (node.type === 'course' && node.data?.prerequisites) {
      toPrereqGroups(node.data.prerequisites).forEach(group => {
        group.forEach(prereqId => {
          const sourceId = courseIdToNodeId[prereqId];
          if (sourceId) {
            generatedEdges.push({
              id: `e-${sourceId}-${node.id}`,
              source: sourceId,
              target: node.id,
              style: { stroke: '#aaa', strokeWidth: 2, opacity: 0.8 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#aaa' },
            });
          }
        });
      });
    }
  });

  return generatedEdges;
};

export default function App() {
  const autosaveRef = useRef(loadAutosave());
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState(autosaveRef.current?.curriculumName || 'CPE 2568 (Regular)');
  const [dropdownValue, setDropdownValue] = useState(autosaveRef.current?.curriculumName || 'CPE 2568 (Regular)');
  const [activePlanData, setActivePlanData] = useState(autosaveRef.current?.plan || null);
  const [loadedFileName, setLoadedFileName] = useState(autosaveRef.current?.loadedFileName || null);
  const [resetNonce, setResetNonce] = useState(0);

  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const [isDirty, setIsDirty] = useState(false);

  // One-time hint that the canvas pans; dismissed forever on first pan or click
  const [showPanHint, setShowPanHint] = useState(() => {
    try { return !localStorage.getItem('curriculum-planner-pan-hint'); } catch { return false; }
  });
  const dismissPanHint = useCallback(() => {
    setShowPanHint(false);
    try { localStorage.setItem('curriculum-planner-pan-hint', '1'); } catch { /* best-effort */ }
  }, []);

  const [dialog, setDialog] = useState(null);
  const [showCredits, setShowCredits] = useState(false);
  const showDialog = useCallback((type, message, defaultValue) =>
    new Promise(resolve => setDialog({ type, message, defaultValue, resolve })), []);
  const closeDialog = useCallback((result) => {
    setDialog(d => { d?.resolve(result); return null; });
  }, []);
  const appAlert = useCallback((message) => showDialog('alert', message), [showDialog]);
  const appConfirm = useCallback((message) => showDialog('confirm', message), [showDialog]);
  const appPrompt = useCallback((message, defaultValue) => showDialog('prompt', message, defaultValue), [showDialog]);

  const initialDragPos = useRef(null);
  const fileInputRef = useRef(null);
  const dirtyRef = useRef(false);
  const setDirty = useCallback((v) => { dirtyRef.current = v; setIsDirty(v); }, []);

  const toggleSemesterRef = useRef(null);
  const onToggleSemesterComplete = useCallback((year, sem, completed) => {
    toggleSemesterRef.current?.(year, sem, completed);
  }, []);
  toggleSemesterRef.current = (year, sem, completed) => {
    setDirty(true);
    setNodes((nds) => {
      const semNode = nds.find(n => n.id === `sem-bg-${year}-${sem}`);
      if (!semNode) return nds;
      const updatedNodes = nds.map(node => {
        if (node.type === 'course' && node.data.courseId && isNodeInside(node, semNode)) {
          return {
            ...node,
            draggable: !completed,
            data: { ...node.data, completed }
          };
        }
        return node;
      });
      const finalNodes = updateGameState(updatedNodes, onToggleSemesterComplete);
      setEdges(generateEdgesForNodes(finalNodes));
      return finalNodes;
    });
  };

  const onToggleComplete = useCallback((id, completed) => {
    setDirty(true);
    setNodes((nds) => {
      const updatedNodes = nds.map(node => {
        if (node.id === id) {
          return {
            ...node,
            draggable: !completed,
            data: {
              ...node.data,
              completed
            }
          };
        }
        return node;
      });
      const finalNodes = updateGameState(updatedNodes, onToggleSemesterComplete);
      setEdges(generateEdgesForNodes(finalNodes));
      return finalNodes;
    });
  }, [onToggleSemesterComplete]);

  const onSelectCourse = useCallback((id, selectedCourseId) => {
    setDirty(true);
    setNodes((nds) => {
      const targetNode = nds.find(n => n.id === id);
      const optionType = targetNode?.data?.optionType;
      const currOptions = curriculums[selectedCurriculum]?.options || {};
      const dropdownOptions = optionType ? (currOptions[optionType] || []).map(resolveOption) : [];
      const option = dropdownOptions.find(opt => opt.courseId === selectedCourseId);
      const prereqs = option ? (option.prerequisites || []) : [];

      const updatedNodes = nds.map(node => {
        if (node.id === id) {
          const defaultTitle = node.data.originalTitle || "Select Course";
          return {
            ...node,
            data: {
              ...node.data,
              courseId: selectedCourseId || null,
              courseTitle: option ? option.courseTitle : defaultTitle,
              prerequisites: prereqs,
              cod: !!option?.cod,
              corequisite: option?.corequisite ?? null
            }
          };
        }
        return node;
      });
      const finalNodes = updateGameState(updatedNodes, onToggleSemesterComplete);
      setEdges(generateEdgesForNodes(finalNodes));
      return finalNodes;
    });
  }, [selectedCurriculum, onToggleSemesterComplete]);

  useEffect(() => {
    const curriculumData = curriculums[selectedCurriculum];
    if (!curriculumData || !curriculumData.courses) return;

    const generatedNodes = [];
    const courseLookup = {};

    curriculumData.courses.forEach(c => {
      if (c.courseId) courseLookup[c.courseId] = c;
    });

    for (let year = 1; year <= 8; year++) {
      for (let sem = 1; sem <= 3; sem++) {
        const isSummer = sem === 3;
        generatedNodes.push({
          id: `sem-bg-${year}-${sem}`,
          type: 'default',
          data: { label: createSemesterLabel(year, sem, 0, 0) },
          position: { x: getSemesterX(year, sem), y: 0 },
          style: {
            width: SEMESTER_WIDTH,
            height: SEMESTER_HEIGHT,
            backgroundColor: isSummer ? '#fffcf0' : '#f4f4f9',
            border: '2px dashed #bbb',
            borderRadius: 12,
            zIndex: -1,
            padding: 0,
            boxShadow: 'none'
          },
          draggable: false,
          selectable: false
        });
      }
    }

    const groupedCourses = {};
    curriculumData.courses.forEach(course => {
      let year = course.selectedYear ?? course.suggestedYear ?? 99;
      let sem = course.selectedSemester ?? course.suggestedSemester ?? 99;

      if (activePlanData) {
        const savedCourse = activePlanData.find(p => p.id === course.id);
        if (savedCourse) {
          year = savedCourse.selectedYear !== null ? savedCourse.selectedYear : 99;
          sem = savedCourse.selectedSemester !== null ? savedCourse.selectedSemester : 99;
        }
      }

      const key = `${year}-${sem}`;
      if (!groupedCourses[key]) groupedCourses[key] = [];
      groupedCourses[key].push(course);
    });

    Object.keys(groupedCourses).forEach(key => {
      const courses = groupedCourses[key];
      const [year, sem] = key.split('-').map(Number);

      // Restore each card to its saved row; courses without a saved row fill
      // the remaining free rows top-down (keeps saved arrangement intact).
      const savedRowOf = (course) => {
        const saved = activePlanData?.find(p => p.id === course.id);
        return Number.isInteger(saved?.rowIndex) && saved.rowIndex >= 0 ? saved.rowIndex : null;
      };
      const usedRows = new Set(courses.map(savedRowOf).filter(r => r !== null));
      let nextFree = 0;
      const rowFor = (course) => {
        const saved = savedRowOf(course);
        if (saved !== null) return saved;
        while (usedRows.has(nextFree)) nextFree++;
        usedRows.add(nextFree);
        return nextFree;
      };

      courses.forEach(course => {
        const colX = getSemesterX(year, sem);
        const cardX = colX + (SEMESTER_WIDTH - COURSE_WIDTH) / 2;
        const cardY = TOP_PADDING + rowFor(course) * (COURSE_HEIGHT + COURSE_GAP);

        const shared = course.courseId ? resolveCourse(course.courseId) : null;
        const baseCourseTitle = shared ? shared.courseTitle : course.courseTitle;
        const baseCreditHours = shared ? shared.creditHours : course.creditHours;
        const baseCourseType = shared ? shared.courseType : course.courseType;
        const basePrerequisites = shared ? (shared.prerequisites ?? []) : (course.prerequisites || []);
        const baseCod = !!shared?.cod;
        const baseCorequisite = shared?.corequisite ?? null;

        // Requirement bucket (GenEd / Specialization / Free Elective): curriculum
        // entry may override; otherwise slots classify by their label and
        // concrete courses by courseType.
        const slotTitle = (course.courseTitle || '').toLowerCase();
        const requirementGroup = course.requirementGroup ?? (
          course.courseId
            ? (shared?.courseType === 'gen edu' ? 'gened' : 'specialization')
            : (slotTitle.includes('free elec') ? 'free'
              : (slotTitle.includes('major elec') || slotTitle.includes('training')) ? 'specialization'
              : 'gened')
        );

        const optionType = course.courseId === null ? getOptionType(baseCourseTitle) : null;
        const currOptions = curriculumData.options || {};
        const dropdownOptions = optionType ? (currOptions[optionType] || []).map(resolveOption) : [];

        let completed = false;
        let courseId = course.courseId;
        let courseTitle = baseCourseTitle;
        let prerequisites = basePrerequisites;
        let cod = baseCod;
        let corequisite = baseCorequisite;

        if (activePlanData) {
          const savedCourse = activePlanData.find(p => p.id === course.id);
          if (savedCourse) {
            completed = savedCourse.completed || false;
            if (optionType && savedCourse.courseId) {
              courseId = savedCourse.courseId;
              const opt = dropdownOptions.find(o => o.courseId === savedCourse.courseId);
              if (opt) {
                courseTitle = opt.courseTitle;
                prerequisites = opt.prerequisites || [];
                cod = !!opt.cod;
                corequisite = opt.corequisite ?? null;
              }
            }
          }
        }

        generatedNodes.push({
          id: course.id,
          type: 'course',
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          draggable: !completed,
          data: {
            courseId: courseId,
            creditHours: baseCreditHours,
            prerequisites: prerequisites || [],
            suggestedYear: course.suggestedYear,
            suggestedSemester: course.suggestedSemester,
            currentYear: year === 99 ? null : year,
            currentSemester: sem === 99 ? null : sem,
            courseTitle: courseTitle,
            originalTitle: baseCourseTitle,
            courseType: baseCourseType,
            requirementGroup: requirementGroup,
            cod: cod,
            corequisite: corequisite,
            completed: completed,
            onToggleComplete: onToggleComplete,
            optionType: optionType,
            dropdownOptions: dropdownOptions,
            onSelectCourse: onSelectCourse
          },
          position: { x: cardX, y: cardY },
          style: {
            width: COURSE_WIDTH,
            height: COURSE_HEIGHT,
            background: 'white',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '12px',
            zIndex: 10
          }
        });
      });
    });

    const finalNodes = updateGameState(generatedNodes, onToggleSemesterComplete);
    setEdges(generateEdgesForNodes(finalNodes));
    setNodes(finalNodes);

  }, [selectedCurriculum, activePlanData, resetNonce, onToggleComplete, onSelectCourse, onToggleSemesterComplete]);

  // Autosave: mirror the current plan into localStorage on every change
  useEffect(() => {
    const courseNodes = nodes.filter(n => n.type === 'course');
    if (courseNodes.length === 0) return;
    const plan = courseNodes.map(n => ({
      id: n.id,
      courseId: n.data.courseId,
      selectedYear: n.data.currentYear,
      selectedSemester: n.data.currentSemester,
      rowIndex: Math.max(0, Math.round((n.position.y - TOP_PADDING) / (COURSE_HEIGHT + COURSE_GAP))),
      completed: !!n.data.completed
    }));
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        curriculumName: selectedCurriculum,
        plan,
        loadedFileName
      }));
    } catch { /* storage full or unavailable: autosave is best-effort */ }
  }, [nodes, selectedCurriculum, loadedFileName]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onNodeDragStart = useCallback((event, node) => {
    if (node.type === 'course') {
      initialDragPos.current = node.position;
    }
  }, []);

  const onNodeDragStop = useCallback((event, node) => {
    if (node.type === 'course') {
      setDirty(true);
      const nodeCenterX = node.position.x + (COURSE_WIDTH / 2);
      const nodeCenterY = node.position.y + (COURSE_HEIGHT / 2);

      let snappedPosition = null;

      for (let year = 1; year <= 8; year++) {
        for (let sem = 1; sem <= 3; sem++) {
          const colX = getSemesterX(year, sem);
          const slotX = colX + (SEMESTER_WIDTH - COURSE_WIDTH) / 2;
          for (let i = 0; i < 10; i++) {
            const slotY = TOP_PADDING + i * (COURSE_HEIGHT + COURSE_GAP);
            if (
              nodeCenterX >= slotX && nodeCenterX <= slotX + COURSE_WIDTH &&
              nodeCenterY >= slotY && nodeCenterY <= slotY + COURSE_HEIGHT
            ) {
              snappedPosition = { x: slotX, y: slotY };
              break;
            }
          }
          if (snappedPosition) break;
        }
        if (snappedPosition) break;
      }

      setNodes((currentNodes) => {
        let finalPosition = node.position;

        if (snappedPosition) {
          const isOccupied = currentNodes.some(n =>
            n.id !== node.id &&
            n.type === 'course' &&
            Math.abs(n.position.x - snappedPosition.x) < 1 &&
            Math.abs(n.position.y - snappedPosition.y) < 1
          );

          if (isOccupied) {
            finalPosition = initialDragPos.current || node.position;
          } else {
            finalPosition = snappedPosition;
          }
        }

        const nodesWithSnap = currentNodes.map(n =>
          n.id === node.id ? { ...n, position: finalPosition } : n
        );

        const finalNodes = updateGameState(nodesWithSnap, onToggleSemesterComplete);
        setEdges(generateEdgesForNodes(finalNodes));
        return finalNodes;
      });
    }
  }, [onToggleSemesterComplete]);

  const handleExport = async () => {
    // File name identifies the student: 650610000_cpe_2568_regular_plan.json
    const suggested = (loadedFileName || '').match(/^(\d{6,})/)?.[1] || '';
    const student = await appPrompt('Student ID (or short name) for the file name:', suggested);
    if (student === null) return;
    const studentSlug = student.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();

    const courseNodes = nodes.filter(n => n.type === 'course');

    const plan = courseNodes.map(n => ({
      id: n.id,
      courseId: n.data.courseId,
      selectedYear: n.data.currentYear,
      selectedSemester: n.data.currentSemester,
      rowIndex: Math.max(0, Math.round((n.position.y - TOP_PADDING) / (COURSE_HEIGHT + COURSE_GAP))),
      completed: !!n.data.completed
    }));

    const exportData = {
      curriculumName: selectedCurriculum,
      savedAt: new Date().toISOString(),
      plan: plan
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const curriculumSlug = selectedCurriculum.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
    const fileName = `${studentSlug ? `${studentSlug}_` : ''}${curriculumSlug}_plan.json`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLoadedFileName(fileName);
    setDirty(false);
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    event.target.value = null;
    if (!file) return;

    if (dirtyRef.current && !(await appConfirm('Opening a plan will discard your unsaved changes. Continue?'))) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.curriculumName && curriculums[parsed.curriculumName]) {
          setSelectedCurriculum(parsed.curriculumName);
          setActivePlanData(parsed.plan);
          setLoadedFileName(file.name);
          setDropdownValue(parsed.curriculumName);
          setDirty(false);
        } else {
          appAlert("Unrecognized curriculum in the imported file!");
        }
      } catch {
        appAlert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleDropdownChange = async (e) => {
    const val = e.target.value;
    if (val === "" || val === selectedCurriculum) return;
    if (dirtyRef.current && !(await appConfirm('Switching curriculum will discard your unsaved changes. Continue?'))) {
      return;
    }
    setDropdownValue(val);
    setSelectedCurriculum(val);
    setActivePlanData(null);
    setLoadedFileName(null);
    setDirty(false);
  };

  const handleReset = async () => {
    if (!(await appConfirm(`Reset to the default ${selectedCurriculum} template? This discards the current plan.`))) {
      return;
    }
    setActivePlanData(null);
    setLoadedFileName(null);
    setDropdownValue(selectedCurriculum);
    setResetNonce(n => n + 1);
    setDirty(false);
  };

  // Hover highlight: computed live from base nodes/edges, never stored back into state
  const displayEdges = useMemo(() => {
    if (!hoveredNodeId) return edges;
    return edges.map(edge => {
      if (edge.source === hoveredNodeId) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: '#3b82f6', strokeWidth: 3, opacity: 1,
            filter: 'drop-shadow(0 0 4px #3b82f6)'
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          zIndex: 5
        };
      }
      if (edge.target === hoveredNodeId) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: '#22c55e', strokeWidth: 3, opacity: 1,
            filter: 'drop-shadow(0 0 4px #22c55e)'
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
          zIndex: 5
        };
      }
      return edge;
    });
  }, [edges, hoveredNodeId]);

  const displayNodes = useMemo(() => {
    if (!hoveredNodeId) return nodes;
    const prereqIds = new Set();
    const dependentIds = new Set();
    edges.forEach(edge => {
      if (edge.target === hoveredNodeId) prereqIds.add(edge.source);
      if (edge.source === hoveredNodeId) dependentIds.add(edge.target);
    });
    return nodes.map(node => {
      if (node.type !== 'course') return node;
      if (node.id === hoveredNodeId) {
        return { ...node, style: { ...node.style, boxShadow: '0 0 12px 3px rgba(245, 158, 11, 0.8)' } };
      }
      if (prereqIds.has(node.id)) {
        return { ...node, style: { ...node.style, boxShadow: '0 0 12px 3px rgba(34, 197, 94, 0.8)' } };
      }
      if (dependentIds.has(node.id)) {
        return { ...node, style: { ...node.style, boxShadow: '0 0 12px 3px rgba(59, 130, 246, 0.8)' } };
      }
      return node;
    });
  }, [nodes, edges, hoveredNodeId]);

  const onNodeMouseEnter = useCallback((event, node) => {
    if (node.type === 'course') setHoveredNodeId(node.id);
  }, []);
  const onNodeMouseLeave = useCallback(() => setHoveredNodeId(null), []);

  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const fitHeightZoom = screenHeight / 1600;

  const courseNodes = nodes.filter(n => n.type === 'course');
  const totalCredits = courseNodes.reduce((sum, n) => sum + (n.data.creditHours || 0), 0);
  const completedCredits = courseNodes.reduce((sum, n) => sum + (n.data.completed ? (n.data.creditHours || 0) : 0), 0);
  const progressPercent = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;

  // Official requirement structure, e.g. ISCE = GenEd 24 / Specialization 107 / Free 6
  const categoryLabel = { gened: 'GenEd', specialization: 'Spec', free: 'Free' };
  const categoryStats = { GenEd: { done: 0, total: 0 }, Spec: { done: 0, total: 0 }, Free: { done: 0, total: 0 } };
  courseNodes.forEach(n => {
    const cat = categoryStats[categoryLabel[n.data.requirementGroup] || 'Spec'];
    const cr = n.data.creditHours || 0;
    cat.total += cr;
    if (n.data.completed) cat.done += cr;
  });

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>

      <div style={{
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 10,
        background: 'white',
        padding: '8px 16px',
        borderBottom: '1px solid #ccc',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        fontFamily: 'sans-serif',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', width: '78px' }}>Curriculum:</label>
            <select
              value={dropdownValue}
              onChange={handleDropdownChange}
              style={{ padding: '4px 8px', fontSize: '13px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #aaa', width: '210px', boxSizing: 'border-box' }}
            >
              {Object.keys(curriculums).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '20px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', width: '78px' }}>Plan:</label>
            <span
              title={isDirty ? 'This plan has changes that are not saved to a file yet (autosaved in this browser)' : 'Loaded plan file'}
              style={{
                fontSize: '12px',
                color: loadedFileName ? '#555' : '#999',
                fontStyle: loadedFileName ? 'normal' : 'italic',
                background: isDirty ? '#fdf3d1' : 'transparent',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              {loadedFileName || 'not saved to a file yet'}
            </span>
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #ddd', height: '32px' }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '190px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: totalCredits > 0 && completedCredits === totalCredits ? '#28a745' : '#555', fontFamily: 'sans-serif' }}>
            Progress: {completedCredits}/{totalCredits} CR ({progressPercent}%)
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#28a745', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#777' }}>
            {Object.entries(categoryStats).map(([name, s]) => (
              <span key={name} style={s.total > 0 && s.done === s.total ? { color: '#28a745', fontWeight: 'bold' } : undefined}>
                {name} {s.done}/{s.total}
              </span>
            ))}
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #ddd', height: '32px' }}></div>

        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '10px', rowGap: '3px', maxWidth: '230px', fontSize: '11px', color: '#555' }}>
          {COURSE_TYPES.map(t => (
            <span key={t.type} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '4px', height: '12px', borderRadius: '2px', background: t.color }} />
              {t.label}
            </span>
          ))}
        </div>

        <div style={{ borderLeft: '1px solid #ddd', height: '32px' }}></div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExport}
            title="Download the current plan as a JSON file"
            style={{ padding: '6px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Save Plan
          </button>

          <button
            onClick={() => fileInputRef.current.click()}
            title="Open a previously saved plan file"
            style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Open Plan
          </button>

          <button
            onClick={handleReset}
            title="Reset to the default template for this curriculum"
            style={{ padding: '6px 12px', background: '#fff', color: '#666', border: '1px solid #aaa', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Reset
          </button>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>

        <button
          onClick={() => setShowCredits(true)}
          title="Contributors and acknowledgements"
          style={{ marginLeft: 'auto', padding: '6px 12px', background: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
        >
          Credits
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {showPanHint && (
          <div
            onClick={dismissPanHint}
            style={{
              position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 20, display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(40,40,40,0.85)', color: '#fff', padding: '8px 14px',
              borderRadius: '18px', fontSize: '13px', fontFamily: 'sans-serif', cursor: 'pointer'
            }}
          >
            Drag to pan &nbsp;·&nbsp; Scroll to zoom
            <span style={{ fontWeight: 'bold', opacity: 0.7 }}>✕</span>
          </div>
        )}
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onMoveStart={showPanHint ? dismissPanHint : undefined}
          defaultViewport={{ x: 50, y: 50, zoom: fitHeightZoom }}
          minZoom={0.1}
        >
          <Background color="#f0f0f0" gap={25} />
          <Controls />
          <MiniMap pannable zoomable style={{ width: 240, height: 135 }} />
        </ReactFlow>
      </div>

      <CreditsModal open={showCredits} onClose={() => setShowCredits(false)} />
      <DialogModal dialog={dialog} onClose={closeDialog} />
    </div>
  );
}