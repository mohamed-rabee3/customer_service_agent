import React, { useState } from 'react';
import './LoginPage.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import robotImage from '@/assets/robot-clean.png';
import { Headphones, MessageCircle } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'supervisor'>('admin');
    const [supervisorType, setSupervisorType] = useState<'voice' | 'chat'>('voice');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = () => {
        login(role, supervisorType);
        onLogin();
        navigate('/');
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Left panel - floating robot */}
                <div className="illustration">
                    <div className="robot-wrapper">
                        <img src={robotImage} alt="AI Support Agent" className="robot-img" />
                        <div className="robot-shadow"></div>
                    </div>
                </div>

                {/* Right panel with form */}
                <div className="form-section">
                    <h2>Log in</h2>
                    
                    <div className="input-group">
                        <label>Email address <span className="optional-label">(optional)</span></label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Password <span className="optional-label">(optional)</span></label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Login as</label>
                        <div className="role-radio-group">
                            <label className={`custom-radio ${role === 'admin' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={role === 'admin'}
                                    onChange={() => setRole('admin')}
                                />
                                <span className="radio-circle"></span>
                                <span className="radio-text">Admin</span>
                            </label>
                            <label className={`custom-radio ${role === 'supervisor' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="supervisor"
                                    checked={role === 'supervisor'}
                                    onChange={() => setRole('supervisor')}
                                />
                                <span className="radio-circle"></span>
                                <span className="radio-text">Supervisor</span>
                            </label>
                        </div>
                    </div>

                    {role === 'supervisor' && (
                        <div className="input-group supervisor-type-group">
                            <label>Supervisor Type</label>
                            <div className="supervisor-cards">
                                <div 
                                    className={`supervisor-card ${supervisorType === 'voice' ? 'selected' : ''}`}
                                    onClick={() => setSupervisorType('voice')}
                                >
                                    <div className="card-icon">
                                        <Headphones size={24} />
                                    </div>
                                    <span className="card-label">Voice</span>
                                    <div className="card-check">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                </div>
                                <div 
                                    className={`supervisor-card ${supervisorType === 'chat' ? 'selected' : ''}`}
                                    onClick={() => setSupervisorType('chat')}
                                >
                                    <div className="card-icon">
                                        <MessageCircle size={24} />
                                    </div>
                                    <span className="card-label">Chat</span>
                                    <div className="card-check">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button className="login-button" onClick={handleLogin}>
                        <span className="button-text">Log in</span>
                        <span className="button-shine"></span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
