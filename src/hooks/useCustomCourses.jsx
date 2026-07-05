import React, { useState, useCallback } from 'react';
import { Position } from 'reactflow';
import { COURSE_WIDTH, COURSE_HEIGHT, TOP_PADDING, COURSE_GAP, SEMESTER_WIDTH } from '../constants/layout';
import { getBorderColor } from '../utils/courseHelpers';
import { getSemesterX } from '../utils/semesterHelpers';

export function useCustomCourses({ nodes, completedSemesters, nodeRowsCount, setNodeRowsCount, setHoveredNodeId, setSelectedNodeId, setTooltip }) {
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

    const buildCustomNode = useCallback((course) => {
        const year = (course.selectedYear !== null && course.selectedYear !== undefined) ? course.selectedYear : 99;
        const sem = (course.selectedSemester !== null && course.selectedSemester !== undefined) ? course.selectedSemester : 99;
        const rowIndex = (course.rowIndex !== null && course.rowIndex !== undefined) ? course.rowIndex : 0;
        const colX = getSemesterX(year, sem);
        const cardX = colX + (SEMESTER_WIDTH - COURSE_WIDTH) / 2;
        const cardY = TOP_PADDING + rowIndex * (COURSE_HEIGHT + COURSE_GAP);

        const ct = course.courseType || 'others';
        const customBorderColor = getBorderColor(ct);

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
    }, [setHoveredNodeId, setSelectedNodeId, setTooltip]);

    const handleAddCourse = useCallback(() => {
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
    }, [newCourseForm, completedSemesters, nodes, customCourses, nodeRowsCount, setNodeRowsCount]);

    const handleDeleteCustomCourse = useCallback((courseId) => {
        setCustomCourses(prev => prev.filter(c => c.id !== courseId));
    }, []);

    return {
        customCourses,
        setCustomCourses,
        showAddCourseForm,
        setShowAddCourseForm,
        showCourseTypeDropdown,
        setShowCourseTypeDropdown,
        newCourseForm,
        setNewCourseForm,
        buildCustomNode,
        handleAddCourse,
        handleDeleteCustomCourse,
    };
}
