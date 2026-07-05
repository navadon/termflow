import React from 'react';

const ResourcesPanel = ({ resources }) => {
    if (!resources || resources.length === 0) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: 20,
            left: 60,
            zIndex: 10,
            background: 'white',
            padding: '8px 14px',
            borderRadius: '8px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
            fontFamily: 'sans-serif',
            border: '1px solid #ccc',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
        }}>
            <strong style={{ fontSize: '13px', color: '#333' }}>Resources:</strong>
            {resources.map((res, i) => (
                <a
                    key={i}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        padding: '5px 10px',
                        borderRadius: '5px',
                        border: '1.5px solid #6b009c',
                        backgroundColor: '#9300ce',
                    }}
                >
                    {res.title}
                </a>
            ))}
        </div>
    );
};

export default ResourcesPanel;
