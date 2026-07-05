import React from 'react';
import AddCourseForm from './AddCourseForm';

const ToolbarPanel = ({
    nodeRowsCount,
    onAddRow,
    onDeleteRow,
    showAddCourseForm,
    setShowAddCourseForm,
    // AddCourseForm props
    newCourseForm,
    setNewCourseForm,
    showCourseTypeDropdown,
    setShowCourseTypeDropdown,
    customCourses,
    onAddCourse,
    onDeleteCustomCourse,
}) => {
    return (
        <div style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 10,
            background: 'white',
            padding: '12px 18px',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            fontFamily: 'sans-serif',
            border: '1px solid #ccc',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }}>
            {/* Row controls */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                    onClick={onAddRow}
                    style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                    + Add Row
                </button>
                <button
                    onClick={onDeleteRow}
                    disabled={nodeRowsCount <= 1}
                    style={{ padding: '8px 16px', background: nodeRowsCount <= 1 ? '#ccc' : '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: nodeRowsCount <= 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                    - Delete Row
                </button>
                <div style={{ width: '1px', height: '28px', background: '#ddd' }} />
                <button
                    onClick={() => setShowAddCourseForm(prev => !prev)}
                    style={{ padding: '8px 16px', background: showAddCourseForm ? '#5b21b6' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                    {showAddCourseForm ? '✕ ยกเลิก' : '＋ เพิ่มวิชา'}
                </button>
            </div>

            {/* Add course form */}
            {showAddCourseForm && (
                <AddCourseForm
                    newCourseForm={newCourseForm}
                    setNewCourseForm={setNewCourseForm}
                    showCourseTypeDropdown={showCourseTypeDropdown}
                    setShowCourseTypeDropdown={setShowCourseTypeDropdown}
                    customCourses={customCourses}
                    onAddCourse={onAddCourse}
                    onDeleteCustomCourse={onDeleteCustomCourse}
                />
            )}
        </div>
    );
};

export default ToolbarPanel;
