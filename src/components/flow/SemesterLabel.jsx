import React from 'react';
import { TOP_PADDING, COURSE_HEIGHT, COURSE_GAP, SEMESTER_WIDTH, COURSE_WIDTH } from '../../constants/layout';

const SemesterLabel = ({ year, sem, credits, isCompleted, isClickable, nodeRowsCount, onToggleComplete }) => {
    const isSummer = sem === 3;
    const titleText = isSummer ? `Year ${year} - Summer` : `Year ${year} - Semester ${sem}`;
    const maxCredits = 22;

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
                            onToggleComplete(year, sem, credits);
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

export default SemesterLabel;
