import React from 'react';
import avatar1 from '@/assets/avatar-agent-1.png';
import avatar2 from '@/assets/avatar-agent-2.png';
import avatar3 from '@/assets/avatar-agent-3.png';

interface AgentAvatarProps {
  name: string;
  status: 'active' | 'idle';
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

const avatarMap: Record<string, string> = {
  'Agent 1': avatar1,
  'Agent 2': avatar2,
  'Agent 3': avatar3,
};

const sizes = {
  sm: { ring: 56, dot: 14, dotBorder: 2.5, dotOffset: 0 },
  md: { ring: 72, dot: 16, dotBorder: 2.5, dotOffset: 1 },
  lg: { ring: 88, dot: 18, dotBorder: 3, dotOffset: 2 },
};

const AgentAvatar: React.FC<AgentAvatarProps> = ({ name, status, size = 'md', showStatus = true }) => {
  const s = sizes[size];
  const src = avatarMap[name] || avatar1;
  const isActive = status === 'active';

  return (
    <div className="agent-avatar-wrapper" style={{ position: 'relative', width: s.ring, height: s.ring }}>
      {/* Ripple effect for active agents */}
      {isActive && (
        <>
          <span className="avatar-ripple avatar-ripple--1" style={{ width: s.ring, height: s.ring }} />
          <span className="avatar-ripple avatar-ripple--2" style={{ width: s.ring, height: s.ring }} />
        </>
      )}
      <div
        className="agent-avatar-circle"
        style={{
          width: s.ring,
          height: s.ring,
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 4px 14px rgba(33, 52, 72, 0.2)',
          border: '2.5px solid #fff',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <img
          src={src}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
      {showStatus && (
        <span
          className="avatar-status-dot"
          style={{
            position: 'absolute',
            bottom: s.dotOffset,
            right: s.dotOffset,
            width: s.dot,
            height: s.dot,
            borderRadius: '50%',
            background: isActive ? '#22c55e' : '#94a3b8',
            border: `${s.dotBorder}px solid #fff`,
            boxShadow: isActive ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
            zIndex: 3,
          }}
        />
      )}
    </div>
  );
};

export default AgentAvatar;
