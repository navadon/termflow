import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    applyNodeChanges,
    applyEdgeChanges,
    Position,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

// Config & Constants
import { curriculums } from './config/curriculums';
import {
    SEMESTER_WIDTH, TOP_PADDING,
    COURSE_WIDTH, COURSE_HEIGHT, COURSE_GAP,
} from './constants/layout';
import { getOptionType } from './utils/courseHelpers';
import { getSemesterX } from './utils/semesterHelpers';

// Components
import { nodeTypes } from './components/flow/CourseNode';
import { edgeTypes } from './components/flow/AvoidingEdge';
import SemesterLabel from './components/flow/SemesterLabel';
import ToolbarPanel from './components/panels/ToolbarPanel';
import CurriculumPanel from './components/panels/CurriculumPanel';
import ResourcesPanel from './components/panels/ResourcesPanel';
import Tooltip from './components/overlays/Tooltip';

// Hooks
import { useGameState } from './hooks/useGameState';
import { useDragHandlers } from './hooks/useDragHandlers';
import { useImportExport } from './hooks/useImportExport';
import { useCustomCourses } from './hooks/useCustomCourses';

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

    const fileInputRef = useRef(null);
    const prevCurriculumRef = useRef(selectedCurriculum);
    const prevPlanRef = useRef(activePlanData);

    const nodesRef = useRef([]);
    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    // --- SEMESTER COMPLETION LOGIC ---
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
                alert('ไม่สามารถทำเครื่องหมายว่าสำเร็จการศึกษาได้ เนื่องจากมีวิชาที่ไม่ผ่านเงื่อนไขในเทอมนี้');
                return;
            }

            setCompletedSemesters(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
        }
    }, [nodes, checkCanCompleteSemester]);

    // --- HOOKS ---
    const updateGameState = useGameState({ completedSemestersRef, nodeRowsCount, checkCanCompleteSemester, toggleSemesterComplete });

    const {
        customCourses, setCustomCourses,
        showAddCourseForm, setShowAddCourseForm,
        showCourseTypeDropdown, setShowCourseTypeDropdown,
        newCourseForm, setNewCourseForm,
        buildCustomNode, handleAddCourse, handleDeleteCustomCourse,
    } = useCustomCourses({ nodes, completedSemesters, nodeRowsCount, setNodeRowsCount, setHoveredNodeId, setSelectedNodeId, setTooltip });

    const { onNodeDragStart, onNodeDragStop } = useDragHandlers({
        nodeRowsCount, completedSemestersRef, updateGameState, setNodes, setCustomCourses, setSelectedNodeId
    });

    const { handleExport, /* handleExportDev, */ handleImport, handleDropdownChange } = useImportExport({
        nodes, selectedCurriculum, nodeRowsCount, customCourses, completedSemesters,
        setSelectedCurriculum, setActivePlanData, setCustomCourses, setCompletedSemesters,
        setLoadedFileName, setDropdownValue, setNodeRowsCount,
    });

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

    // --- MAIN EFFECT: Generate nodes/edges from catalog ---
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
                const semKey = `${year}-${sem}`;
                const isCompleted = completedSemestersRef.current.has(semKey);
                const isClickable = isCompleted || checkCanCompleteSemester(year, sem, completedSemestersRef.current);

                generatedNodes.push({
                    id: `sem-bg-${year}-${sem}`,
                    type: 'default',
                    data: {
                        label: (
                            <SemesterLabel
                                year={year}
                                sem={sem}
                                credits={semesterCredits}
                                isCompleted={isCompleted}
                                isClickable={isClickable}
                                nodeRowsCount={newRowCount}
                                onToggleComplete={toggleSemesterComplete}
                            />
                        )
                    },
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

                    const semKey = `${year}-${sem}`;
                    const isCompleted = completedSemestersRef.current.has(semKey);
                    const isClickable = isCompleted || checkCanCompleteSemester(year, sem, completedSemestersRef.current);

                    return {
                        ...node,
                        style: {
                            ...node.style,
                            height: calculatedSemesterHeight
                        },
                        data: {
                            ...node.data,
                            label: (
                                <SemesterLabel
                                    year={year}
                                    sem={sem}
                                    credits={semesterCredits}
                                    isCompleted={isCompleted}
                                    isClickable={isClickable}
                                    nodeRowsCount={nodeRowsCount}
                                    onToggleComplete={toggleSemesterComplete}
                                />
                            )
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

    // *** REMOVED: the useEffect that watched hoveredNodeId and called setEdges/setNodes ***
    // That was the root cause of the flickering and highlight dropping.
    // Edge and node visual state is now computed purely in useMemo (displayEdges / displayNodes)
    // without touching the base state, so there are no race conditions or extra renders.

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

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
            return; // Prevent deletion if there are nodes in the bottom row
        }

        if (nodeRowsCount > 1) {
            setNodeRowsCount(prev => prev - 1);
        }
    };

    // --- Progress ---
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

    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const fitHeightZoom = screenHeight / 1600;

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

            <ToolbarPanel
                nodeRowsCount={nodeRowsCount}
                onAddRow={handleAddRow}
                onDeleteRow={handleDeleteRow}
                showAddCourseForm={showAddCourseForm}
                setShowAddCourseForm={setShowAddCourseForm}
                newCourseForm={newCourseForm}
                setNewCourseForm={setNewCourseForm}
                showCourseTypeDropdown={showCourseTypeDropdown}
                setShowCourseTypeDropdown={setShowCourseTypeDropdown}
                customCourses={customCourses}
                onAddCourse={handleAddCourse}
                onDeleteCustomCourse={handleDeleteCustomCourse}
            />

            <ResourcesPanel resources={curriculums[selectedCurriculum]?.resources} />

            <CurriculumPanel
                curriculumNames={Object.keys(curriculums)}
                dropdownValue={dropdownValue}
                loadedFileName={loadedFileName}
                completedCredits={completedCredits}
                totalCredits={totalCredits}
                progressPercent={progressPercent}
                onDropdownChange={handleDropdownChange}
                onExport={handleExport}
                /* onExportDev={handleExportDev} */
                onImport={handleImport}
                fileInputRef={fileInputRef}
            />

            <Tooltip tooltip={tooltip} />

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