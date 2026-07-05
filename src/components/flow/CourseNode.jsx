import React from 'react';
import { Handle, Position } from 'reactflow';
import { getOptionPlaceholder } from '../../utils/courseHelpers';

const CourseNode = ({ id, data }) => {
    const isSummer = data.suggestedSemester === 3;
    const suggestedLabel = isSummer
        ? `Y${data.suggestedYear}-Summer`
        : `Y${data.suggestedYear}-${data.suggestedSemester}`;
    const isOffSchedule = data.currentYear !== data.suggestedYear || data.currentSemester !== data.suggestedSemester;
    const selectedCourseId = data.courseId || '';
    const selectedOption = data.dropdownOptions?.find(opt => opt.courseId === selectedCourseId);
    const courseTitle = selectedOption?.courseTitle || data.courseTitle;
    const isSemCompleted = !!data.isSemCompleted;

    const handleSelect = (event) => {
        if (data.onSelectCourse) {
            data.onSelectCourse(id, event.target.value);
        }
    };

    const handleMouseEnter = () => {
        if (data.onHover) data.onHover(id);
    };

    const handleMouseLeave = () => {
        if (data.onLeave) data.onLeave(id);
    };

    const handleClick = () => {
        if (data.onClick) data.onClick(id);
    };

    return (
        <>
            <Handle type="target" position={Position.Left} />
            <div
                onPointerEnter={handleMouseEnter}
                onPointerLeave={handleMouseLeave}
                onClick={handleClick}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: 8, paddingBottom: 4 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#444' }}>
                        {data.optionType ? (data.courseId || getOptionPlaceholder(data.optionType)) : (data.courseId || 'GenEd')}
                        {isOffSchedule && (
                            <span style={{ fontSize: '14px', color: '#777', marginLeft: '6px', fontWeight: 'bold' }}>
                                {suggestedLabel}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                        {data.creditHours} CR
                    </div>
                </div>
                {data.optionType ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%', minWidth: 0 }}>
                        <select
                            value={selectedCourseId}
                            className="nodrag"
                            disabled={isSemCompleted}
                            onChange={handleSelect}
                            style={{
                                flex: '1 1 0%',
                                minWidth: 0,
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '6px 8px',
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: '600',
                                lineHeight: '1.25',
                                color: '#000',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                cursor: isSemCompleted ? 'default' : 'pointer',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <option value="">{getOptionPlaceholder(data.optionType)}</option>
                            {(data.dropdownOptions || []).map(opt => (
                                <option
                                    key={opt.courseId}
                                    value={opt.courseId}
                                    disabled={data.otherSelectedIds?.includes(opt.courseId)}
                                >
                                    {opt.courseId} {opt.courseTitle}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div style={{ fontSize: '16px', lineHeight: '1.25', fontWeight: '600', color: '#000' }}>
                        {courseTitle}
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Right} />
        </>
    );
};

export const nodeTypes = { course: CourseNode };
export default CourseNode;
