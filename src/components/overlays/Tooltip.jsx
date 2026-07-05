import React from 'react';

const Tooltip = ({ tooltip }) => {
    if (!tooltip) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#1e1e1e',
            color: '#fff',
            borderRadius: '8px',
            padding: '10px 18px',
            maxWidth: '700px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            pointerEvents: 'none',
            border: tooltip.reasons.length > 0 ? '1px solid #ff4444' : '1px solid #f59e0b',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
        }}>
            {tooltip.reasons.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#ff6b6b', whiteSpace: 'nowrap' }}>
                        ⚠ ลงวิชา {tooltip.course.courseId} ในปี {tooltip.course.currentYear} เทอม {tooltip.course.currentSemester} ไม่ได้เพราะ
                    </div>
                    <div>
                        {tooltip.reasons.map((r, i) => (
                            <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>• {r}</div>
                        ))}
                    </div>
                </div>
            )}
            {tooltip.warnings.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', borderTop: tooltip.reasons.length > 0 ? '1px solid #444' : 'none', paddingTop: tooltip.reasons.length > 0 ? '6px' : 0 }}>
                    <div style={{ fontWeight: 'bold', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                        {
                            tooltip.course.currentSemester === tooltip.course.suggestedSemester ?
                                '⚡ คำเตือน: ' :
                                '⚡ คำเตือน: โปรดตรวจสอบให้แน่ใจว่าวิชา' +
                                (tooltip.course.courseId ? ` ${tooltip.course.courseId} เปิดสอนใน` : 'นี้เปิดสอนใน') +
                                (tooltip.course.currentSemester === 3 ? ' Summer' : `เทอม ${tooltip.course.currentSemester}`)
                        }
                    </div>
                    <div style={{ color: '#fde68a' }}>
                        {tooltip.warnings.map((w, i) => (
                            <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>• {w}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;
