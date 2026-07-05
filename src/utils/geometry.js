import { COURSE_WIDTH, COURSE_HEIGHT } from '../constants/layout';

export const segmentsIntersect = (ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) => {
    const dx1 = ax2 - ax1, dy1 = ay2 - ay1;
    const dx2 = bx2 - bx1, dy2 = by2 - by1;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-10) return false;
    const t = ((bx1 - ax1) * dy2 - (by1 - ay1) * dx2) / denom;
    const u = ((bx1 - ax1) * dy1 - (by1 - ay1) * dx1) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

export const edgePassesThroughNode = (sx, sy, tx, ty, node) => {
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

export const isNodeInside = (courseNode, semesterNode) => {
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
