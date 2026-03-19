import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ─── Mouse-reactive 3D Avatar ────────────────────
const Avatar3D: React.FC<{ avatarUrl: string | null; name: string; onCameraClick: () => void }> = ({ avatarUrl, name, onCameraClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.clientX - centerX) / (window.innerWidth / 2);
      const y = (e.clientY - centerY) / (window.innerHeight / 2);
      setTilt({ x: y * -12, y: x * 12 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} style={{ perspective: 600 }}>
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        style={{ transformStyle: 'preserve-3d', position: 'relative' }}
      >
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'linear-gradient(135deg, hsl(211 36% 21%), hsl(206 28% 45%))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '4px solid var(--glass-border)',
          boxShadow: '0 20px 60px rgba(33,52,72,0.3), 0 0 40px rgba(84,119,146,0.1)',
          fontSize: 52, fontWeight: 700, color: '#fff',
          fontFamily: 'var(--font-family)',
          transform: 'translateZ(20px)',
        }}>
          {!avatarUrl && name.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={onCameraClick}
          style={{
            position: 'absolute', bottom: 4, right: 4,
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent-hex)', border: '3px solid var(--surface)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'var(--transition)',
            transform: 'translateZ(30px)',
          }}
        >
          <Camera size={16} />
        </button>
      </motion.div>
    </div>
  );
};

// ─── Electricity Shimmer Field ────────────────────
const ShimmerField: React.FC<{
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
  type?: string; prevValue: string; syncing: boolean;
}> = ({ label, value, editing, onChange, type = 'text', prevValue, syncing }) => {
  const changed = prevValue !== value && !editing && !syncing;

  return (
    <div style={{ width: '100%' }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1,
        fontFamily: 'var(--font-family)',
      }}>
        {label}
      </label>
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'relative' }}
          >
            <input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)',
                border: '2px solid transparent', background: 'var(--input-bg)',
                color: 'var(--text-main)', fontSize: 15, fontFamily: 'var(--font-family)',
                outline: 'none', transition: 'var(--transition)',
                boxSizing: 'border-box',
              }}
              className="electricity-input"
            />
          </motion.div>
        ) : (
          <motion.p
            key={`text-${value}`}
            initial={changed ? { scale: 0.95, opacity: 0 } : { opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={changed ? { type: 'spring', stiffness: 400, damping: 15 } : { duration: 0.1 }}
            style={{
              margin: 0, fontSize: 16, fontWeight: 500, color: 'var(--text-main)',
              fontFamily: 'var(--font-family)', padding: '12px 16px',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              background: changed ? 'rgba(16,185,129,0.06)' : 'transparent',
            }}
          >
            {value}
          </motion.p>
        )}
      </AnimatePresence>
      {syncing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 4, fontSize: 11, color: 'var(--accent-hex)',
            fontFamily: 'var(--font-family)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span className="syncing-dot" /> Syncing...
        </motion.div>
      )}
    </div>
  );
};

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ open, onClose }) => {
  const { role, supervisorType } = useAuth();
  const { profile, updateProfile } = useUserProfile();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [prevName, setPrevName] = useState(profile.name);
  const [prevEmail, setPrevEmail] = useState(profile.email);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleLabel = role === 'admin' ? 'Admin' : `${supervisorType === 'voice' ? 'Voice' : 'Chat'} Supervisor`;

  // Sync local state when profile context changes or modal opens
  useEffect(() => {
    if (open) {
      setName(profile.name);
      setEmail(profile.email);
      setPrevName(profile.name);
      setPrevEmail(profile.email);
      setEditing(false);
      setSaved(false);
    }
  }, [open, profile.name, profile.email]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    // Update global context — Sidebar & TopBar update instantly
    updateProfile({ name, email });
    setPrevName(name);
    setPrevEmail(email);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateProfile({ avatarUrl: url });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Full-screen flex centering container + backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Centered Hero Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 460,
                background: 'var(--surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 40px 120px rgba(0,0,0,0.35), 0 0 80px rgba(84,119,146,0.12)',
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh',
                overflow: 'auto',
                margin: '0 16px',
              }}
            >
            {/* Close */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
              padding: '16px 20px 0',
            }}>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', padding: 6, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'var(--transition)',
              }}>
                <X size={20} />
              </button>
            </div>

            {/* Hero Content */}
            <div style={{ padding: '8px 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <Avatar3D
                avatarUrl={profile.avatarUrl}
                name={profile.name}
                onCameraClick={() => fileInputRef.current?.click()}
              />
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />

              {/* Role pill */}
              <motion.span
                layout
                style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-pill)',
                  background: 'rgba(84,119,146,0.12)', color: 'var(--accent-hex)',
                  fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-family)',
                  letterSpacing: 0.5,
                }}
              >
                {roleLabel}
              </motion.span>

              {/* Fields */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                <ShimmerField label="Full Name" value={name} editing={editing} onChange={setName} prevValue={prevName} syncing={saving} />
                <ShimmerField label="Email" value={email} editing={editing} onChange={setEmail} type="email" prevValue={prevEmail} syncing={saving} />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 32px 24px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 12, justifyContent: 'flex-end',
            }}>
              {!editing ? (
                <button onClick={() => setEditing(true)} style={{
                  padding: '10px 28px', borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-hex)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  fontFamily: 'var(--font-family)', transition: 'var(--transition)',
                }}>
                  Edit Profile
                </button>
              ) : (
                <>
                  <button onClick={() => { setEditing(false); setName(profile.name); setEmail(profile.email); }} style={{
                    padding: '10px 20px', borderRadius: 'var(--radius-md)',
                    background: 'transparent', color: 'var(--text-secondary)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-family)',
                    transition: 'var(--transition)',
                  }}>
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{
                    padding: '10px 28px', borderRadius: 'var(--radius-md)',
                    background: saved ? 'var(--success)' : 'var(--primary-hex)',
                    color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer',
                    fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-family)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'var(--transition)',
                    minWidth: 140,
                    justifyContent: 'center',
                  }}>
                    {saving ? <><Loader2 size={16} className="spin-icon" /> Saving...</>
                     : saved ? <><Check size={16} /> Saved!</>
                     : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
            </motion.div>
          </motion.div>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .spin-icon {
              animation: spin 1s linear infinite;
            }
            @keyframes electricityBorder {
              0% { border-color: var(--accent-hex); box-shadow: 0 0 4px rgba(84,119,146,0.3); }
              25% { border-color: var(--success); box-shadow: 0 0 12px rgba(16,185,129,0.4); }
              50% { border-color: var(--accent-hex); box-shadow: 0 0 6px rgba(84,119,146,0.5); }
              75% { border-color: hsl(206 28% 55%); box-shadow: 0 0 14px rgba(84,119,146,0.4); }
              100% { border-color: var(--accent-hex); box-shadow: 0 0 4px rgba(84,119,146,0.3); }
            }
            .electricity-input {
              animation: electricityBorder 1.5s ease-in-out infinite !important;
              border: 2px solid var(--accent-hex) !important;
            }
            @keyframes syncPulse {
              0%, 100% { opacity: 0.4; transform: scale(0.8); }
              50% { opacity: 1; transform: scale(1.2); }
            }
            .syncing-dot {
              width: 6px; height: 6px; border-radius: 50%;
              background: var(--accent-hex);
              display: inline-block;
              animation: syncPulse 1s ease-in-out infinite;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileDrawer;
