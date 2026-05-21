import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    applyNodeChanges,
    applyEdgeChanges,
    Position,
    MarkerType,
    BaseEdge,
    useStore,
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

// --- CUSTOM EDGE: หลบ node ที่ขวางอยู่กลางทาง ---
const segmentsIntersect = (ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) => {
    const dx1 = ax2 - ax1, dy1 = ay2 - ay1;
    const dx2 = bx2 - bx1, dy2 = by2 - by1;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-10) return false;
    const t = ((bx1 - ax1) * dy2 - (by1 - ay1) * dx2) / denom;
    const u = ((bx1 - ax1) * dy1 - (by1 - ay1) * dx1) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

const edgePassesThroughNode = (sx, sy, tx, ty, node) => {
    if (!node.position || !node.style) return false;
    const nl = node.position.x;
    const nr = nl + parseFloat(node.style.width || COURSE_WIDTH);
    const nt = node.position.y;
    const nb = nt + parseFloat(node.style.height || COURSE_HEIGHT);
    return (
        segmentsIntersect(sx, sy, tx, ty, nl, nt, nr, nt) ||
        segmentsIntersect(sx, sy, tx, ty, nl, nb, nr, nb) ||
        segmentsIntersect(sx, sy, tx, ty, nl, nt, nl, nb) ||
        segmentsIntersect(sx, sy, tx, ty, nr, nt, nr, nb)
    );
};

const AvoidingEdge = ({
    id, sourceX, sourceY, targetX, targetY,
    source, target, style, markerEnd
}) => {
    const nodes = useStore((s) => s.nodeInternals);
    const edges = useStore((s) => s.edges);

    const siblingOutEdges = edges
        .filter(e => e.source === source)
        .map(e => {
            const targetNode = nodes.get(e.target);
            const ty = targetNode ? targetNode.position.y + (COURSE_HEIGHT / 2) : 0;
            const tx = targetNode ? targetNode.position.x + (COURSE_WIDTH / 2) : 0;
            return { edgeId: e.id, targetY: ty, targetX: tx };
        })
        .sort((a, b) => {
            if (a.targetY < b.targetY) return -1;
            else if (a.targetY > b.targetY) return 1;
            else {
                if (a.targetX < b.targetX) return a.targetY - sourceY;
                else if (a.targetX > b.targetX) return sourceY - a.targetY;
                else return 0;
            };
        });

    const findCenterOutIndex = () => {
        let minYdiff = Infinity, minXdiff = Infinity, centerIndex = 0;
        siblingOutEdges.forEach((e, index) => {
            const ydiff = Math.abs(e.targetY - sourceY);
            const xdiff = Math.abs(e.targetX - sourceX);
            if (ydiff < minYdiff) {
                minYdiff = ydiff;
                minXdiff = xdiff;
                centerIndex = index;
            } else if (ydiff === minYdiff) {
                if (xdiff < minXdiff) {
                    minXdiff = xdiff;
                    centerIndex = index;
                }
            }
        });
        return centerIndex;
    };

    const siblingInEdges = edges
        .filter(e => e.target === target)
        .map(e => {
            const sourceNode = nodes.get(e.source);
            const sy = sourceNode ? sourceNode.position.y + (COURSE_HEIGHT / 2) : 0;
            const sx = sourceNode ? sourceNode.position.x + (COURSE_WIDTH / 2) : 0;
            return { edgeId: e.id, sourceY: sy, sourceX: sx };
        })
        .sort((a, b) => {
            if (a.sourceY < b.sourceY) return -1;
            else if (a.sourceY > b.sourceY) return 1;
            else {
                if (a.sourceX < b.sourceX) return a.sourceY - sourceY;
                else if (a.sourceX > b.sourceX) return sourceY - a.sourceY;
                else return 0;
            };
        });

    const findCenterInIndex = () => {
        let minYdiff = Infinity, minXdiff = Infinity, centerIndex = 0;
        siblingInEdges.forEach((e, index) => {
            const ydiff = Math.abs(e.sourceY - targetY);
            const xdiff = Math.abs(e.sourceX - targetX);
            if (ydiff < minYdiff) {
                minYdiff = ydiff;
                minXdiff = xdiff;
                centerIndex = index;
            } else if (ydiff === minYdiff) {
                if (xdiff < minXdiff) {
                    minXdiff = xdiff;
                    centerIndex = index;
                }
            }
        });
        return centerIndex;
    };

    const spreadOffset = (index, centerIndex) => {
        return (index - centerIndex) * HANDLE_SPREAD;
    };

    const outIndex = siblingOutEdges.findIndex(e => e.edgeId === id);
    const HANDLE_SPREAD = 10;
    const outOffset = spreadOffset(outIndex, findCenterOutIndex());

    const inIndex = siblingInEdges.findIndex(e => e.edgeId === id);
    const inOffset = spreadOffset(inIndex, findCenterInIndex());

    const adjustedSourceY = sourceY + outOffset;
    const adjustedTargetY = targetY + inOffset;

    const blockingNodes = [];
    nodes.forEach((node) => {
        if (node.id === source || node.id === target) return;
        if (node.id.startsWith('sem-bg')) return;
        if (edgePassesThroughNode(sourceX, adjustedSourceY, targetX, adjustedTargetY, node)) {
            blockingNodes.push(node);
        }
    });

    let edgePath;

    if (blockingNodes.length === 0) {
        edgePath = `M ${sourceX} ${adjustedSourceY} L ${targetX} ${adjustedTargetY}`;
    } else {
        let minTop = Infinity;
        blockingNodes.forEach((node) => {
            const nt = node.position.y;
            if (nt < minTop) minTop = nt;
        });

        const MARGIN = 10;
        const stepY = minTop - MARGIN;
        const offset = 22.5;

        edgePath = [
            `M ${sourceX} ${adjustedSourceY}`,
            `L ${sourceX + offset} ${adjustedSourceY}`,
            `L ${sourceX + offset} ${stepY}`,
            `L ${targetX - offset} ${stepY}`,
            `L ${targetX - offset} ${adjustedTargetY}`,
            `L ${targetX} ${adjustedTargetY}`,
        ].join(' ');
    }

    return (
        <BaseEdge
            id={id}
            path={edgePath}
            style={style}
            markerEnd={markerEnd}
        />
    );
};

