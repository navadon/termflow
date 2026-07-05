import { useCallback, useRef } from 'react';
import { COURSE_WIDTH, COURSE_HEIGHT, TOP_PADDING, COURSE_GAP, SEMESTER_WIDTH } from '../constants/layout';
import { getSemesterX, isPositionInsideFrame } from '../utils/semesterHelpers';

export function useDragHandlers({ nodeRowsCount, completedSemestersRef, updateGameState, setNodes, setCustomCourses, setSelectedNodeId }) {
    const initialDragPos = useRef(null);
    const lastValidNodePositions = useRef({});

    const checkPositionInsideFrame = useCallback((position) => {
        return isPositionInsideFrame(position, nodeRowsCount, completedSemestersRef.current);
    }, [nodeRowsCount, completedSemestersRef]);

    const onNodeDragStart = useCallback((event, node) => {
        if ((node.type === 'default' || node.type === 'course') && !node.id.startsWith('sem-bg')) {
            initialDragPos.current = node.position;
            // บันทึกตำแหน่งปัจจุบัน (ถ้าอยู่ในกรอบ) เป็น last valid position
            if (checkPositionInsideFrame(node.position)) {
                lastValidNodePositions.current[node.id] = { ...node.position };
            }
            setSelectedNodeId(null);
            // NOTE: hoveredNodeId is intentionally NOT cleared here.
            // The pointer is still on the node, so hover should stay active.
        }
    }, [checkPositionInsideFrame, setSelectedNodeId]);

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
                    if (checkPositionInsideFrame(node.position)) {
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
    }, [nodeRowsCount, completedSemestersRef, updateGameState, setNodes, setCustomCourses, checkPositionInsideFrame]);

    return { onNodeDragStart, onNodeDragStop };
}
