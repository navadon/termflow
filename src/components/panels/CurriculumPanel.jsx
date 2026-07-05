import React from 'react';

const CurriculumPanel = ({
    curriculumNames,
    dropdownValue,
    loadedFileName,
    completedCredits,
    totalCredits,
    progressPercent,
    onDropdownChange,
    onExport,
    /* onExportDev, */
    onImport,
    fileInputRef,
}) => {
    return (
        <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 10,
            background: 'white',
            padding: '8px 14px',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            fontFamily: 'sans-serif',
            border: '1px solid #ccc',
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Curriculum:</label>
                    <select
                        value={dropdownValue}
                        onChange={onDropdownChange}
                        style={{ padding: '4px 8px', fontSize: '13px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #aaa' }}
                    >
                        <option value="" disabled={!loadedFileName}>
                            {loadedFileName ? 'Imported Plan' : ''}
                        </option>
                        {curriculumNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ fontSize: '13px', color: '#333', marginTop: '1px', fontFamily: 'sans-serif' }}>
                    <span style={{ fontWeight: 'bold' }}>Imported Plan: </span>
                    {loadedFileName ? (
                        <strong style={{ color: '#28a745' }}>{loadedFileName}</strong>
                    ) : (
                        <span style={{ color: '#888', fontStyle: 'italic' }}>None (Default template)</span>
                    )}
                </div>
            </div>

            <div style={{ borderLeft: '1px solid #ddd', height: '24px' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '150px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', fontFamily: 'sans-serif' }}>
                    Progress: {completedCredits} / {totalCredits} CR ({progressPercent}%)
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#28a745', transition: 'width 0.3s ease' }} />
                </div>
            </div>

            <div style={{ borderLeft: '1px solid #ddd', height: '24px' }}></div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={onExport}
                    style={{ padding: '6px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                    Export Plan
                </button>
                {/* 
                <button
                    onClick={onExportDev}
                    style={{ padding: '6px 12px', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                    Export Catalog (Dev)
                </button>
                */}
                <button
                    onClick={() => fileInputRef.current.click()}
                    style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                    Import Plan
                </button>
                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={onImport}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

export default CurriculumPanel;