const edgeTypes = { avoiding: AvoidingEdge };

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
const SUMMER_WIDTH = 270;
const GAP_BETWEEN_SEMESTERS = 20;
const GAP_BETWEEN_YEARS = 20;
const TOP_PADDING = 120;

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
    // --- BASE STATE (data only, no hover/visual effects) ---
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const [selectedCurriculum, setSelectedCurriculum] = useState('CPE 2568 (Regular)');
    const [activePlanData, setActivePlanData] = useState(null);
    const [nodeRowsCount, setNodeRowsCount] = useState(10);

    // --- VISUAL STATE (separate from data state) ---
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    const initialDragPos = useRef(null);
    const lastValidNodePositions = useRef({});  // Track last position inside frame for each node
    const fileInputRef = useRef(null);
    const prevCurriculumRef = useRef(selectedCurriculum);
    const prevPlanRef = useRef(activePlanData);

    // --- DERIVED DISPLAY STATE: computed from base state + visual state ---
    // Edge highlight: computed live, never stored in base edges
    const displayEdges = useMemo(() => {
        if (!hoveredNodeId) return edges;
        return edges.map(edge => {
            if (edge.source === hoveredNodeId) {
                return {
                    ...edge,
                    style: { stroke: '#3b82f6', strokeWidth: 3, opacity: 1, 
                        filter: 'drop-shadow(0px 4px 8px rgb(0, 225, 255))' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
                };
            }
            if (edge.target === hoveredNodeId) {
                return {
                    ...edge,
                    style: { stroke: '#f59e0b', strokeWidth: 3, opacity: 1,
                         filter: 'drop-shadow(0px 4px 8px rgb(255, 136, 0))' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }
                };
            }
            return edge;
        });
    }, [edges, hoveredNodeId]);

    // Node hover bg: computed live, never stored in base nodes
    const displayNodes = useMemo(() => {
        return nodes.map(node => {
            if (node.type !== 'default' || node.id.startsWith('sem-bg')) return node;
            const isHovered = node.id === hoveredNodeId;
            if (!isHovered) {
                const hoverNode = nodes.find(n => n.id === hoveredNodeId);
                if (hoverNode && hoverNode.data.prerequisites.includes(node.data.courseId)) {
                    return {
                        ...node,
                        style: {
                            ...node.style,
                            // boxShadow: node.style?.border?.includes('red')
                            //     ? node.style.boxShadow  // keep invalid-node red glow
                            //     : '0 5px 10px rgba(255, 136, 0, 0.9)'
                            boxShadow: '0 5px 10px rgba(255, 136, 0, 0.9)'
                        }
                    };
                }
                if (hoverNode && node.data.prerequisites.includes(hoverNode.data.courseId)) {
                    return {
                        ...node,
                        style: {
                            ...node.style,
                            // boxShadow: node.style?.border?.includes('red')
                            //     ? node.style.boxShadow  // keep invalid-node red glow
                            //     : '0 5px 10px rgba(0, 201, 201, 0.9)'
                            boxShadow: '0 5px 10px rgba(0, 201, 201, 0.9)'
                        }
                    };
                }
                return node;
            }
            return {
                ...node,
                className: 'node-hovered',
                style: {
                    ...node.style,
                    filter: 'brightness(0.9)',
                    boxShadow: node.style?.border?.includes('red')
                        ? node.style.boxShadow  // keep invalid-node red glow
                        : '0 10px 10px rgba(90, 90, 90, 0.9)'
                }
            };
        });
    }, [nodes, hoveredNodeId]);

    const createSemesterLabel = (year, sem, credits) => {
        const isSummer = sem === 3;
        const titleText = isSummer ? `Year ${year} - Summer` : `Year ${year} - Semester ${sem}`;
        const maxCredits = 22;

        const placeholders = [];
        for (let i = 0; i < nodeRowsCount; i++) {
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
                    paddingTop: '15px',
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#333',
                        textAlign: 'center',
                        fontFamily: 'Arial, sans-serif'
                    }}>
                        {titleText}
                    </div>
                    <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#fff',
                        background: credits > maxCredits ? '#d9534f' : '#555',
                        padding: '4px 10px',
                        borderRadius: '12px',
                    }}>
                        {credits} / {maxCredits} Credits
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
                if (n.data.courseId) courseIdToNodeId[n.data.courseId] = n.id;
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
                const isOverload = credits > 22;
                return {
                    ...node,
                    data: { ...node.data, label: createSemesterLabel(year, sem, credits) },
                    style: {
                        ...node.style,
                        border: isOverload ? '2px dashed #d9534f' : '2px dashed #bbb',
                        boxShadow: isOverload ? '0 0 15px rgba(255,0,0,0.6)' : 'none',
                    }
                };
            }

            if (node.type === 'default') {
                const myLoc = nodeLocationMap[node.id];
                const prereqs = node.data.prerequisites || [];

                const rowIndex = Math.round((node.position.y - TOP_PADDING) / (COURSE_HEIGHT + COURSE_GAP));
                const currentRowIndex = Math.max(0, rowIndex);

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

                let borderColor = '#333';
                const courseType = node.data.courseType;
                if (courseType === 'math and sci') borderColor = '#c9c900';
                else if (courseType === 'major courses') borderColor = '#00008b';
                else if (courseType === 'gen engr') borderColor = '#8b1c62';
                else if (courseType === 'gen edu') borderColor = '#008800';
                else if (courseType === 'others') borderColor = '#808080';

                return {
                    ...node,
                    data: {
                        ...node.data,
                        currentYear: myLoc.year === 99 ? null : myLoc.year,
                        currentSemester: myLoc.sem === 99 ? null : myLoc.sem,
                        rowIndex: currentRowIndex
                    },
                    style: {
                        ...node.style,
                        background: isMovedFromSuggested ? '#fffacd' : 'white',

                        // border: isInvalid ? 'none' : `2px solid ${borderColor}`,
                        // backgroundImage: isInvalid 
                        //     ? 'linear-gradient(90deg, red 50%, transparent 50%), linear-gradient(90deg, red 50%, transparent 50%), linear-gradient(0deg, red 50%, transparent 50%), linear-gradient(0deg, red 50%, transparent 50%)' 
                        //     : 'none',
                        // backgroundSize: isInvalid ? '15px 4px, 15px 4px, 4px 15px, 4px 15px' : 'auto',
                        // backgroundPosition: isInvalid ? '0 0,  0 100%, 0 0,  100% 0' : 'auto',
                        // backgroundRepeat: isInvalid ? 'repeat-x, repeat-x, repeat-y, repeat-y' : 'repeat',
                        // animation: isInvalid ? 'moveBorder 0.4s linear infinite' : 'none',
                        
                        border: isInvalid ? '4px solid red' : `2px solid ${borderColor}`,
                        boxShadow: isInvalid ? '0 0 15px rgba(255,0,0,0.6)' : 'none',
                        cursor: 'pointer',
                    }
                };
            }
            return node;
        });
    };

    useEffect(() => {
        const catalogData = curriculums[selectedCurriculum];
        if (!catalogData || !catalogData.courses) return;

        const curriculumChanged = prevCurriculumRef.current !== selectedCurriculum;
        const planChanged = prevPlanRef.current !== activePlanData;

        prevCurriculumRef.current = selectedCurriculum;
        prevPlanRef.current = activePlanData;

        let newRowCount = nodeRowsCount;
        if (curriculumChanged || planChanged) {
            newRowCount = 10;
            if (activePlanData && activePlanData.nodeRowsCount) {
                newRowCount = activePlanData.nodeRowsCount;
            } else if (catalogData.nodeRowsCount) {
                newRowCount = catalogData.nodeRowsCount;
            }

            let maxRowIndex = -1;
            if (activePlanData && Array.isArray(activePlanData)) {
                maxRowIndex = Math.max(...activePlanData.map(p => p.rowIndex || 0), maxRowIndex);
            }
            if (catalogData.courses) {
                maxRowIndex = Math.max(...catalogData.courses.map(c => c.rowIndex || 0), maxRowIndex);
            }

            const requiredRowCount = maxRowIndex >= 0 ? Math.max(maxRowIndex + 1, newRowCount) : newRowCount;
            setNodeRowsCount(requiredRowCount);
            newRowCount = requiredRowCount;
        }

        const calculatedSemesterHeight = TOP_PADDING + newRowCount * (COURSE_HEIGHT + COURSE_GAP);

        const generatedNodes = [];
        const generatedEdges = [];
        const courseLookup = {};

        catalogData.courses.forEach(c => {
            if (c.courseId) courseLookup[c.courseId] = c;
        });

        // Helper: คำนวณ total credits สำหรับเทอมนั้น ๆ
        const calculateSemesterCredits = (year, sem) => {
            let totalCredits = 0;
            
            // ใช้ activePlanData ถ้ามี (เพราะ user อาจลากมาแล้ว)
            if (activePlanData && Array.isArray(activePlanData)) {
                activePlanData.forEach(plan => {
                    if (plan.selectedYear === year && plan.selectedSemester === sem) {
                        totalCredits += plan.creditHours || 0;
                    }
                });
            } else {
                // ใช้ catalog data (ตำแหน่งเดิม)
                catalogData.courses.forEach(course => {
                    const courseYear = course.selectedYear ?? course.suggestedYear ?? 99;
                    const courseSem = course.selectedSemester ?? course.suggestedSemester ?? 99;
                    if (courseYear === year && courseSem === sem) {
                        totalCredits += course.creditHours || 0;
                    }
                });
            }
            return totalCredits;
        };

        for (let year = 1; year <= 8; year++) {
            for (let sem = 1; sem <= 3; sem++) {
                const isSummer = sem === 3;
                const semesterCredits = calculateSemesterCredits(year, sem);
                generatedNodes.push({
                    id: `sem-bg-${year}-${sem}`,
                    type: 'default',
                    data: { label: createSemesterLabel(year, sem, semesterCredits) },
                    position: { x: getSemesterX(year, sem), y: 0 },
                    style: {
                        width: SEMESTER_WIDTH,
                        height: calculatedSemesterHeight,
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

                let rowIndex = index;
                if (activePlanData) {
                    const savedCourse = activePlanData.find(p => p.id === course.id);
                    if (savedCourse && savedCourse.rowIndex !== undefined) {
                        rowIndex = savedCourse.rowIndex;
                    } else if (course.rowIndex !== undefined) {
                        rowIndex = course.rowIndex;
                    }
                } else if (course.rowIndex !== undefined) {
                    rowIndex = course.rowIndex;
                }

                const cardY = TOP_PADDING + rowIndex * (COURSE_HEIGHT + COURSE_GAP);

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
                        rowIndex: rowIndex,
                        courseType: course.courseType,
                        label: (
                            // onPointerEnter/Leave on the label div drives hover state.
                            // onClick clears selection (click = select, not hover).
                            // Using pointer events instead of mouse events for
                            // better reliability during drag operations.
                            <div
                                onPointerEnter={() => setHoveredNodeId(course.id)}
                                onPointerLeave={() => setHoveredNodeId(null)}
                                onClick={() => setSelectedNodeId(prev => prev === course.id ? null : course.id)}
                                style={{
                                    textAlign: 'left',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    justifyContent: 'flex-start',
                                    userSelect: 'none'
                                }}>
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
                        type: 'avoiding',
                        // Base style only — highlight is applied in displayEdges (useMemo)
                        style: { stroke: '#000000', strokeWidth: 2, opacity: 0.8 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#000000' },
                    });
                }
            });
        });

        setEdges(generatedEdges);
        setNodes(updateGameState(generatedNodes));

    }, [selectedCurriculum, activePlanData]);

    // Update semester height when nodeRowsCount changes (without regenerating nodes)
    useEffect(() => {
        const calculatedSemesterHeight = TOP_PADDING + nodeRowsCount * (COURSE_HEIGHT + COURSE_GAP);
        
        setNodes(prevNodes => {
            return prevNodes.map(node => {
                if (node.id.startsWith('sem-bg')) {
                    const parts = node.id.split('-');
                    const year = parseInt(parts[2]);
                    const sem = parseInt(parts[3]);
                    
                    // Calculate total credits for this semester from current nodes
                    let semesterCredits = 0;
                    prevNodes.forEach(n => {
                        if (n.data?.currentYear === year && n.data?.currentSemester === sem) {
                            semesterCredits += n.data?.creditHours || 0;
                        }
                    });

                    return {
                        ...node,
                        style: {
                            ...node.style,
                            height: calculatedSemesterHeight
                        },
                        data: {
                            ...node.data,
                            label: createSemesterLabel(year, sem, semesterCredits)
                        }
                    };
                }
                return node;
            });
        });
    }, [nodeRowsCount]);

    // Helper: ตรวจสอบว่าตำแหน่งอยู่ในกรอบ semester ใดหรือไม่
    // ใช้ center ของ node เพื่อความแม่นยำ (ไม่อนุญาตให้อยู่ระหว่างกรอบ)
    const isPositionInsideFrame = useCallback((position) => {
        if (!position) return false;
        
        const nodeCenterX = position.x + (COURSE_WIDTH / 2);
        const nodeCenterY = position.y + (COURSE_HEIGHT / 2);
        
        for (let year = 1; year <= 8; year++) {
            for (let sem = 1; sem <= 3; sem++) {
                const colX = getSemesterX(year, sem);
                const frameLeft = colX + (SEMESTER_WIDTH - COURSE_WIDTH) / 2;
                const frameRight = frameLeft + COURSE_WIDTH;
                
                for (let i = 0; i < nodeRowsCount; i++) {
                    const slotY = TOP_PADDING + i * (COURSE_HEIGHT + COURSE_GAP);
                    const slotBottom = slotY + COURSE_HEIGHT;
                    
                    if (
                        nodeCenterX >= frameLeft &&
                        nodeCenterX <= frameRight &&
                        nodeCenterY >= slotY &&
                        nodeCenterY <= slotBottom
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, [nodeRowsCount]);

    // *** REMOVED: the useEffect that watched hoveredNodeId and called setEdges/setNodes ***
    // That was the root cause of the flickering and highlight dropping.
    // Edge and node visual state is now computed purely in useMemo (displayEdges / displayNodes)
    // without touching the base state, so there are no race conditions or extra renders.

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    const onNodeDragStart = useCallback((event, node) => {
        if (node.type === 'default' && !node.id.startsWith('sem-bg')) {
            initialDragPos.current = node.position;
            // บันทึกตำแหน่งปัจจุบัน (ถ้าอยู่ในกรอบ) เป็น last valid position
            if (isPositionInsideFrame(node.position)) {
                lastValidNodePositions.current[node.id] = { ...node.position };
            }
            setSelectedNodeId(null);
            // NOTE: hoveredNodeId is intentionally NOT cleared here.
            // The pointer is still on the node, so hover should stay active.
        }
    }, [isPositionInsideFrame]);

    const onNodeDragStop = useCallback((event, node) => {
        if (node.type === 'default' && !node.id.startsWith('sem-bg')) {
            const nodeCenterX = node.position.x + (COURSE_WIDTH / 2);
            const nodeCenterY = node.position.y + (COURSE_HEIGHT / 2);

            let snappedPosition = null;

            for (let year = 1; year <= 8; year++) {
                for (let sem = 1; sem <= 3; sem++) {
                    const colX = getSemesterX(year, sem);
                    const slotX = colX + (SEMESTER_WIDTH - COURSE_WIDTH) / 2;
                    for (let i = 0; i < nodeRowsCount; i++) {
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

                    finalPosition = isOccupied
                        ? (lastValidNodePositions.current[node.id] || initialDragPos.current || node.position)
                        : snappedPosition;
                    
                    // ถ้า snap ได้สำเร็จ → บันทึกเป็น last valid position
                    if (!isOccupied) {
                        lastValidNodePositions.current[node.id] = { ...snappedPosition };
                    }
                } else {
                    // ไม่ snap → ตรวจสอบว่าอยู่ในกรอบ frame ใดหรือไม่
                    if (isPositionInsideFrame(node.position)) {
                        finalPosition = node.position;
                        lastValidNodePositions.current[node.id] = { ...node.position };
                    } else {
                        // อยู่นอกกรอบทั้งหมด → เด้งกลับไปตำแหน่งล่าสุดที่ถูกต้อง
                        finalPosition = lastValidNodePositions.current[node.id] || initialDragPos.current || node.position;
                    }
                }

                const nodesWithSnap = currentNodes.map(n =>
                    n.id === node.id ? { ...n, position: finalPosition } : n
                );

                return updateGameState(nodesWithSnap);
            });
            // NOTE: hoveredNodeId is intentionally NOT cleared here either.
            // displayNodes/displayEdges will reflect the correct hover state via useMemo.
        }
    }, [nodeRowsCount, isPositionInsideFrame]);

    const handleExport = () => {
        const courseNodes = nodes.filter(n => n.type === 'default' && !n.id.startsWith('sem-bg'));

        const plan = courseNodes.map(n => ({
            id: n.id,
            courseId: n.data.courseId,
            selectedYear: n.data.currentYear,
            selectedSemester: n.data.currentSemester,
            rowIndex: n.data.rowIndex !== undefined ? n.data.rowIndex : 0
        }));

        const exportData = {
            curriculumName: selectedCurriculum,
            plan: plan,
            nodeRowsCount: nodeRowsCount
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

                    if (parsed.nodeRowsCount) {
                        setNodeRowsCount(parsed.nodeRowsCount);
                    } else if (parsed.plan && parsed.plan.length > 0) {
                        const maxRowIndex = Math.max(0, ...parsed.plan.map(p => p.rowIndex || 0));
                        setNodeRowsCount(maxRowIndex + 1);
                    }
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

    const handleAddRow = () => {
        setNodeRowsCount(prev => prev + 1);
    };

    const handleDeleteRow = () => {
        // Check if there are nodes on the bottom row
        const bottomRowIndex = nodeRowsCount - 1;
        const bottomRowNodes = nodes.filter(n => 
            n.type === 'default' && 
            !n.id.startsWith('sem-bg') &&
            n.data.rowIndex === bottomRowIndex
        );

        // Only delete row if it's empty or user confirms
        if (bottomRowNodes.length > 0) {
            // const confirmed = window.confirm(`${bottomRowNodes.length} course(s) on the last row will be moved or removed. Continue?`);
            // if (!confirmed) return;
            return; // Prevent deletion if there are nodes in the bottom row
        }

        if (nodeRowsCount > 1) {
            setNodeRowsCount(prev => prev - 1);
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

            <div style={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 10,
                background: 'white',
                padding: '12px 18px',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                fontFamily: 'sans-serif',
                border: '1px solid #ccc',
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
            }}>
                <button
                    onClick={handleAddRow}
                    style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                    + Add Row
                </button>
                <button
                    onClick={handleDeleteRow}
                    disabled={nodeRowsCount <= 1}
                    style={{ padding: '8px 16px', background: nodeRowsCount <= 1 ? '#ccc' : '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: nodeRowsCount <= 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                    - Delete Row
                </button>
            </div>

            <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
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
                nodes={displayNodes}
                edges={displayEdges}
                edgeTypes={edgeTypes}
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