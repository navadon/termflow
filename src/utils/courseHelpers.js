export const getOptionType = (courseTitle) => {
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

export const getOptionPlaceholder = (optionType) => {
    switch (optionType) {
        case 'languageLiteracy': return 'Lang Literacy';
        case 'digitalLiteracy': return 'Digital Literacy';
        case 'globalCitizenship': return 'Global Citizenship';
        case 'creativityInnovation': return 'Creativity & Inno';
        case 'entrepreneurialSkills': return 'Entre Skills';
        case 'geElective': return 'GenEd Elective';
        case 'majorElective': return 'Major Elective';
        default: return 'Select Course';
    }
};

export const getBorderColor = (courseType) => {
    if (courseType === 'math and sci') return '#c9c900';
    if (courseType === 'major courses') return '#00008b';
    if (courseType === 'gen engr') return '#8b1c62';
    if (courseType === 'gen edu') return '#008800';
    if (courseType === 'others') return '#808080';
    return '#333';
};

export const COURSE_TYPE_OPTIONS = [
    { value: 'math and sci', label: 'Math & Sci', color: '#c9c900' },
    { value: 'major courses', label: 'Major', color: '#00008b' },
    { value: 'gen engr', label: 'Gen Engr', color: '#8b1c62' },
    { value: 'gen edu', label: 'Gen Edu', color: '#008800' },
    { value: 'others', label: 'Others', color: '#808080' },
];
