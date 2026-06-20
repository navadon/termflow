import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import cpe2563Coop from './data/catalog-cpe2563-coop.json';
import cpe2563Regular from './data/catalog-cpe2563-regular.json';
import cpe2568CoopS1 from './data/catalog-cpe2568-coop-s1.json';
import cpe2568CoopS2 from './data/catalog-cpe2568-coop-s2.json';
import cpe2568Regular from './data/catalog-cpe2568-regular.json';
import isce2569CysecCoop from './data/catalog-isce2569-cysec-coop.json';
import isce2569CysecRegular from './data/catalog-isce2569-cysec-regular.json';
import isce2569InfosysCoop from './data/catalog-isce2569-infosys-coop.json';
import isce2569InfosysRegular from './data/catalog-isce2569-infosys-regular.json';
import isne2565Coop from './data/catalog-isne2565-coop.json';
import isne2565Regular from './data/catalog-isne2565-regular.json';

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
  'ISNE 2565 (Regular)': isne2565Regular,
  'ISNE 2565 (Co-op)': isne2565Coop
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

const CourseNode = ({ id, data }) => {
  const isSummer = data.suggestedSemester === 3;
  const suggestedLabel = isSummer
    ? `Y${data.suggestedYear}-Summer`
    : `Y${data.suggestedYear}-${data.suggestedSemester}`;
  const isOffSchedule = data.currentYear !== data.suggestedYear || data.currentSemester !== data.suggestedSemester;

  if (data.optionType) {
    const placeholder = getOptionPlaceholder(data.optionType);
    const dropdownOptions = data.dropdownOptions || [];
    return (
      <>
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
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
              {data.creditHours} CR
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
                maxWidth: '160px',
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
                minWidth: '24px',
                minHeight: '24px',
                flexShrink: 0,
                marginTop: '0px',
                accentColor: '#28a745'
              }}
            />
          </div>
        </div>
        <Handle type="source" position={Position.Right} />
      </>
    );
  }

  return (
    <>
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
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
            {data.creditHours} CR
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
          <div style={{ fontSize: '16px', lineHeight: '1.25', fontWeight: '600', color: '#000', flex: 1 }}>
            {data.courseTitle}
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
            style={{
              cursor: 'pointer',
              width: '24px',
              height: '24px',
              minWidth: '24px',
              minHeight: '24px',
              flexShrink: 0,
              marginTop: '0px',
              accentColor: '#28a745'
            }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
};

const nodeTypes = {
  course: CourseNode
};

const createSemesterLabel = (year, sem, totalCredits, completedCredits = 0) => {
  const isSummer = sem === 3;
  const titleText = isSummer ? `Y${year}-Summer` : `Y${year}-${sem}`;

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
      </div>
    </div>
  );
};

