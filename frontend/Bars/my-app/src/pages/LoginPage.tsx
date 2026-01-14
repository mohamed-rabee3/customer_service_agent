import React from 'react';
import './LoginPage.css'; 
import robotImage from '../assets/robot-new.jpg'; 
interface LoginProps {onLogin: () => void 

}

const LoginPage: React.FC<LoginProps> = ({onLogin}) => {
  return (
    <div className="container">
      <div className="login-card">
        <div className="illustration">
          <div className="robot-placeholder">
             <img src={robotImage} alt="Robot" className="robot-img" />
          </div>
        </div>
        <div className="form-section">
          <h2>Log in</h2>
          <div className="input-group">
            <label>Email address</label>
            <input type="email" placeholder="Enter your email" className="input-field" />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" className="input-field" />
          </div>
          <button className="login-button" onClick={onLogin}>Log in</button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;