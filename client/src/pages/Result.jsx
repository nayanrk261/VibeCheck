import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSubmission } from '../api/index';

function Result() {
    const { id } = useParams();
    const[data, setData] = useState(null);
    const[loading, setLoading] = useState(true);
    const[error, setError] = useState('');

    useEffect (() => {
        const fetchdata = async () => {
            try{
                const result = await getSubmission(id);
                setData(result);
            }catch(err){
                setError('could not load result');
            }finally{
                setLoading(false);
            }
        };
        fetchdata();
    }, [id]);

     if(loading) return (
        <div style={{ textAlign: 'center', marginTop: '100px', color: '#636e72' }}>
            Loading your results...
        </div>
    );

    if(error) return (
        <div style={{ textAlign: 'center', marginTop: '100px', color: '#FF2D55' }}>
            {error}
        </div>
    );

    return (
        <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px' }}>
            
            {/* Header */}
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '4px' }}>
                Vibe<span style={{ color: '#FF2D55' }}>Check</span> Report
            </h1>
            <p style={{ color: '#636e72', marginBottom: '40px' }}>
                {data.repoUrl}
            </p>

            {/* Overall Score */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '24px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', fontWeight: '800', color: '#FF2D55' }}>
                    {data.scores.overall}
                </div>
                <div style={{ color: '#636e72', fontSize: '14px' }}>Overall VibeCheck Score / 100</div>
            </div>

            {/* Category Scores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {[
                    { label: 'Security', value: data.scores.security },
                    { label: 'Code Quality', value: data.scores.codeQuality },
                    { label: 'UI/UX', value: data.scores.uiUx },
                    { label: 'Performance', value: data.scores.performance },
                ].map((item) => (
                    <div key={item.label} style={{ background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{item.value}</div>
                        <div style={{ fontSize: '12px', color: '#636e72', letterSpacing: '1px' }}>{item.label.toUpperCase()}</div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '8px', fontSize: '14px', letterSpacing: '1px', color: '#636e72' }}>SUMMARY</h3>
                <p style={{ lineHeight: '1.7', color: '#e0e0e0' }}>{data.summary}</p>
            </div>

            {/* Findings */}
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '14px', letterSpacing: '1px', color: '#636e72' }}>
                    FINDINGS ({data.findings.length})
                </h3>
                {data.findings.map((finding, index) => (
                    <div key={index} style={{
                        background: '#111',
                        border: `1px solid ${finding.severity === 'CRITICAL' ? '#FF2D55' : finding.severity === 'HIGH' ? '#FF6B35' : '#222'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '10px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '600' }}>{finding.title}</span>
                            <span style={{ fontSize: '11px', color: finding.severity === 'CRITICAL' ? '#FF2D55' : '#FF6B35', fontWeight: '700' }}>
                                {finding.severity}
                            </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{finding.description}</p>
                        <p style={{ fontSize: '13px', color: '#34C759' }}>Fix: {finding.fix}</p>
                    </div>
                ))}
            </div>

            {/* Positives */}
            {data.positives && data.positives.length > 0 && (
                <div style={{ background: '#0a1a0c', border: '1px solid #1a3a1e', borderRadius: '12px', padding: '20px' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '14px', letterSpacing: '1px', color: '#34C759' }}>
                        ✓ WHAT YOU GOT RIGHT
                    </h3>
                    {data.positives.map((positive, index) => (
                        <p key={index} style={{ fontSize: '13px', color: '#6fcf97', marginBottom: '6px' }}>
                            ✓ {positive}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Result;
