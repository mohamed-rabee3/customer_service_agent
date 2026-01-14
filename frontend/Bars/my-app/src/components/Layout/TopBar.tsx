import  { useState,useEffect } from 'react';
import './TopBar.css';
import { Bell, User, Sun, Moon, Search, LayoutDashboard, Mic, MessageSquare, BarChart3 } from 'lucide-react';

const TopBar = ({ isOpen }: { isOpen: boolean }) => {
 
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode]);
  return (
   <header className="topbar-container"
   style={{left:isOpen? '260px' : '0', width: isOpen ? 'calc(100%-260px': '100%',
    transition :'0.3s ease'}}>
  
  <div className="topbar-left">
  <div className="left-icons-group">
    <div className="icon-wrapper" data-tooltip="Dashboard">
      <LayoutDashboard size={20} />
    </div>
    <div className="icon-wrapper" data-tooltip="Voice Agent">
      <Mic size={20} />
    </div>
    <div className="icon-wrapper" data-tooltip="Chat Agent">
      <MessageSquare size={20} />
    </div>
    <div className="icon-wrapper" data-tooltip="Analytics">
      <BarChart3 size={20} />
    </div>
  </div>
</div>
   
   <div className="topbar-center">
   <div className="Search-box">
   < Search size ={18}
   className="Search-icon"/>
   <input type="text"
   placeholder="Search..."/>
   </div>
   </div>
  
  <div className="topbar-right">
   
   <div 
  className="icon-wrapper" 
  onClick={() => {
    console.log("Dark mode toggled!");
    setIsDarkMode(!isDarkMode)}}
    data-tooltip={isDarkMode? "Light Mode" : "Dark Mode"}
    
  
>
  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
</div>
   
    <div className="icon-wrapper"
    data-tooltip="Notifications">
      <Bell size={20} />
      <span className="badge"></span>
    </div>
    
    
    <div className="user-profile-section">
      <div className="user-info">
        <span className="user-name">User</span>
        <span className="user-status">● Online</span>
      </div>
      <div className="avatar-circle">
        <User size={18} color= "white"/>
      </div>
    </div>
  </div>
</header>
  );
};

export default TopBar;