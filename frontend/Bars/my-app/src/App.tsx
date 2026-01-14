import { useState } from 'react';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import LoginPage from './pages/LoginPage'; 
import { Menu, X } from 'lucide-react';
import './App.css'; 

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const handleLogin = () => { setIsLoggedIn(true);}
  const handleLogout = () => { setIsLoggedIn(false);

  }
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      
      {!isLoggedIn ? (
       
        <LoginPage onLogin={handleLogin} />
      ) : (
        /* If login swap to the other page */
        <div style={{ display: 'flex', position: 'relative' }}>
          
          {/* Side bar button*/}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
              style={{
              position: 'fixed',
              top: '15px',
              left: isOpen ? '275px' : '15px',
              zIndex: 1001,
              width: '35px',
              height: '35px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'left 0.3s ease',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <TopBar isOpen={isOpen}/>

          {/* Moving side bar*/}
          <div style={{
            position: 'fixed',
            left: isOpen ? '0' : '-260px',
            transition: '0.3s ease',
            height: '100%',
            zIndex: 999
          }}>

          <Sidebar 
          onLogout={handleLogout}/>

          </div>

          {/* Main page view*/}
          <main style={{ 
            flex: 1, 
            padding: '80px 20px 20px 20px', 
            marginLeft: isOpen ? '260px' : '0', 
            transition: '0.3s ease'
          }}>
            <h1 style={{ color: 'var(--primary)' }}>Dashboard Page</h1>
            
          </main>
        </div>
      )}
    </div>
  );
}

export default App;