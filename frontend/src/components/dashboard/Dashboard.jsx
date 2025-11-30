import { useState } from 'react';
import { Home, Search, BarChart3, Bell, PieChart, Package, LogOut , GraduationCap, Sun ,Moon } from 'lucide-react';
import AIChatInput from './Ai';
import TextType from './Texttype';
import Calendar from './Calendar';

function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Sidebar */}
      <div 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        style={{
        width: isExpanded ? '280px' : '80px',
        backgroundColor: isDarkMode ? '#0a0a0a' : '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${isDarkMode ? '#1f1f1f' : '#e5e5e5'}`,
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
        boxShadow: isExpanded ? (isDarkMode ? '4px 0 20px rgba(0, 0, 0, 0.5)' : '4px 0 20px rgba(0, 0, 0, 0.1)') : 'none'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: `1px solid ${isDarkMode ? '#1f1f1f' : '#e5e5e5'}`,
          display: 'flex',
          justifyContent: isExpanded ? 'flex-start' : 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#8b5cf6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              flexShrink: 0
            }}>
              <GraduationCap color="#ffffff" size={24} />
            </div>
            {isExpanded && (
              <div style={{ whiteSpace: 'nowrap' }}>
                <div style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  color: isDarkMode ? '#ffffff' : '#0a0a0a'
                }}>Mentoroid</div>
                <div style={{
                  fontSize: '12px',
                  color: isDarkMode ? '#737373' : '#737373'
                }}>User@mentoroid.com</div>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '20px 20px 16px 20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: `1px solid ${isDarkMode ? '#262626' : '#e5e5e5'}`,
            justifyContent: isExpanded ? 'flex-start' : 'center'
          }}>
            <Search size={18} color={isDarkMode ? '#737373' : '#737373'} style={{ flexShrink: 0 }} />
            {isExpanded && (
              <input
                type="text"
                placeholder="Search..."
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#ffffff' : '#0a0a0a',
                  fontSize: '14px',
                  width: '100%'
                }}
              />
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '8px 12px' }}>
          <NavItem icon={<Home size={20} />} label="Dashboard" isDarkMode={isDarkMode} isExpanded={isExpanded} /> 
          <NavItem icon={<Bell size={20} />} label="Notifications" isDarkMode={isDarkMode} isExpanded={isExpanded} />
          <NavItem icon={<PieChart size={20} />} label="Analytics" isDarkMode={isDarkMode} isExpanded={isExpanded} />
          <NavItem icon={<Package size={20} />} label="Inventory" isDarkMode={isDarkMode} isExpanded={isExpanded} />
        </nav>

        {/* Footer */}
        <div style={{
          padding: '16px 12px',
          borderTop: `1px solid ${isDarkMode ? '#1f1f1f' : '#e5e5e5'}`
        }}>
          <NavItem icon={<LogOut size={20} />} label="Logout" isDarkMode={isDarkMode} isExpanded={isExpanded} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'space-between' : 'center',
            padding: '12px 16px',
            marginTop: '8px'
          }}>
            {isExpanded && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: isDarkMode ? '#a3a3a3' : '#525252',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontSize: '18px' }}>
                  <Sun /> </span>
                <span>Light mode</span>
              </div>
            )}
            <button
              onClick={toggleTheme}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: isDarkMode ? '#8b5cf6' : '#d4d4d4',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                position: 'absolute',
                top: '3px',
                left: isDarkMode ? '23px' : '3px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}>
                {isDarkMode ? <Moon size={10}/> : <Sun size={10}/>}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        backgroundColor: isDarkMode ? '#000000' : '#ffffff',
        padding: '40px',
        overflowY: 'auto',
        transition: 'all 0.3s ease',
        marginLeft: '80px'
      }}>
        
        {/* <div style={{
          borderRadius:"10px",
          backgroundColor:isDarkMode ? "#1a1a1a" : "#f5f5f5",
          width:"65%",
          paddingTop:"20px",
          display:"flex",
          flexDirection:"column",
          height: "80vh",
          minHeight: "400px",
          overflow: "hidden"
          }}>
          <AIChatInput />
        </div> */}
        <div  style={{display: 'flex', flexDirection: 'row'}}>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: isDarkMode ? '#ffffff' : '#0a0a0a',
              marginBottom: '8px'
            }}>
              HELLO, USER
            </h1>
            <TextType 
                text={["Hello, Welcome to Mentoroid!","Your AI-Powered Learning Companion.","Empowering Your Learning Journey."]}
                typingSpeed={10}
                pauseDuration={1500}
                showCursor={true}
                cursorCharacter="|"
                textColors={["#8b5cf6"]}
              />
            <br />
            <Calendar />
          </div>
          
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, isDarkMode, isExpanded }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '10px',
        cursor: 'pointer',
        marginBottom: '4px',
        backgroundColor: isHovered ? (isDarkMode ? '#1a1a1a' : '#f5f5f5') : 'transparent',
        transition: 'all 0.2s ease',
        color: isDarkMode ? '#a3a3a3' : '#525252',
        justifyContent: isExpanded ? 'flex-start' : 'center'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      {isExpanded && (
        <span style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>{label}</span>
      )}
    </div>
  );
}

export default Dashboard;