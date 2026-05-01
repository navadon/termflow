import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  applyNodeChanges, 
  applyEdgeChanges,
  Position,
  MarkerType
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
import templateCatalog from './data/catalog-template.json';

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
    'ISNE 2565 (Co-op)': isne2565Coop,
    'Template': templateCatalog
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

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState('CPE 2568 (Regular)');
  const [activePlanData, setActivePlanData] = useState(null);

  const initialDragPos = useRef(null);
  const fileInputRef = useRef(null);

  const createSemesterLabel = (year, sem, credits) => {
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
                    background: credits > 22 ? '#d9534f' : '#555', 
                    padding: '4px 10px', 
                    borderRadius: '12px',
                }}>
                    {credits} CR
                </div>
            </div>
        </div>
    );
  };

  const updateGameState = (currentNodes) => {
    const nodeLocationMap = {};     
    const semesterCreditMap = {};   
    const courseIdToNodeId = {};    

    currentNodes.forEach(n => {
        if (n.id.startsWith('sem-bg')) semesterCreditMap[n.id] = 0;
        
        if (n.type === 'default' && !n.id.startsWith('sem-bg')) {
            if (n.data.courseId) {
                courseIdToNodeId[n.data.courseId] = n.id;
            }
        }
    });

    currentNodes.forEach(courseNode => {
        if (courseNode.type !== 'default' || courseNode.id.startsWith('sem-bg')) return;

        const parentSem = currentNodes.find(semNode => 
            semNode.id.startsWith('sem-bg') && isNodeInside(courseNode, semNode)
        );

        if (parentSem) {
            const parts = parentSem.id.split('-');
            const year = parseInt(parts[2]);
            const sem = parseInt(parts[3]);

            nodeLocationMap[courseNode.id] = { year, sem };
            semesterCreditMap[parentSem.id] += (courseNode.data.creditHours || 0);
        } else {
            nodeLocationMap[courseNode.id] = { year: 99, sem: 99 }; 
        }
    });

    return currentNodes.map(node => {
        if (node.id.startsWith('sem-bg')) {
            const parts = node.id.split('-');
            const year = parseInt(parts[2]);
            const sem = parseInt(parts[3]);
            const credits = semesterCreditMap[node.id] || 0;
            return {
                ...node,
                data: { ...node.data, label: createSemesterLabel(year, sem, credits) }
            };
        }

        if (node.type === 'default') {
            const myLoc = nodeLocationMap[node.id];
            const prereqs = node.data.prerequisites || []; 
            
            let isInvalid = false;

            prereqs.forEach(prereqCode => { 
                const prereqNodeId = courseIdToNodeId[prereqCode];
                if (prereqNodeId) {
                    const prereqLoc = nodeLocationMap[prereqNodeId];
                    if (prereqLoc) {
                        if (prereqLoc.year > myLoc.year) isInvalid = true;
                        if (prereqLoc.year === myLoc.year && prereqLoc.sem >= myLoc.sem) isInvalid = true;
                    }
                }
            });

            const isMovedFromSuggested = myLoc.year !== node.data.suggestedYear || myLoc.sem !== node.data.suggestedSemester;

            return {
                ...node,
                data: {
                    ...node.data,
                    currentYear: myLoc.year === 99 ? null : myLoc.year,
                    currentSemester: myLoc.sem === 99 ? null : myLoc.sem
                },
                style: {
                    ...node.style,
                    background: isMovedFromSuggested ? '#fffacd' : 'white',
                    border: isInvalid ? '4px solid red' : '1px solid #333',
                    boxShadow: isInvalid ? '0 0 15px rgba(255,0,0,0.6)' : 'none',
                    transition: 'background 0.3s ease, border 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease'
                }
            };
        }
        return node;
    });
  };

  useEffect(() => {
    const catalogData = curriculums[selectedCurriculum];
    if (!catalogData || !catalogData.courses) return;

    const generatedNodes = [];
    const generatedEdges = [];
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
          data: { label: createSemesterLabel(year, sem, 0) }, 
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
        const cardX = colX + (SEMESTER_WIDTH - COURSE_WIDTH)/2;
        const cardY = TOP_PADDING + index * (COURSE_HEIGHT + COURSE_GAP);

        generatedNodes.push({
          id: course.id,
          type: 'default',
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: { 
            courseId: course.courseId, 
            creditHours: course.creditHours,
            prerequisites: course.prerequisites, 
            suggestedYear: course.suggestedYear,
            suggestedSemester: course.suggestedSemester,
            currentYear: year === 99 ? null : year, 
            currentSemester: sem === 99 ? null : sem, 
            label: (
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: 8, paddingBottom: 4 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#444' }}>
                    {course.courseId || 'GenEd'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                    {course.creditHours} CR
                  </div>
                </div>
                <div style={{ fontSize: '16px', lineHeight: '1.25', fontWeight: '600', color: '#000' }}>
                    {course.courseTitle}
                </div>
              </div>
            ) 
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

    catalogData.courses.forEach(course => {
        if (!course.prerequisites) return;
        course.prerequisites.forEach(prereqId => {
            const prereqCourse = courseLookup[prereqId];
            if (prereqCourse) {
                generatedEdges.push({
                    id: `e-${prereqCourse.id}-${course.id}`,
                    source: prereqCourse.id, 
                    target: course.id,       
                    style: { stroke: '#aaa', strokeWidth: 2, opacity: 0.8 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#aaa' },
                });
            }
        });
    });

    setEdges(generatedEdges);
    setNodes(updateGameState(generatedNodes));

  }, [selectedCurriculum, activePlanData]); 

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onNodeDragStart = useCallback((event, node) => {
    if (node.type === 'default' && !node.id.startsWith('sem-bg')) {
        initialDragPos.current = node.position;
    }
  }, []);

  const onNodeDragStop = useCallback((event, node) => {
    if (node.type === 'default' && !node.id.startsWith('sem-bg')) {
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
                    n.type === 'default' && 
                    !n.id.startsWith('sem-bg') && 
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
            
            return updateGameState(nodesWithSnap);
        });
    }
  }, []);

  const handleExport = () => {
    const courseNodes = nodes.filter(n => n.type === 'default' && !n.id.startsWith('sem-bg'));
    
    const plan = courseNodes.map(n => ({
        id: n.id,
        courseId: n.data.courseId,
        selectedYear: n.data.currentYear,
        selectedSemester: n.data.currentSemester
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
            } else {
                alert("Unrecognized curriculum in the imported file!");
            }
        } catch (err) {
            alert("Invalid JSON file.");
        }
    };
    reader.readAsText(file);
    event.target.value = null; 
  };

  const handleDropdownChange = (e) => {
      setSelectedCurriculum(e.target.value);
      setActivePlanData(null); 
  };

  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
  const fitHeightZoom = screenHeight / 1600;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        
      <div style={{
          position: 'absolute',
          top: 20,
          right: 20, // --- MOVED TO TOP-RIGHT ---
          zIndex: 10,
          background: 'white',
          padding: '12px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          fontFamily: 'sans-serif',
          border: '1px solid #ccc',
          display: 'flex',
          gap: '20px', 
          alignItems: 'center'
      }}>
          <div>
              <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Curriculum:</label>
              <select 
                  value={selectedCurriculum} 
                  onChange={handleDropdownChange}
                  style={{ padding: '6px 10px', fontSize: '15px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #aaa' }}
              >
                  {Object.keys(curriculums).map(name => (
                      <option key={name} value={name}>{name}</option>
                  ))}
              </select>
          </div>

          <div style={{ borderLeft: '1px solid #ddd', height: '30px' }}></div>

          <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                  onClick={handleExport}
                  style={{ padding: '8px 16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
              >
                  Export Plan
              </button>
              
              <button 
                  onClick={() => fileInputRef.current.click()}
                  style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
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