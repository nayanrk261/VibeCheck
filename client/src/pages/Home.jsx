import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitAudit } from '../api/index';

function Home(){
    const[repoUrl,setRepoUrl] = useState('');
    const[liveUrl,setLiveUrl] = useState('');
    const[loading,setLoading] = useState(false);
    const[error,setError] = useState('');

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try{
            const result = await submitAudit(repoUrl,liveUrl);
            navigate(`/result/${result.submissionId}`);
        }catch(err){
            setError("Audits failed! Please check your URl's an try again");
        }finally{
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px' }}>
                Vibe<span style={{ color: '#FF2D55' }}>Check</span>
            </h1>
            <p style={{ color: '#636e72', marginBottom: '40px' }}>
                Is your vibe coded app actually secure?
            </p>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', letterSpacing: '1px', color: '#636e72' }}>
                        GITHUB REPO URL
                    </label>
                    <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/username/repo"
                        required
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#111',
                            border: '1px solid #222',
                            borderRadius: '8px',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', letterSpacing: '1px', color: '#636e72' }}>
                        LIVE APP URL
                    </label>
                    <input
                        type="text"
                        value={liveUrl}
                        onChange={(e) => setLiveUrl(e.target.value)}
                        placeholder="https://your-app.vercel.app"
                        required
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#111',
                            border: '1px solid #222',
                            borderRadius: '8px',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {error && (
                    <p style={{ color: '#FF2D55', marginBottom: '16px', fontSize: '14px' }}>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: loading ? '#333' : '#FF2D55',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Analyzing... (this may take 30s)' : 'Run VibeCheck →'}
                </button>
            </form>
        </div>
    );
}

export default Home;