import React, { useCallback } from 'react';
import { COURSE_HEIGHT, COURSE_GAP, TOP_PADDING } from '../constants/layout';
import { getBorderColor } from '../utils/courseHelpers';
import { isNodeInside } from '../utils/geometry';
import SemesterLabel from '../components/flow/SemesterLabel';

export function useGameState({ completedSemestersRef, nodeRowsCount, checkCanCompleteSemester, toggleSemesterComplete }) {
    const updateGameState = useCallback((currentNodes) => {
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
                const semKey = `${year}-${sem}`;
                const isSemCompleted = completedSemestersRef.current.has(semKey);
                const isSummer = sem === 3;
                const isClickable = isSemCompleted || checkCanCompleteSemester(year, sem, completedSemestersRef.current);
                return {
                    ...node,
                    data: {
                        ...node.data,
                        label: (
                            <SemesterLabel
                                year={year}
                                sem={sem}
                                credits={credits}
                                isCompleted={isSemCompleted}
                                isClickable={isClickable}
                                nodeRowsCount={nodeRowsCount}
                                onToggleComplete={toggleSemesterComplete}
                            />
                        )
                    },
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

                const borderColor = getBorderColor(node.data.courseType);

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

                        border: isInvalid ? '4px solid red' : `2px solid ${borderColor}`,
                        boxShadow: isInvalid ? '0 0 15px rgba(255,0,0,0.6)' : 'none',
                        cursor: isSemCompleted ? 'default' : 'pointer',
                    }
                };
            }
            return node;
        });
    }, [completedSemestersRef, nodeRowsCount, checkCanCompleteSemester, toggleSemesterComplete]);

    return updateGameState;
}
