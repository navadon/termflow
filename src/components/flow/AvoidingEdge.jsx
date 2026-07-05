import React from 'react';
import { BaseEdge, useStore } from 'reactflow';
import { COURSE_WIDTH, COURSE_HEIGHT } from '../../constants/layout';
import { edgePassesThroughNode } from '../../utils/geometry';

// --- CUSTOM EDGE: หลบ node ที่ขวางอยู่กลางทาง ---
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

    const HANDLE_SPREAD = 10;

    const spreadOffset = (index, centerIndex) => {
        return (index - centerIndex) * HANDLE_SPREAD;
    };

    const outIndex = siblingOutEdges.findIndex(e => e.edgeId === id);
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

export const edgeTypes = { avoiding: AvoidingEdge };
export default AvoidingEdge;
