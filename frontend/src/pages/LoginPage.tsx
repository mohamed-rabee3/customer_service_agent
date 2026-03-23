import React, { useState } from 'react';
import './LoginPage.css';
import { useNavigate } from 'react-router-dom';

// Robot image placeholder - using a placeholder since we can't easily access the original asset from here without copying it
// In a real scenario we'd copy the asset. For now, let's use a colored div or a generic placeholder if the image fails.

interface LoginProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = () => {
        // Mock login validation
        if (email && password) {
            onLogin();
            navigate('/');
        } else {
            alert('Please enter email and password');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="illustration">
                    <div className="robot-placeholder">
                        {/* <img src={robotImage} alt="Robot" className="robot-img" /> */}
                        <div style={{ width: '100%', height: '100%', background: '#e0f2f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                            Robot Image Placeholder
                        </div>
                    </div>
                </div>
                <div className="form-section">
                    <h2>Log in</h2>
                    <div className="input-group">
                        <label>Email address</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                        />
                    </div>
                    <button className="login-button" onClick={handleLogin}>Log in</button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
