import React from 'react';
import { COURSE_TYPE_OPTIONS } from '../../utils/courseHelpers';

const AddCourseForm = ({
    newCourseForm,
    setNewCourseForm,
    showCourseTypeDropdown,
    setShowCourseTypeDropdown,
    customCourses,
    onAddCourse,
    onDeleteCustomCourse,
}) => {
    const selected = COURSE_TYPE_OPTIONS.find(o => o.value === newCourseForm.courseType) || COURSE_TYPE_OPTIONS[4];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px solid #eee', minWidth: '340px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#5b21b6' }}>เพิ่มวิชาเอง</div>

            {/* Row 1: รหัสวิชา + ชื่อวิชา */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>รหัสวิชา</label>
                    <input
                        placeholder="เช่น 261101"
                        value={newCourseForm.courseId}
                        onChange={e => setNewCourseForm(prev => ({ ...prev, courseId: e.target.value }))}
                        style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '120px' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>ชื่อวิชา <span style={{ color: '#dc3545' }}>*</span></label>
                    <input
                        placeholder="ชื่อวิชาภาษาไทย/อังกฤษ"
                        value={newCourseForm.courseTitle}
                        onChange={e => setNewCourseForm(prev => ({ ...prev, courseTitle: e.target.value }))}
                        style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            {/* Row 2: หน่วยกิต + ปี + เทอม */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>หน่วยกิต</label>
                    <input
                        type="number"
                        min={0} max={9}
                        value={newCourseForm.creditHours}
                        onChange={e => setNewCourseForm(prev => ({ ...prev, creditHours: e.target.value }))}
                        style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '70px' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>ปีการศึกษา</label>
                    <select
                        value={newCourseForm.year}
                        onChange={e => setNewCourseForm(prev => ({ ...prev, year: e.target.value }))}
                        style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(y => <option key={y} value={y}>ปี {y}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>ภาคเรียน</label>
                    <select
                        value={newCourseForm.semester}
                        onChange={e => setNewCourseForm(prev => ({ ...prev, semester: e.target.value }))}
                        style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                    >
                        <option value={1}>เทอม 1</option>
                        <option value={2}>เทอม 2</option>
                        <option value={3}>Summer</option>
                    </select>
                </div>
            </div>

            {/* Row 3: ประเภทวิชา + ปุ่มเพิ่ม */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>ประเภทวิชา</label>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowCourseTypeDropdown(prev => !prev)}
                            style={{
                                padding: '6px 10px', border: `2px solid ${selected.color}`,
                                borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
                                fontWeight: 'bold', color: selected.color, background: 'white',
                                display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: selected.color, display: 'inline-block', flexShrink: 0 }} />
                            {selected.label}
                            <span style={{ fontSize: '10px', marginLeft: '2px' }}>▾</span>
                        </button>
                        {showCourseTypeDropdown && (
                            <div style={{
                                position: 'absolute', top: '110%', left: 0, zIndex: 999,
                                background: 'white', border: '1px solid #ccc', borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: '130px',
                            }}>
                                {COURSE_TYPE_OPTIONS.map(opt => (
                                    <div
                                        key={opt.value}
                                        onClick={() => { setNewCourseForm(prev => ({ ...prev, courseType: opt.value })); setShowCourseTypeDropdown(false); }}
                                        style={{
                                            padding: '7px 12px', cursor: 'pointer', fontSize: '13px',
                                            fontWeight: 'bold', color: opt.color,
                                            background: newCourseForm.courseType === opt.value ? '#f5f5f5' : 'white',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
                                        onMouseLeave={e => e.currentTarget.style.background = newCourseForm.courseType === opt.value ? '#f5f5f5' : 'white'}
                                    >
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color, display: 'inline-block', flexShrink: 0 }} />
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={onAddCourse}
                    style={{ padding: '6px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', alignSelf: 'flex-end' }}
                >
                    เพิ่มวิชา
                </button>
            </div>
            {customCourses.length > 0 && (
                <div style={{ marginTop: '4px', maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>วิชาที่เพิ่มเอง ({customCourses.length})</div>
                    {customCourses.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f3ff', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}>
                            <span style={{ color: '#5b21b6', fontWeight: 'bold', marginRight: '6px' }}>{c.courseId || '—'}</span>
                            <span style={{ flex: 1, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.courseTitle}</span>
                            <span style={{ color: '#888', marginLeft: '6px', whiteSpace: 'nowrap' }}>ปี{c.selectedYear} เทอม{c.selectedSemester === 3 ? ' S' : c.selectedSemester} • {c.creditHours}CR</span>
                            <button
                                onClick={() => onDeleteCustomCourse(c.id)}
                                style={{ marginLeft: '8px', padding: '2px 6px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AddCourseForm;
