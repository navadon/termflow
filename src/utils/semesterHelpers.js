import {
    SEMESTER_WIDTH, SUMMER_WIDTH, GAP_BETWEEN_SEMESTERS, GAP_BETWEEN_YEARS,
    COURSE_WIDTH, COURSE_HEIGHT, COURSE_GAP, TOP_PADDING
} from '../constants/layout';

export const getSemesterX = (year, sem) => {
    if (year === 99 || year == null) return -350;

    const yearBlockWidth = (SEMESTER_WIDTH * 2) + SUMMER_WIDTH + (GAP_BETWEEN_SEMESTERS * 2) + GAP_BETWEEN_YEARS;
    const startX = (year - 1) * yearBlockWidth;

    if (sem === 1) return startX;
    if (sem === 2) return startX + SEMESTER_WIDTH + GAP_BETWEEN_SEMESTERS;
    if (sem === 3) return startX + (SEMESTER_WIDTH * 2) + (GAP_BETWEEN_SEMESTERS * 2);
    return 0;
};

// Pure function version — needs nodeRowsCount and completedSemesters as parameters
export const isPositionInsideFrame = (position, nodeRowsCount, completedSemesters) => {
    if (!position) return false;

    const nodeCenterX = position.x + (COURSE_WIDTH / 2);
    const nodeCenterY = position.y + (COURSE_HEIGHT / 2);

    for (let year = 1; year <= 8; year++) {
        for (let sem = 1; sem <= 3; sem++) {
            const targetSemKey = `${year}-${sem}`;
            if (completedSemesters.has(targetSemKey)) {
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
};
