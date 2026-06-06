import React, { useState } from 'react';
import './LoginPage.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBrand, DEFAULT_LOGO_URL } from '../context/BrandContext';

const LoginPage: React.FC = () => {
    const { brand } = useBrand();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        setError('');
        setLoading(true);
        const result = await login(email, password);
        setLoading(false);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error || 'Login failed. Please check your credentials.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleLogin();
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Left panel - floating robot */}
                <div className="illustration">
                    <div className="robot-wrapper">
                        <img
                            src={brand.logoUrl || DEFAULT_LOGO_URL}
                            alt={`${brand.companyName} logo`}
                            className="robot-img brand-cover-logo"
                        />
                        <div className="robot-shadow"></div>
                    </div>
                </div>

                {/* Right panel with form */}
                <div className="form-section">
                    <h2>Log in</h2>
                    
                    {error && (
                        <div style={{
                            padding: '10px 14px',
                            marginBottom: '16px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="input-group">
                        <label>Email address</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <button 
                        className="login-button" 
                        onClick={handleLogin}
                        disabled={loading}
                        style={{ opacity: loading ? 0.7 : 1 }}
                    >
                        <span className="button-text">{loading ? 'Signing in...' : 'Log in'}</span>
                        <span className="button-shine"></span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
