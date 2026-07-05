import { useCallback } from 'react';
import { curriculums } from '../config/curriculums';

export function useImportExport({
    nodes,
    selectedCurriculum,
    nodeRowsCount,
    customCourses,
    completedSemesters,
    setSelectedCurriculum,
    setActivePlanData,
    setCustomCourses,
    setCompletedSemesters,
    setLoadedFileName,
    setDropdownValue,
    setNodeRowsCount,
}) {
    const handleExport = useCallback(() => {
        const courseNodes = nodes.filter(n => (n.type === 'default' || n.type === 'course') && !n.id.startsWith('sem-bg') && !n.data?.isCustom && !n.id.startsWith('custom-'));

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
    }, [nodes, selectedCurriculum, nodeRowsCount, customCourses, completedSemesters]);

    /*
    const handleExportDev = useCallback(() => {
        const catalogData = curriculums[selectedCurriculum];
        if (!catalogData) return;

        const courseNodes = nodes.filter(n => (n.type === 'default' || n.type === 'course') && !n.id.startsWith('sem-bg') && !n.data?.isCustom && !n.id.startsWith('custom-'));
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
    }, [nodes, selectedCurriculum, nodeRowsCount]);
    */

    const handleImport = useCallback((event) => {
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
    }, [setSelectedCurriculum, setActivePlanData, setCustomCourses, setCompletedSemesters, setLoadedFileName, setDropdownValue, setNodeRowsCount]);

    const handleDropdownChange = useCallback((e) => {
        const val = e.target.value;
        if (val === "") return;
        setDropdownValue(val);
        setSelectedCurriculum(val);
        setActivePlanData(null);
        setCustomCourses([]);
        setCompletedSemesters(new Set());
        setLoadedFileName(null);
    }, [setDropdownValue, setSelectedCurriculum, setActivePlanData, setCustomCourses, setCompletedSemesters, setLoadedFileName]);

    return { handleExport, /* handleExportDev, */ handleImport, handleDropdownChange };
}
