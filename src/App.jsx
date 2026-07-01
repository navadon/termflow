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
    Handle,
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

const CourseNode = ({ id, data }) => {
    const isSummer = data.suggestedSemester === 3;
    const suggestedLabel = isSummer
        ? `Y${data.suggestedYear}-Summer`
        : `Y${data.suggestedYear}-${data.suggestedSemester}`;
    const isOffSchedule = data.currentYear !== data.suggestedYear || data.currentSemester !== data.suggestedSemester;
    const selectedCourseId = data.courseId || '';
    const selectedOption = data.dropdownOptions?.find(opt => opt.courseId === selectedCourseId);
    const courseTitle = selectedOption?.courseTitle || data.courseTitle;
    const isSemCompleted = !!data.isSemCompleted;

    const handleSelect = (event) => {
        if (data.onSelectCourse) {
            data.onSelectCourse(id, event.target.value);
        }
    };

    const handleMouseEnter = () => {
        if (data.onHover) {
            data.onHover(id);
        }
    };

    const handleMouseLeave = () => {
        if (data.onLeave) {
            data.onLeave(id);
        }
    };

    const handleClick = () => {
        if (data.onClick) {
            data.onClick(id);
        }
    };

    return (
        <>
            <Handle type="target" position={Position.Left} />
            <div
                onPointerEnter={handleMouseEnter}
                onPointerLeave={handleMouseLeave}
                onClick={handleClick}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: 8, paddingBottom: 4 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#444' }}>
                        {data.optionType ? (data.courseId || getOptionPlaceholder(data.optionType)) : (data.courseId || 'GenEd')}
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
                {data.optionType ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%', minWidth: 0 }}>
                        <select
                            value={selectedCourseId}
                            className="nodrag"
                            disabled={isSemCompleted}
                            onChange={handleSelect}
                            style={{
                                flex: '1 1 0%',
                                minWidth: 0,
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '6px 8px',
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: '600',
                                lineHeight: '1.25',
                                color: '#000',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                cursor: isSemCompleted ? 'default' : 'pointer',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <option value="">{getOptionPlaceholder(data.optionType)}</option>
                            {(data.dropdownOptions || []).map(opt => (
                                <option
                                    key={opt.courseId}
                                    value={opt.courseId}
                                    disabled={data.otherSelectedIds?.includes(opt.courseId)}
                                >
                                    {opt.courseId} {opt.courseTitle}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div style={{ fontSize: '16px', lineHeight: '1.25', fontWeight: '600', color: '#000' }}>
                        {courseTitle}
                    </div>

                )}
            </div>
            <Handle type="source" position={Position.Right} />
        </>
    );
};

const nodeTypes = { course: CourseNode };

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
const SUMMER_WIDTH = 270;
const GAP_BETWEEN_SEMESTERS = 20;
const GAP_BETWEEN_YEARS = 20;
const TOP_PADDING = 160;

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
    const [dropdownValue, setDropdownValue] = useState('CPE 2568 (Regular)');
    const [activePlanData, setActivePlanData] = useState(null);
    const [loadedFileName, setLoadedFileName] = useState(null);
    const [nodeRowsCount, setNodeRowsCount] = useState(12);

    // --- VISUAL STATE (separate from data state) ---
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [tooltip, setTooltip] = useState(null);
    const [completedSemesters, setCompletedSemesters] = useState(new Set());
    const completedSemestersRef = useRef(completedSemesters);

    // --- CUSTOM COURSES (user-added) ---
    const [customCourses, setCustomCourses] = useState([]);
    const [showAddCourseForm, setShowAddCourseForm] = useState(false);
    const [showCourseTypeDropdown, setShowCourseTypeDropdown] = useState(false);
    const [newCourseForm, setNewCourseForm] = useState({
        courseId: '',
        courseTitle: '',
        creditHours: 3,
        year: 1,
        semester: 1,
        courseType: 'others',
    });

    const initialDragPos = useRef(null);
    const lastValidNodePositions = useRef({});  // Track last position inside frame for each node
    const fileInputRef = useRef(null);
    const prevCurriculumRef = useRef(selectedCurriculum);
    const prevPlanRef = useRef(activePlanData);

    const nodesRef = useRef([]);
    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    const checkCanCompleteSemester = useCallback((year, sem, completedSet) => {
        for (let y = 1; y <= 8; y++) {
            for (let s = 1; s <= 3; s++) {
                if (y === year && s === sem) {
                    return true;
                }
                const prevKey = `${y}-${s}`;
                if (!completedSet.has(prevKey)) {
                    return false;
                }
            }
        }
        return true;
    }, [nodes]);

    const toggleSemesterComplete = useCallback((year, sem, credits) => {
        const key = `${year}-${sem}`;
        const currentCompleted = completedSemestersRef.current;

        if (currentCompleted.has(key)) {
            // check if subsequent semesters with courses are completed
            let canUncomplete = true;
            for (let y = year; y <= 8; y++) {
                for (let s = 1; s <= 3; s++) {
                    if (y === year && s <= sem) continue;
                    const laterKey = `${y}-${s}`;
                    if (currentCompleted.has(laterKey)) {
                        canUncomplete = false;
                        break;
                    }
                }
                if (!canUncomplete) break;
            }

            if (!canUncomplete) {
                alert('ไม่สามารถยกเลิกการสำเร็จการศึกษาของเทอมนี้ได้ เนื่องจากมีเทอมถัดไปที่สำเร็จการศึกษาแล้ว');
                return;
            }

            setCompletedSemesters(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        } else {
            if (!checkCanCompleteSemester(year, sem, currentCompleted)) {
                alert('ไม่สามารถทำเครื่องหมายว่าสำเร็จการศึกษาได้ เนื่องจากเทอมก่อนหน้ายังไม่สำเร็จการศึกษา');
                return;
            }
            if (credits > 22) {
                alert('ไม่สามารถทำเครื่องหมายว่าสำเร็จการศึกษาได้ เนื่องจากหน่วยกิตเกิน 22 หน่วยกิต');
                return;
            }

            const hasInvalidCourses = nodesRef.current.some(n =>
                (n.type === 'default' || n.type === 'course') &&
                !n.id.startsWith('sem-bg') &&
                n.data.currentYear === year &&
                n.data.currentSemester === sem &&
                n.data.invalidReasons && n.data.invalidReasons.length > 0
            );

            if (hasInvalidCourses) {
                alert('ไม่สามารถทำเครื่องหมายว่าสำเร็จการศึกษาได้ เนื่องจากมีวิชาที่ไม่ผ่านเงื่อนไขในเทอมนี้ (กรอบสีแดง)');
                return;
            }

            setCompletedSemesters(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
        }
    }, [nodes, checkCanCompleteSemester]);

    // --- DERIVED DISPLAY STATE: computed from base state + visual state ---
    // Edge highlight: computed live, never stored in base edges
    const displayEdges = useMemo(() => {
        if (!hoveredNodeId) {
            return edges.map(edge => ({
                ...edge,
                style: { ...edge.style, pointerEvents: 'none' }
            }));
        }
        return edges.map(edge => {
            if (edge.source === hoveredNodeId) {
                return {
                    ...edge,
                    style: {
                        stroke: '#3b82f6', strokeWidth: 3, opacity: 1,
                        filter: 'drop-shadow(0px 4px 8px rgb(0, 225, 255))',
                        pointerEvents: 'none'
                    },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
                };
            }
            if (edge.target === hoveredNodeId) {
                return {
                    ...edge,
                    style: {
                        stroke: '#f59e0b', strokeWidth: 3, opacity: 1,
                        filter: 'drop-shadow(0px 4px 8px rgb(255, 136, 0))',
                        pointerEvents: 'none'
                    },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }
                };
            }
            return {
                ...edge,
                style: { ...edge.style, pointerEvents: 'none' }
            };
        });
    }, [edges, hoveredNodeId]);

    // Node hover bg: computed live, never stored in base nodes
    const displayNodes = useMemo(() => {
        return nodes.map(node => {
            if (node.id.startsWith('sem-bg')) return node;
            if (node.type !== 'default' && node.type !== 'course') return node;
            const isHovered = node.id === hoveredNodeId;
            if (!isHovered) {
                const hoverNode = nodes.find(n => n.id === hoveredNodeId);
                if (hoverNode && hoverNode.data?.prerequisites?.includes(node.data.courseId)) {
                    return {
                        ...node,
                        style: {
                            ...node.style,
                            boxShadow: '0 5px 10px rgba(255, 136, 0, 0.9)'
                        }
                    };
                }
                if (hoverNode && node.data?.prerequisites?.includes(hoverNode.data.courseId)) {
                    return {
                        ...node,
                        style: {
                            ...node.style,
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
                        ? node.style.boxShadow
                        : '0 10px 10px rgba(90, 90, 90, 0.9)'
                }
            };
        });
    }, [nodes, hoveredNodeId]);

    const createSemesterLabel = (year, sem, credits, currentNodes = []) => {
        const isSummer = sem === 3;
        const titleText = isSummer ? `Year ${year} - Summer` : `Year ${year} - Semester ${sem}`;
        const maxCredits = 22;
        const semKey = `${year}-${sem}`;
        const isCompleted = completedSemestersRef.current.has(semKey);
        const isClickable = isCompleted || checkCanCompleteSemester(year, sem, completedSemestersRef.current, currentNodes);

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
                    <button
                        className="nodrag nopan"
                        disabled={!isClickable}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isClickable) {
                                toggleSemesterComplete(year, sem, credits);
                            }
                        }}
                        style={{
                            pointerEvents: 'auto',
                            padding: '8px 16px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            border: isCompleted ? '2px solid #28a745' : '2px solid #aaa',
                            borderRadius: '8px',
                            background: isCompleted ? '#28a745' : '#fff',
                            color: isCompleted ? '#fff' : (isClickable ? '#666' : '#ccc'),
                            cursor: isClickable ? 'pointer' : 'not-allowed',
                            opacity: isClickable ? 1 : 0.6,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {isCompleted ? '✅ Completed' : '☐ Mark Complete'}
                    </button>
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
            if ((n.type === 'default' || n.type === 'course') && !n.id.startsWith('sem-bg')) {
                if (n.data.courseId) courseIdToNodeId[n.data.courseId] = n.id;
            }
        });

        const selectedIdsByOptionType = {};
        currentNodes.forEach(n => {
            if ((n.type === 'default' || n.type === 'course') && n.data?.optionType && n.data?.courseId) {
                if (!selectedIdsByOptionType[n.data.optionType]) {
                    selectedIdsByOptionType[n.data.optionType] = [];
                }
                selectedIdsByOptionType[n.data.optionType].push(n.data.courseId);
            }
        });

        currentNodes.forEach(courseNode => {
            if ((courseNode.type !== 'default' && courseNode.type !== 'course') || courseNode.id.startsWith('sem-bg')) return;

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
                const isSemCompleted = completedSemestersRef.current.has(`${year}-${sem}`);
                const isSummer = sem === 3;
                return {
                    ...node,
                    data: { ...node.data, label: createSemesterLabel(year, sem, credits, currentNodes) },
                    style: {
                        ...node.style,
                        backgroundColor: isSemCompleted ? '#e8f5e9' : (isSummer ? '#fffcf0' : '#f4f4f9'),
                        border: isOverload ? '2px dashed #d9534f' : (isSemCompleted ? '2px dashed #28a745' : '2px dashed #bbb'),
                        boxShadow: isOverload ? '0 0 15px rgba(255,0,0,0.6)' : 'none',
                    }
                };
            }

            if (node.type === 'default' || node.type === 'course') {
                const myLoc = nodeLocationMap[node.id];
                const prereqs = node.data.prerequisites || [];

                const rowIndex = Math.round((node.position.y - TOP_PADDING) / (COURSE_HEIGHT + COURSE_GAP));
                const currentRowIndex = Math.max(0, rowIndex);

                const invalidReasons = [];

                prereqs.forEach(prereqCode => {
                    const prereqNodeId = courseIdToNodeId[prereqCode];
                    if (prereqNodeId) {
                        const prereqLoc = nodeLocationMap[prereqNodeId];
                        if (prereqLoc) {
                            if (prereqLoc.year > myLoc.year || (prereqLoc.year === myLoc.year && prereqLoc.sem >= myLoc.sem)) {
                                const prereqNode = currentNodes.find(n => n.id === prereqNodeId);
                                const prereqTitle = prereqNode?.data?.courseId || prereqCode;
                                invalidReasons.push(`ต้องผ่านวิชา ${prereqTitle} มาก่อน (prerequisite)`);
                            }
                        }
                    }
                });

                if (node.data.corequisite) {
                    const coreqNodeId = courseIdToNodeId[node.data.corequisite];
                    if (coreqNodeId) {
                        const coreqLoc = nodeLocationMap[coreqNodeId];
                        if (coreqLoc && (coreqLoc.year !== myLoc.year || coreqLoc.sem !== myLoc.sem)) {
                            const coreqNode = currentNodes.find(n => n.id === coreqNodeId);
                            const coreqTitle = coreqNode?.data?.courseId || node.data.corequisite;
                            invalidReasons.push(`ต้องลงพร้อมกับ ${coreqTitle} (corequisite)`);
                        }
                    }
                }

                const isInvalid = invalidReasons.length > 0;
                const isMovedFromSuggested = myLoc.year !== node.data.suggestedYear || myLoc.sem !== node.data.suggestedSemester;

                const warningReasons = [];
                if (isMovedFromSuggested && myLoc.year !== 99) {
                    const sugYear = node.data.suggestedYear;
                    const sugSem = node.data.suggestedSemester;
                    const semLabel = sugSem === 3 ? 'Summer' : `เทอม ${sugSem}`;
                    warningReasons.push(`แผนแนะนำให้ลงปี ${sugYear} ${semLabel}`);
                }

                let borderColor = '#333';
                const courseType = node.data.courseType;
                if (courseType === 'math and sci') borderColor = '#c9c900';
                else if (courseType === 'major courses') borderColor = '#00008b';
                else if (courseType === 'gen engr') borderColor = '#8b1c62';
                else if (courseType === 'gen edu') borderColor = '#008800';
                else if (courseType === 'others') borderColor = '#808080';

                const isSemCompleted = myLoc.year !== 99 && myLoc.sem !== 99 && completedSemestersRef.current.has(`${myLoc.year}-${myLoc.sem}`);

                const optionType = node.data.optionType;
                const otherSelectedIds = optionType && selectedIdsByOptionType[optionType]
                    ? selectedIdsByOptionType[optionType].filter(id => id !== node.data.courseId)
                    : [];

                return {
                    ...node,
                    draggable: !isSemCompleted,
                    data: {
                        ...node.data,
                        currentYear: myLoc.year === 99 ? null : myLoc.year,
                        currentSemester: myLoc.sem === 99 ? null : myLoc.sem,
                        rowIndex: currentRowIndex,
                        invalidReasons,
                        warningReasons,
                        isSemCompleted,
                        otherSelectedIds,
                    },
                    style: {
                        ...node.style,
                        background: isSemCompleted ? '#e8f5e9' : (isMovedFromSuggested ? '#fffacd' : 'white'),

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
                        cursor: isSemCompleted ? 'default' : 'pointer',
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

                const optionType = course.courseId === null ? getOptionType(course.courseTitle) : null;
                const currOptions = catalogData.options || {};
                const dropdownOptions = optionType ? (currOptions[optionType] || []) : [];

                let courseId = course.courseId;
                let courseTitle = course.courseTitle;
                let prerequisites = course.prerequisites || [];

                if (activePlanData) {
                    const savedCourse = activePlanData.find(p => p.id === course.id);
                    if (savedCourse && optionType && savedCourse.courseId) {
                        courseId = savedCourse.courseId;
                        const opt = dropdownOptions.find(o => o.courseId === savedCourse.courseId);
                        if (opt) {
                            courseTitle = opt.courseTitle;
                            prerequisites = opt.prerequisites || [];
                        }
                    }
                }

                generatedNodes.push({
                    id: course.id,
                    type: 'course',
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                    data: {
                        courseId: courseId,
                        courseTitle: courseTitle,
                        creditHours: course.creditHours,
                        prerequisites: prerequisites,
                        corequisite: course.corequisite,
                        suggestedYear: course.suggestedYear,
                        suggestedSemester: course.suggestedSemester,
                        currentYear: year === 99 ? null : year,
                        currentSemester: sem === 99 ? null : sem,
                        rowIndex: rowIndex,
                        courseType: course.courseType,
                        optionType: optionType,
                        dropdownOptions: dropdownOptions,
                        onSelectCourse: (nodeId, selectedCourseId) => {
                            setNodes((current) => updateGameState(current.map(n => {
                                if (n.id === nodeId) {
                                    const opt = dropdownOptions.find(o => o.courseId === selectedCourseId);
                                    return {
                                        ...n,
                                        data: {
                                            ...n.data,
                                            courseId: selectedCourseId,
                                            courseTitle: opt ? opt.courseTitle : n.data.courseTitle,
                                            prerequisites: opt ? (opt.prerequisites || []) : (n.data.prerequisites || []),
                                        }
                                    };
                                }
                                return n;
                            })));
                        },
                        onHover: (nodeId) => setHoveredNodeId(nodeId),
                        onLeave: () => { setHoveredNodeId(null); setTooltip(null); },
                        onClick: (nodeId) => setSelectedNodeId(prev => prev === nodeId ? null : nodeId),
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

    // --- Helper: build a custom course node object from a customCourse entry ---
    const buildCustomNode = useCallback((course) => {
        const year = course.selectedYear ?? 99;
        const sem = course.selectedSemester ?? 99;
        const rowIndex = course.rowIndex ?? 0;
        const colX = getSemesterX(year, sem);
        const cardX = colX + (SEMESTER_WIDTH - COURSE_WIDTH) / 2;
        const cardY = TOP_PADDING + rowIndex * (COURSE_HEIGHT + COURSE_GAP);

        const ct = course.courseType || 'others';
        let customBorderColor = '#808080';
        if (ct === 'math and sci') customBorderColor = '#c9c900';
        else if (ct === 'major courses') customBorderColor = '#00008b';
        else if (ct === 'gen engr') customBorderColor = '#8b1c62';
        else if (ct === 'gen edu') customBorderColor = '#008800';

        return {
            id: course.id,
            type: 'default',
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            data: {
                courseId: course.courseId,
                courseTitle: course.courseTitle,
                creditHours: course.creditHours,
                prerequisites: [],
                corequisite: null,
                suggestedYear: year,
                suggestedSemester: sem,
                currentYear: year === 99 ? null : year,
                currentSemester: sem === 99 ? null : sem,
                rowIndex: rowIndex,
                courseType: ct,
                isCustom: true,
                label: (
                    <div
                        onPointerEnter={() => setHoveredNodeId(course.id)}
                        onPointerLeave={() => { setHoveredNodeId(null); setTooltip(null); }}
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
                            <div style={{ fontWeight: 'bold', fontSize: '18px', color: customBorderColor }}>
                                {course.courseId || 'Custom'}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#fff', backgroundColor: '#7c3aed', padding: '1px 5px', borderRadius: '4px' }}>
                                    custom
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                                    {course.creditHours} CR
                                </div>
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
                border: `2px solid ${customBorderColor}`,
                borderRadius: '8px',
                padding: '12px',
                zIndex: 10
            }
        };
    }, []);

    // --- Sync custom courses into nodes without touching catalog nodes ---
    useEffect(() => {
        setNodes(prevNodes => {
            // Remove old custom nodes
            const nonCustomNodes = prevNodes.filter(n => !n.id.startsWith('custom-'));
            // Build fresh custom nodes from current customCourses state
            const newCustomNodes = customCourses.map(buildCustomNode);
            return updateGameState([...nonCustomNodes, ...newCustomNodes]);
        });
    }, [customCourses, buildCustomNode]);

    useEffect(() => {
        if (!hoveredNodeId) { setTooltip(null); return; }
        const node = nodes.find(n => n.id === hoveredNodeId);
        const hasInvalid = node?.data.invalidReasons?.length > 0;
        const hasWarning = node?.data.warningReasons?.length > 0;
        if (!node || (!hasInvalid && !hasWarning)) { setTooltip(null); return; }
        setTooltip({
            course: node.data,
            reasons: node.data.invalidReasons || [],
            warnings: node.data.warningReasons || [],
        });
    }, [hoveredNodeId, nodes]);

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

    // Re-run updateGameState when completedSemesters changes
    useEffect(() => {
        completedSemestersRef.current = completedSemesters;
        setNodes(prev => updateGameState(prev));
    }, [completedSemesters]);

    // Helper: ตรวจสอบว่าตำแหน่งอยู่ในกรอบ semester ใดหรือไม่
    // ใช้ center ของ node เพื่อความแม่นยำ (ไม่อนุญาตให้อยู่ระหว่างกรอบ)
    const isPositionInsideFrame = useCallback((position) => {
        if (!position) return false;

        const nodeCenterX = position.x + (COURSE_WIDTH / 2);
        const nodeCenterY = position.y + (COURSE_HEIGHT / 2);

        for (let year = 1; year <= 8; year++) {
            for (let sem = 1; sem <= 3; sem++) {
                const targetSemKey = `${year}-${sem}`;
                if (completedSemestersRef.current.has(targetSemKey)) {
                    continue;
                }
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
        if ((node.type === 'default' || node.type === 'course') && !node.id.startsWith('sem-bg')) {
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
        if ((node.type === 'default' || node.type === 'course') && !node.id.startsWith('sem-bg')) {
            const nodeCenterX = node.position.x + (COURSE_WIDTH / 2);
            const nodeCenterY = node.position.y + (COURSE_HEIGHT / 2);

            let snappedPosition = null;

            for (let year = 1; year <= 8; year++) {
                for (let sem = 1; sem <= 3; sem++) {
                    const targetSemKey = `${year}-${sem}`;
                    if (completedSemestersRef.current.has(targetSemKey)) {
                        continue;
                    }
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
                        (n.type === 'default' || n.type === 'course') &&
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

            // Sync custom course position back to customCourses state
            if (node.id.startsWith('custom-')) {
                setNodes(latestNodes => {
                    const updatedNode = latestNodes.find(n => n.id === node.id);
                    if (updatedNode) {
                        setCustomCourses(prev => prev.map(c => c.id === node.id ? {
                            ...c,
                            selectedYear: updatedNode.data.currentYear,
                            selectedSemester: updatedNode.data.currentSemester,
                            rowIndex: updatedNode.data.rowIndex,
                        } : c));
                    }
                    return latestNodes;
                });
            }
        }
    }, [nodeRowsCount, isPositionInsideFrame]);

    const handleAddCourse = () => {
        const { courseId, courseTitle, creditHours, year, semester, courseType } = newCourseForm;
        if (!courseTitle.trim()) { alert('กรุณาใส่ชื่อวิชา'); return; }

        const targetYear = parseInt(year);
        const targetSem = parseInt(semester);

        const targetSemKey = `${targetYear}-${targetSem}`;
        if (completedSemesters.has(targetSemKey)) {
            alert('ไม่สามารถเพิ่มวิชาในเทอมที่สำเร็จการศึกษาแล้วได้');
            return;
        }

        // Find the lowest row index that is free in the target semester
        const occupiedRows = new Set();

        // Check catalog courses (type: 'default' or 'course')
        nodes.forEach(n => {
            if ((n.type === 'default' || n.type === 'course') && !n.id.startsWith('sem-bg')) {
                if (n.data.currentYear === targetYear && n.data.currentSemester === targetSem) {
                    occupiedRows.add(n.data.rowIndex);
                }
            }
        });

        // Check custom courses
        customCourses.forEach(c => {
            if (c.selectedYear === targetYear && c.selectedSemester === targetSem) {
                occupiedRows.add(c.rowIndex);
            }
        });

        let freeRow = 0;
        while (occupiedRows.has(freeRow)) freeRow++;

        // Expand rows if needed
        if (freeRow >= nodeRowsCount) {
            setNodeRowsCount(freeRow + 1);
        }

        const newId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newCourse = {
            id: newId,
            courseId: courseId.trim(),
            courseTitle: courseTitle.trim(),
            creditHours: parseInt(creditHours) || 0,
            selectedYear: targetYear,
            selectedSemester: targetSem,
            rowIndex: freeRow,
            courseType: courseType,
        };

        setCustomCourses(prev => [...prev, newCourse]);
        setNewCourseForm(prev => ({ ...prev, courseId: '', courseTitle: '' }));
    };

    const handleDeleteCustomCourse = (courseId) => {
        setCustomCourses(prev => prev.filter(c => c.id !== courseId));
    };

    const handleExport = () => {
        const courseNodes = nodes.filter(n => (n.type === 'default' || n.type === 'course') && !n.id.startsWith('sem-bg'));

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
            nodeRowsCount: nodeRowsCount,
            customCourses: customCourses,
            completedSemesters: Array.from(completedSemesters),
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

    const handleExportDev = () => {
        const catalogData = curriculums[selectedCurriculum];
        if (!catalogData) return;

        const courseNodes = nodes.filter(n => n.type === 'default' && !n.id.startsWith('sem-bg'));
        const nodeMap = {};
        courseNodes.forEach(n => { nodeMap[n.id] = n; });

        const exportedCourses = catalogData.courses.map(course => {
            const node = nodeMap[course.id];
            return {
                ...course,
                selectedYear: node?.data.currentYear ?? course.selectedYear,
                selectedSemester: node?.data.currentSemester ?? course.selectedSemester,
                rowIndex: node?.data.rowIndex ?? course.rowIndex,
            };
        });

        const exportData = {
            curriculumName: catalogData.curriculumName,
            nodeRowsCount: nodeRowsCount,
            courses: exportedCourses,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedCurriculum.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_catalog.json`;
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
                    setCustomCourses(parsed.customCourses || []);
                    setCompletedSemesters(new Set(parsed.completedSemesters || []));
                    setLoadedFileName(file.name);
                    setDropdownValue("");

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
        const val = e.target.value;
        if (val === "") return;
        setDropdownValue(val);
        setSelectedCurriculum(val);
        setActivePlanData(null);
        setCustomCourses([]);
        setCompletedSemesters(new Set());
        setLoadedFileName(null);
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
            (n.type === 'default' || n.type === 'course') &&
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

    const renderResources = () => {
        const resources = curriculums[selectedCurriculum]?.resources;
        if (!resources || resources.length === 0) return null;
        return resources.map((res, i) => (
            <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '2px solid #6b009c',
                    backgroundColor: '#9300ce',
                }}
            >
                {res.title}
            </a>
        ));
    };

    const courseNodesForProgress = nodes.filter(n => (n.type === 'default' || n.type === 'course') && !n.id.startsWith('sem-bg'));
    const totalCredits = courseNodesForProgress.reduce((sum, n) => sum + (n.data.creditHours || 0), 0);
    const completedCredits = courseNodesForProgress.reduce((sum, n) => {
        const year = n.data?.currentYear;
        const sem = n.data?.currentSemester;
        if (year && sem && completedSemesters.has(`${year}-${sem}`)) {
            return sum + (n.data.creditHours || 0);
        }
        return sum;
    }, 0);
    const progressPercent = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;

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
                flexDirection: 'column',
                gap: '10px',
            }}>
                {/* Row controls */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                    <div style={{ width: '1px', height: '28px', background: '#ddd' }} />
                    <button
                        onClick={() => setShowAddCourseForm(prev => !prev)}
                        style={{ padding: '8px 16px', background: showAddCourseForm ? '#5b21b6' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >
                        {showAddCourseForm ? '✕ ยกเลิก' : '＋ เพิ่มวิชา'}
                    </button>
                </div>

                {/* Add course form */}
                {showAddCourseForm && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px solid #eee', minWidth: '340px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#5b21b6' }}>เพิ่มวิชาเอง</div>

                        {/* Row 1: รหัสวิชา + ชื่อวิชา */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>รหัสวิชา</label>
                                <input
                                    placeholder="เช่น 261101"
                                    value={newCourseForm.courseId}
                                    onChange={e => setNewCourseForm(prev => ({ ...prev, courseId: e.target.value }))}
                                    style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '120px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>ชื่อวิชา <span style={{ color: '#dc3545' }}>*</span></label>
                                <input
                                    placeholder="ชื่อวิชาภาษาไทย/อังกฤษ"
                                    value={newCourseForm.courseTitle}
                                    onChange={e => setNewCourseForm(prev => ({ ...prev, courseTitle: e.target.value }))}
                                    style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {/* Row 2: หน่วยกิต + ปี + เทอม */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>หน่วยกิต</label>
                                <input
                                    type="number"
                                    min={0} max={9}
                                    value={newCourseForm.creditHours}
                                    onChange={e => setNewCourseForm(prev => ({ ...prev, creditHours: e.target.value }))}
                                    style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '70px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>ปีการศึกษา</label>
                                <select
                                    value={newCourseForm.year}
                                    onChange={e => setNewCourseForm(prev => ({ ...prev, year: e.target.value }))}
                                    style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(y => <option key={y} value={y}>ปี {y}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>ภาคเรียน</label>
                                <select
                                    value={newCourseForm.semester}
                                    onChange={e => setNewCourseForm(prev => ({ ...prev, semester: e.target.value }))}
                                    style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    <option value={1}>เทอม 1</option>
                                    <option value={2}>เทอม 2</option>
                                    <option value={3}>Summer</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 3: ประเภทวิชา + ปุ่มเพิ่ม */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>ประเภทวิชา</label>
                                {(() => {
                                    const COURSE_TYPE_OPTIONS = [
                                        { value: 'math and sci', label: 'Math & Sci', color: '#c9c900' },
                                        { value: 'major courses', label: 'Major', color: '#00008b' },
                                        { value: 'gen engr', label: 'Gen Engr', color: '#8b1c62' },
                                        { value: 'gen edu', label: 'Gen Edu', color: '#008800' },
                                        { value: 'others', label: 'Others', color: '#808080' },
                                    ];
                                    const selected = COURSE_TYPE_OPTIONS.find(o => o.value === newCourseForm.courseType) || COURSE_TYPE_OPTIONS[4];
                                    return (
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={() => setShowCourseTypeDropdown(prev => !prev)}
                                                style={{
                                                    padding: '6px 10px', border: `2px solid ${selected.color}`,
                                                    borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
                                                    fontWeight: 'bold', color: selected.color, background: 'white',
                                                    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                                                }}
                                            >
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: selected.color, display: 'inline-block', flexShrink: 0 }} />
                                                {selected.label}
                                                <span style={{ fontSize: '10px', marginLeft: '2px' }}>▾</span>
                                            </button>
                                            {showCourseTypeDropdown && (
                                                <div style={{
                                                    position: 'absolute', top: '110%', left: 0, zIndex: 999,
                                                    background: 'white', border: '1px solid #ccc', borderRadius: '6px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: '130px',
                                                }}>
                                                    {COURSE_TYPE_OPTIONS.map(opt => (
                                                        <div
                                                            key={opt.value}
                                                            onClick={() => { setNewCourseForm(prev => ({ ...prev, courseType: opt.value })); setShowCourseTypeDropdown(false); }}
                                                            style={{
                                                                padding: '7px 12px', cursor: 'pointer', fontSize: '13px',
                                                                fontWeight: 'bold', color: opt.color,
                                                                background: newCourseForm.courseType === opt.value ? '#f5f5f5' : 'white',
                                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
                                                            onMouseLeave={e => e.currentTarget.style.background = newCourseForm.courseType === opt.value ? '#f5f5f5' : 'white'}
                                                        >
                                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color, display: 'inline-block', flexShrink: 0 }} />
                                                            {opt.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <button
                                onClick={handleAddCourse}
                                style={{ padding: '6px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', alignSelf: 'flex-end' }}
                            >
                                เพิ่มวิชา
                            </button>
                        </div>
                        {customCourses.length > 0 && (
                            <div style={{ marginTop: '4px', maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>วิชาที่เพิ่มเอง ({customCourses.length})</div>
                                {customCourses.map(c => (
                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f3ff', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}>
                                        <span style={{ color: '#5b21b6', fontWeight: 'bold', marginRight: '6px' }}>{c.courseId || '—'}</span>
                                        <span style={{ flex: 1, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.courseTitle}</span>
                                        <span style={{ color: '#888', marginLeft: '6px', whiteSpace: 'nowrap' }}>ปี{c.selectedYear} เทอม{c.selectedSemester === 3 ? ' S' : c.selectedSemester} • {c.creditHours}CR</span>
                                        <button
                                            onClick={() => handleDeleteCustomCourse(c.id)}
                                            style={{ marginLeft: '8px', padding: '2px 6px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {curriculums[selectedCurriculum]?.resources?.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    left: 60,
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
                    <strong>Resources Link</strong>
                    {renderResources()}
                </div>
            )}

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
                        onClick={handleExportDev}
                        style={{ padding: '6px 12px', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                        Export Catalog (Dev)
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

            {tooltip && (
                <div style={{
                    position: 'fixed',
                    bottom: 32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    background: '#1e1e1e',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    maxWidth: '700px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    fontFamily: 'sans-serif',
                    fontSize: '13px',
                    pointerEvents: 'none',
                    border: tooltip.reasons.length > 0 ? '1px solid #ff4444' : '1px solid #f59e0b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }}>
                    {tooltip.reasons.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ fontWeight: 'bold', color: '#ff6b6b', whiteSpace: 'nowrap' }}>
                                ⚠ ลงวิชา {tooltip.course.courseId} ในปี {tooltip.course.currentYear} เทอม {tooltip.course.currentSemester} ไม่ได้เพราะ
                            </div>
                            <div>
                                {tooltip.reasons.map((r, i) => (
                                    <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>• {r}</div>
                                ))}
                            </div>
                        </div>
                    )}
                    {tooltip.warnings.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', borderTop: tooltip.reasons.length > 0 ? '1px solid #444' : 'none', paddingTop: tooltip.reasons.length > 0 ? '6px' : 0 }}>
                            <div style={{ fontWeight: 'bold', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                                {
                                    tooltip.course.currentSemester === tooltip.course.suggestedSemester ?
                                        '⚡ คำเตือน: ' :
                                        '⚡ คำเตือน: โปรดตรวจสอบให้แน่ใจว่าวิชา' +
                                        (tooltip.course.courseId ? ` ${tooltip.course.courseId} เปิดสอนใน` : 'นี้เปิดสอนใน') +
                                        (tooltip.course.currentSemester === 3 ? ' Summer' : `เทอม ${tooltip.course.currentSemester}`)
                                }
                            </div>
                            <div style={{ color: '#fde68a' }}>
                                {tooltip.warnings.map((w, i) => (
                                    <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>• {w}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ReactFlow
                nodes={displayNodes}
                edges={displayEdges}
                nodeTypes={nodeTypes}
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