const updateGameState = (currentNodes) => {
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
      semesterCreditMap[n.id] = { total: 0, completed: 0 };
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
        semesterCreditMap[parentSem.id] = { total: 0, completed: 0 };
      }
      semesterCreditMap[parentSem.id].total += (courseNode.data.creditHours || 0);
      if (courseNode.data.completed) {
        semesterCreditMap[parentSem.id].completed += (courseNode.data.creditHours || 0);
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
      const semStats = semesterCreditMap[node.id] || { total: 0, completed: 0 };
      return {
        ...node,
        data: { ...node.data, label: createSemesterLabel(year, sem, semStats.total, semStats.completed) }
      };
    }

    if (node.type === 'course') {
      const myLoc = nodeLocationMap[node.id];
      const prereqs = node.data.prerequisites || [];

      let isInvalid = false;
      const missingPrereqs = [];

      prereqs.forEach(prereqCode => {
        const prereqNodeId = courseIdToNodeId[prereqCode];
        if (prereqNodeId) {
          const prereqLoc = nodeLocationMap[prereqNodeId];
          if (prereqLoc) {
            if (prereqLoc.year > myLoc.year) isInvalid = true;
            if (prereqLoc.year === myLoc.year && prereqLoc.sem >= myLoc.sem) isInvalid = true;
          }
        } else {
          isInvalid = true;
          missingPrereqs.push(prereqCode);
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
      node.data.prerequisites.forEach(prereqId => {
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
    }
  });

  return generatedEdges;
};

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState('CPE 2568 (Regular)');
  const [dropdownValue, setDropdownValue] = useState('CPE 2568 (Regular)');
  const [activePlanData, setActivePlanData] = useState(null);
  const [loadedFileName, setLoadedFileName] = useState(null);

  const initialDragPos = useRef(null);
  const fileInputRef = useRef(null);

  const onToggleComplete = useCallback((id, completed) => {
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
      const finalNodes = updateGameState(updatedNodes);
      setEdges(generateEdgesForNodes(finalNodes));
      return finalNodes;
    });
  }, []);

  const onSelectCourse = useCallback((id, selectedCourseId) => {
    setNodes((nds) => {
      const targetNode = nds.find(n => n.id === id);
      const optionType = targetNode?.data?.optionType;
      const currOptions = curriculums[selectedCurriculum]?.options || {};
      const dropdownOptions = optionType ? (currOptions[optionType] || []) : [];
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
              prerequisites: prereqs
            }
          };
        }
        return node;
      });
      const finalNodes = updateGameState(updatedNodes);
      setEdges(generateEdgesForNodes(finalNodes));
      return finalNodes;
    });
  }, [selectedCurriculum]);

  useEffect(() => {
    const catalogData = curriculums[selectedCurriculum];
    if (!catalogData || !catalogData.courses) return;

    const generatedNodes = [];
    const courseLookup = {};

    catalogData.courses.forEach(c => {
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
    catalogData.courses.forEach(course => {
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

      courses.forEach((course, index) => {
        const colX = getSemesterX(year, sem);
        const cardX = colX + (SEMESTER_WIDTH - COURSE_WIDTH) / 2;
        const cardY = TOP_PADDING + index * (COURSE_HEIGHT + COURSE_GAP);

        const optionType = course.courseId === null ? getOptionType(course.courseTitle) : null;
        const currOptions = catalogData.options || {};
        const dropdownOptions = optionType ? (currOptions[optionType] || []) : [];

        let completed = false;
        let courseId = course.courseId;
        let courseTitle = course.courseTitle;
        let prerequisites = course.prerequisites;

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
            creditHours: course.creditHours,
            prerequisites: prerequisites || [],
            suggestedYear: course.suggestedYear,
            suggestedSemester: course.suggestedSemester,
            currentYear: year === 99 ? null : year,
            currentSemester: sem === 99 ? null : sem,
            courseTitle: courseTitle,
            originalTitle: course.courseTitle,
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

    const finalNodes = updateGameState(generatedNodes);
    setEdges(generateEdgesForNodes(finalNodes));
    setNodes(finalNodes);

  }, [selectedCurriculum, activePlanData, onToggleComplete, onSelectCourse]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onNodeDragStart = useCallback((event, node) => {
    if (node.type === 'course') {
      initialDragPos.current = node.position;
    }
  }, []);

  const onNodeDragStop = useCallback((event, node) => {
    if (node.type === 'course') {
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

        const finalNodes = updateGameState(nodesWithSnap);
        setEdges(generateEdgesForNodes(finalNodes));
        return finalNodes;
      });
    }
  }, []);

  const handleExport = () => {
    const courseNodes = nodes.filter(n => n.type === 'course');

    const plan = courseNodes.map(n => ({
      id: n.id,
      courseId: n.data.courseId,
      selectedYear: n.data.currentYear,
      selectedSemester: n.data.currentSemester,
      completed: !!n.data.completed
    }));

    const exportData = {
      curriculumName: selectedCurriculum,
      plan: plan
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCurriculum.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_plan.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.curriculumName && curriculums[parsed.curriculumName]) {
          setSelectedCurriculum(parsed.curriculumName);
          setActivePlanData(parsed.plan);
          setLoadedFileName(file.name);
          setDropdownValue("");
        } else {
          alert("Unrecognized curriculum in the imported file!");
        }
      } catch {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleDropdownChange = (e) => {
    const val = e.target.value;
    if (val === "") return;
    setDropdownValue(val);
    setSelectedCurriculum(val);
    setActivePlanData(null);
    setLoadedFileName(null);
  };

  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const fitHeightZoom = screenHeight / 1600;

  const courseNodes = nodes.filter(n => n.type === 'course');
  const totalCredits = courseNodes.reduce((sum, n) => sum + (n.data.creditHours || 0), 0);
  const completedCredits = courseNodes.reduce((sum, n) => sum + (n.data.completed ? (n.data.creditHours || 0) : 0), 0);
  const progressPercent = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        background: 'white',
        padding: '8px 14px',
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        fontFamily: 'sans-serif',
        border: '1px solid #ccc',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Curriculum:</label>
            <select
              value={dropdownValue}
              onChange={handleDropdownChange}
              style={{ padding: '4px 8px', fontSize: '13px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #aaa' }}
            >
              <option value="" disabled={!loadedFileName}></option>
              {Object.keys(curriculums).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: '13px', color: '#333', marginTop: '1px', fontFamily: 'sans-serif' }}>
            <span style={{ fontWeight: 'bold' }}>Imported Plan: </span>
            {loadedFileName ? (
              <strong style={{ color: '#28a745' }}>{loadedFileName}</strong>
            ) : (
              <span style={{ color: '#888', fontStyle: 'italic' }}>None (Default template)</span>
            )}
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #ddd', height: '24px' }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '150px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', fontFamily: 'sans-serif' }}>
            Progress: {completedCredits} / {totalCredits} CR ({progressPercent}%)
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#28a745', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #ddd', height: '24px' }}></div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExport}
            style={{ padding: '6px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Export Plan
          </button>

          <button
            onClick={() => fileInputRef.current.click()}
            style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Import Plan
          </button>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        defaultViewport={{ x: 50, y: 50, zoom: fitHeightZoom }}
        minZoom={0.1}
      >
        <Background color="#f0f0f0" gap={25} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}