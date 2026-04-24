// src/pages/admin/SettingsPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  Button,
  Avatar,
  Slider,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Bell, Shield, Bot, Key, Check, Loader2 } from 'lucide-react';
import { InputAdornment } from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type SettingsTab = 'general' | 'notifications' | 'security' | 'ai' | 'api';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  { id: 'ai', label: 'AI Configuration', icon: <Bot size={18} /> },
  { id: 'api', label: 'API Keys', icon: <Key size={18} /> },
];

// ─── Toggle Row ──────────────────────────────────
const ToggleRow: React.FC<{ label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, desc, checked, onChange }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    py: 2, px: 1.5, borderBottom: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.2s ease',
    '&:hover': { background: 'rgba(84,119,146,0.04)' },
    '&:last-child': { borderBottom: 'none' },
  }}>
    <Box>
      <Typography variant="body1" fontWeight={600} color="var(--text-main)" sx={{ fontSize: 14 }}>{label}</Typography>
      <Typography variant="body2" color="var(--text-secondary)" sx={{ fontSize: 13, mt: 0.3 }}>{desc}</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" sx={{
        fontSize: 11, fontWeight: 600,
        color: checked ? 'var(--success)' : 'var(--text-muted)',
        transition: 'color 0.3s ease',
      }}>
        {checked ? 'On' : 'Off'}
      </Typography>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} sx={{
        '& .MuiSwitch-switchBase': { transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' },
        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--success)' },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--success)' },
      }} />
    </Box>
  </Box>
);

// ─── Slider Row ──────────────────────────────────
const SliderRow: React.FC<{ label: string; desc: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string }> = ({ label, desc, value, onChange, min, max, step = 1, unit = '' }) => (
  <Box sx={{ py: 2, px: 1.5, borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s ease', '&:hover': { background: 'rgba(84,119,146,0.04)' }, '&:last-child': { borderBottom: 'none' } }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Box>
        <Typography variant="body1" fontWeight={600} color="var(--text-main)" sx={{ fontSize: 14 }}>{label}</Typography>
        <Typography variant="body2" color="var(--text-secondary)" sx={{ fontSize: 13, mt: 0.3 }}>{desc}</Typography>
      </Box>
      <motion.div key={value} initial={{ scale: 1.2, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
        <Typography variant="body1" fontWeight={700} color="var(--accent-hex)" sx={{ fontSize: 15, minWidth: 50, textAlign: 'right' }}>
          {value}{unit}
        </Typography>
      </motion.div>
    </Box>
    <Slider
      value={value} onChange={(_, v) => onChange(v as number)}
      min={min} max={max} step={step}
      sx={{
        color: 'var(--accent-hex)',
        height: 6,
        '& .MuiSlider-thumb': { width: 18, height: 18, boxShadow: '0 2px 8px rgba(33,52,72,0.2)', transition: 'box-shadow 0.2s ease', '&:hover': { boxShadow: '0 0 0 6px rgba(84,119,146,0.15)' } },
        '& .MuiSlider-track': { border: 'none' },
        '& .MuiSlider-rail': { opacity: 0.15 },
      }}
    />
  </Box>
);

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);

  // General
  const [companyName, setCompanyName] = useState('Customer Service Platform');
  const [supportEmail, setSupportEmail] = useState('support@company.com');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState('en');

  // Notifications
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [inAppNotif, setInAppNotif] = useState(true);

  // Security
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  // Change Password modal
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const pwT = (en: string, ar: string) => language === 'ar' ? ar : en;

  const pwChecks = {
    minLength: newPw.length >= 8,
    hasUpper: /[A-Z]/.test(newPw),
    hasLower: /[a-z]/.test(newPw),
    hasNumber: /[0-9]/.test(newPw),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(newPw),
  };
  const pwStrengthCount = Object.values(pwChecks).filter(Boolean).length;
  const pwIsStrong = pwStrengthCount === 5;
  const pwMatch = newPw === confirmPw && confirmPw.length > 0;
  const pwStrengthLabel = newPw.length === 0 ? '' : pwIsStrong ? pwT('Strong password', 'كلمة مرور قوية') : pwStrengthCount >= 3 ? pwT('Medium password', 'كلمة مرور متوسطة') : pwT('Weak password', 'كلمة مرور ضعيفة');
  const pwStrengthColor = pwIsStrong ? '#22c55e' : pwStrengthCount >= 3 ? '#f59e0b' : '#ef4444';
  const canSubmitPw = pwIsStrong && pwMatch && currentPw.length > 0;

  const handlePwSubmit = async () => {
    if (!pwMatch) {
      setPwError(pwT('New password and confirmation do not match.', 'كلمة المرور الجديدة والتأكيد غير متطابقين.'));
      return;
    }
    if (!pwIsStrong) {
      setPwError(pwT('Password does not meet all strength requirements.', 'كلمة المرور لا تستوفي جميع متطلبات القوة.'));
      return;
    }
    setPwError('');
    setPwSaving(true);
    try {
      // TODO: Replace with real API call when backend is available
      // const { default: api } = await import('../../services/api');
      // await api.patch('/user/password', { current_password: currentPw, new_password: newPw });
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success(pwT('Password changed successfully!', 'تم تغيير كلمة المرور بنجاح!'), {
        position: 'top-right', autoClose: 3000, hideProgressBar: true,
        style: { borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family)', fontWeight: 600 },
      });
      closePwModal();
    } catch (err: unknown) {
      console.error('Change password error:', err?.response || err);
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message;
      if (status === 401 || status === 403) {
        setPwError(pwT('Current password is incorrect.', 'كلمة المرور الحالية غير صحيحة.'));
      } else if (status === 400 && backendMsg) {
        setPwError(backendMsg);
      } else if (status === 422) {
        setPwError(pwT('Password does not meet requirements.', 'كلمة المرور لا تستوفي المتطلبات.'));
      } else {
        setPwError(pwT('Something went wrong, please try again later.', 'حدث خطأ ما، حاول مرة أخرى لاحقًا.'));
      }
    } finally {
      setPwSaving(false);
    }
  };

  const closePwModal = () => {
    setPwModalOpen(false);
    setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError('');
    setShowCurrentPw(false); setShowNewPw(false); setShowConfirmPw(false);
  };

  const pwVisibilityAdornment = (visible: boolean, toggle: () => void, label: string) => (
    <InputAdornment position="end">
      <IconButton onClick={toggle} edge="end" size="small" aria-label={label} tabIndex={-1}>
        {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      </IconButton>
    </InputAdornment>
  );

  // AI
  const [aiBargeIn, setAiBargeIn] = useState(true);
  const [aiConfidence, setAiConfidence] = useState(75);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [maxConversations, setMaxConversations] = useState(5);
  const [autoAssign, setAutoAssign] = useState(true);

  // API
  const [apiKey, setApiKey] = useState('sk-proj-••••••••••••••••••••');
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setSaving(false);
    toast.success('Settings saved successfully!', {
      position: 'top-right', autoClose: 3000, hideProgressBar: true,
      style: { borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family)', fontWeight: 600 },
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <motion.div key="general" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <Typography variant="h6" fontWeight={700} color="var(--text-main)" sx={{ mb: 0.5 }}>General</Typography>
            <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 3 }}>Manage your organization details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Company Name</InputLabel>
                <Select
                  label="Company Name"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value as string)}
                  sx={{ borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' }}
                >
                  <MenuItem value=""><em>Select company...</em></MenuItem>
                  <MenuItem value="Customer Service Platform">Customer Service Platform</MenuItem>
                </Select>
              </FormControl>
              <TextField fullWidth label="Support Email" variant="outlined" type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' } }} />
              <Box>
                <Typography variant="body2" fontWeight={600} color="var(--text-secondary)" sx={{ mb: 1, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Default Language
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['en', 'ar'].map(lang => (
                    <Button key={lang} variant={language === lang ? 'contained' : 'outlined'} size="small"
                      onClick={() => setLanguage(lang)}
                      sx={{
                        borderRadius: 'var(--radius-pill)', px: 3, fontWeight: 600, fontSize: 13, textTransform: 'none',
                        ...(language === lang ? {
                          background: 'var(--primary-hex)', color: '#fff', border: 'none',
                          '&:hover': { background: 'var(--primary-hex)' },
                        } : {
                          borderColor: 'var(--border)', color: 'var(--text-secondary)',
                        }),
                      }}
                    >
                      {lang === 'en' ? 'English' : 'Arabic'}
                    </Button>
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600} color="var(--text-secondary)" sx={{ mb: 1.5, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Platform Logo
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={logoPreview || undefined} sx={{
                    width: 64, height: 64, bgcolor: 'var(--primary-hex)',
                    fontSize: 22, fontWeight: 700, boxShadow: '0 4px 16px rgba(33,52,72,0.15)',
                  }}>
                    {!logoPreview && 'L'}
                  </Avatar>
                  <label htmlFor="logo-upload">
                    <Button variant="outlined" component="span" size="small" sx={{
                      borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 13, textTransform: 'none',
                      borderColor: 'var(--border)', color: 'var(--text-secondary)',
                    }}>
                      Upload
                    </Button>
                    <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  </label>
                </Box>
              </Box>
            </Box>
          </motion.div>
        );
      case 'notifications':
        return (
          <motion.div key="notifications" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <Typography variant="h6" fontWeight={700} color="var(--text-main)" sx={{ mb: 0.5 }}>Notifications</Typography>
            <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 3 }}>Choose how you receive alerts</Typography>
            <ToggleRow label="Email Notifications" desc="Receive email alerts for critical events" checked={emailNotif} onChange={setEmailNotif} />
            <ToggleRow label="Push Notifications" desc="Browser push notifications for real-time updates" checked={pushNotif} onChange={setPushNotif} />
            <ToggleRow label="In-App Notifications" desc="Show notification badge and panel inside the app" checked={inAppNotif} onChange={setInAppNotif} />
          </motion.div>
        );
      case 'security':
        return (
          <motion.div key="security" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <Typography variant="h6" fontWeight={700} color="var(--text-main)" sx={{ mb: 0.5 }}>Security</Typography>
            <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 3 }}>Protect your account and data</Typography>
            <ToggleRow label="Two-Factor Authentication" desc="Add an extra layer of security to your account" checked={twoFactor} onChange={setTwoFactor} />
            <SliderRow label="Session Timeout" desc="Auto-logout after inactivity" value={sessionTimeout} onChange={setSessionTimeout} min={5} max={120} step={5} unit=" min" />
            <Box sx={{ mt: 3 }}>
              <Button variant="outlined" size="small" onClick={() => setPwModalOpen(true)} sx={{
                borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 13, textTransform: 'none',
                borderColor: 'var(--border)', color: 'var(--text-secondary)',
              }}>
                {pwT('Change Password', 'تغيير كلمة المرور')}
              </Button>
            </Box>
            {/* Change Password Dialog */}
            <Dialog open={pwModalOpen} onClose={closePwModal} maxWidth="xs" fullWidth
              PaperProps={{ sx: { borderRadius: 'var(--radius-lg)', background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))', border: '1px solid var(--glass-border)', direction: language === 'ar' ? 'rtl' : 'ltr' } }}>
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontFamily: 'var(--font-family)', color: 'var(--text-main)' }}>
                {pwT('Change Password', 'تغيير كلمة المرور')}
                <IconButton onClick={closePwModal} size="small"><X size={18} /></IconButton>
              </DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
                <TextField fullWidth type={showCurrentPw ? 'text' : 'password'} label={pwT('Current Password', 'كلمة المرور الحالية')} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  InputProps={{ endAdornment: pwVisibilityAdornment(showCurrentPw, () => setShowCurrentPw(v => !v), pwT('Toggle current password visibility', 'تبديل رؤية كلمة المرور الحالية')) }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' } }} />
                <TextField fullWidth type={showNewPw ? 'text' : 'password'} label={pwT('New Password', 'كلمة المرور الجديدة')} value={newPw} onChange={e => setNewPw(e.target.value)}
                  InputProps={{ endAdornment: pwVisibilityAdornment(showNewPw, () => setShowNewPw(v => !v), pwT('Toggle new password visibility', 'تبديل رؤية كلمة المرور الجديدة')) }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' } }} />
                {newPw.length > 0 && (
                  <Box sx={{ mt: -1.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Box key={i} sx={{ flex: 1, height: 4, borderRadius: 2, background: i <= pwStrengthCount ? pwStrengthColor : 'var(--border)', transition: 'background 0.2s' }} />
                      ))}
                    </Box>
                    <Typography variant="caption" sx={{ color: pwStrengthColor, fontWeight: 600, fontSize: 12 }}>{pwStrengthLabel}</Typography>
                    <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                      {[
                        [pwChecks.minLength, pwT('At least 8 characters', '٨ أحرف على الأقل')],
                        [pwChecks.hasUpper, pwT('One uppercase letter', 'حرف كبير واحد')],
                        [pwChecks.hasLower, pwT('One lowercase letter', 'حرف صغير واحد')],
                        [pwChecks.hasNumber, pwT('One number', 'رقم واحد')],
                        [pwChecks.hasSpecial, pwT('One special character', 'رمز خاص واحد')],
                      ].map(([met, label], idx) => (
                        <Typography key={idx} variant="caption" sx={{ fontSize: 11, color: met ? '#22c55e' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {met ? '✓' : '○'} {label as string}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
                <TextField fullWidth type={showConfirmPw ? 'text' : 'password'} label={pwT('Confirm New Password', 'تأكيد كلمة المرور الجديدة')} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  error={confirmPw.length > 0 && !pwMatch}
                  helperText={confirmPw.length > 0 && !pwMatch ? pwT('Passwords do not match', 'كلمات المرور غير متطابقة') : ''}
                  InputProps={{ endAdornment: pwVisibilityAdornment(showConfirmPw, () => setShowConfirmPw(v => !v), pwT('Toggle confirm password visibility', 'تبديل رؤية تأكيد كلمة المرور')) }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)', background: 'var(--input-bg)' } }} />
                {pwError && <Typography variant="body2" color="error" sx={{ fontSize: 13, fontWeight: 600 }}>{pwError}</Typography>}
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={closePwModal} sx={{ borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 13, textTransform: 'none', color: 'var(--text-secondary)' }}>
                  {pwT('Cancel', 'إلغاء')}
                </Button>
                <Button variant="contained" onClick={handlePwSubmit} disabled={pwSaving || !canSubmitPw}
                  sx={{ borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 13, textTransform: 'none', background: 'var(--primary-hex)', color: '#fff', '&:hover': { background: 'var(--primary-hex)' }, '&:disabled': { opacity: 0.7 } }}>
                  {pwSaving ? pwT('Saving...', 'جارٍ الحفظ...') : pwT('Change Password', 'تغيير كلمة المرور')}
                </Button>
              </DialogActions>
            </Dialog>
          </motion.div>
        );
      case 'ai':
        return (
          <motion.div key="ai" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <Typography variant="h6" fontWeight={700} color="var(--text-main)" sx={{ mb: 0.5 }}>AI Configuration</Typography>
            <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 3 }}>Fine-tune AI agent behavior</Typography>
            <ToggleRow label="Enable AI Barge-in" desc="Allow AI to interrupt and assist during live conversations" checked={aiBargeIn} onChange={setAiBargeIn} />
            <ToggleRow label="Auto-assign Conversations" desc="Automatically route new conversations to available agents" checked={autoAssign} onChange={setAutoAssign} />
            <Divider sx={{ my: 1 }} />
            <SliderRow label="AI Confidence Threshold" desc="Minimum confidence level for AI auto-responses" value={aiConfidence} onChange={setAiConfidence} min={50} max={100} unit="%" />
            <SliderRow label="Voice Speed" desc="Playback speed for AI voice responses" value={voiceSpeed} onChange={setVoiceSpeed} min={0.5} max={2.0} step={0.1} unit="x" />
            <SliderRow label="Max Active Conversations" desc="Per-agent conversation limit" value={maxConversations} onChange={setMaxConversations} min={1} max={20} />
          </motion.div>
        );
      case 'api':
        return (
          <motion.div key="api" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <Typography variant="h6" fontWeight={700} color="var(--text-main)" sx={{ mb: 0.5 }}>API Keys</Typography>
            <Typography variant="body2" color="var(--text-secondary)" sx={{ mb: 3 }}>Manage your integration keys</Typography>
            <Box sx={{
              p: 2.5, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              background: 'var(--input-bg)',
            }}>
              <Typography variant="body2" fontWeight={600} color="var(--text-secondary)" sx={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                Secret Key
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', color: 'var(--text-main)', fontSize: 14 }}>{apiKey}</Typography>
                <Button size="small" onClick={() => setRegenModalOpen(true)} sx={{ fontSize: 12, textTransform: 'none', fontWeight: 600, color: 'var(--accent-hex)', minWidth: 'auto' }}>
                  {pwT('Regenerate', 'إعادة توليد')}
                </Button>
              </Box>
            </Box>
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="var(--text-muted)" sx={{ fontSize: 13 }}>
                {pwT('Use this key to authenticate API requests. Keep it secret and rotate regularly.', 'استخدم هذا المفتاح لمصادقة طلبات API. حافظ على سريته وقم بتدويره بانتظام.')}
              </Typography>
            </Box>

            {/* Regenerate API Key Confirmation Dialog */}
            <Dialog open={regenModalOpen} onClose={() => !regenLoading && setRegenModalOpen(false)} maxWidth="xs" fullWidth
              PaperProps={{ sx: { borderRadius: 'var(--radius-lg)', background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))', border: '1px solid var(--glass-border)', direction: language === 'ar' ? 'rtl' : 'ltr' } }}>
              <DialogTitle sx={{ fontWeight: 700, fontFamily: 'var(--font-family)', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {pwT('Regenerate API Key?', 'هل تريد إعادة توليد مفتاح الـ API؟')}
                <IconButton onClick={() => setRegenModalOpen(false)} size="small" disabled={regenLoading}><X size={18} /></IconButton>
              </DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="var(--text-secondary)" sx={{ fontSize: 13, lineHeight: 1.7 }}>
                  {pwT(
                    'This will immediately invalidate the current API key and generate a new one. Any applications or integrations using the old key will stop working until updated with the new key. Are you sure?',
                    'سيؤدي هذا إلى إبطال المفتاح الحالي فورًا وتوليد مفتاح جديد. أي تطبيقات أو تكاملات تستخدم المفتاح القديم ستتوقف عن العمل حتى يتم تحديثها بالمفتاح الجديد. هل أنت متأكد؟'
                  )}
                </Typography>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={() => setRegenModalOpen(false)} disabled={regenLoading} sx={{ borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 13, textTransform: 'none', color: 'var(--text-secondary)' }}>
                  {pwT('Cancel', 'إلغاء')}
                </Button>
                <Button variant="contained" disabled={regenLoading} onClick={async () => {
                  setRegenLoading(true);
                  try {
                    // const { default: api } = await import('../../services/api');
                    // const res = await api.post('/user/regenerate-key');
                    const newKey = 'sk-proj-' + Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
                    setApiKey(newKey);
                    setRegenModalOpen(false);
                    toast.success(pwT('API key regenerated successfully. Copy and update it in your applications now!', 'تم إعادة توليد مفتاح الـ API بنجاح. انسخه وحدّثه في تطبيقاتك الآن!'), {
                      position: 'top-right', autoClose: 5000, hideProgressBar: true,
                      style: { borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family)', fontWeight: 600 },
                    });
                  } catch {
                    toast.error(pwT('Failed to regenerate key. Please try again.', 'فشل إعادة توليد المفتاح. حاول مرة أخرى.'), {
                      position: 'top-right', autoClose: 4000, hideProgressBar: true,
                      style: { borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family)', fontWeight: 600 },
                    });
                  } finally {
                    setRegenLoading(false);
                  }
                }} sx={{ borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 13, textTransform: 'none', background: '#ef4444', color: '#fff', '&:hover': { background: '#dc2626' }, '&:disabled': { opacity: 0.7 } }}>
                  {regenLoading ? pwT('Regenerating...', 'جارٍ التوليد...') : pwT('Confirm Regenerate', 'تأكيد إعادة التوليد')}
                </Button>
              </DialogActions>
            </Dialog>
          </motion.div>
        );
    }
  };

  return (
    <Box sx={{ direction: 'ltr', minHeight: '100vh', p: { xs: 2, md: 4 }, bgcolor: 'var(--bg)' }}>
      <Typography variant="h4" fontWeight={900} color="var(--text-main)" sx={{ mb: 1 }}>
        Settings
      </Typography>
      <Typography variant="body1" color="var(--text-secondary)" sx={{ mb: 4 }}>
        Manage your platform configuration
      </Typography>

      <Box sx={{
        display: 'flex',
        gap: { xs: 0, md: 4 },
        flexDirection: { xs: 'column', md: 'row' },
      }}>
        {/* Sidebar Navigation */}
        <Box sx={{
          width: { xs: '100%', md: 240 },
          flexShrink: 0,
          mb: { xs: 3, md: 0 },
        }}>
          <Box
          className="settings-sidebar"
          sx={{
            display: { xs: 'flex', md: 'flex' },
            flexDirection: { xs: 'row', md: 'column' },
            overflowX: { xs: 'auto', md: 'visible' },
            gap: 0.5,
            p: 1,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            border: '1px solid var(--glass-border)',
          }}>
            {tabs.map(tab => (
              <Box
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.5,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition)',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: 14,
                  fontFamily: 'var(--font-family)',
                  color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-secondary)',
                  background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                  boxShadow: activeTab === tab.id ? '0 2px 8px rgba(33,52,72,0.08)' : 'none',
                  '&:hover': {
                    background: activeTab === tab.id ? 'var(--surface)' : 'rgba(84,119,146,0.06)',
                  },
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Content Area */}
        <Box className="settings-content" sx={{
          flex: 1,
          p: { xs: 3, md: 4 },
          borderRadius: 'var(--radius-lg)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          border: '1px solid var(--glass-border)',
          minHeight: 400,
        }}>
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>

          {/* Save Button */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{
                borderRadius: 'var(--radius-md)',
                px: 4, py: 1.2,
                fontWeight: 700, fontSize: 14, textTransform: 'none',
                background: 'var(--primary-hex)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(33,52,72,0.15)',
                display: 'flex', alignItems: 'center', gap: 1,
                '&:hover': { background: 'var(--primary-hex)', boxShadow: '0 8px 24px rgba(33,52,72,0.2)' },
                '&:disabled': { opacity: 0.7 },
              }}
            >
              {saving ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              ) : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Box>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default SettingsPage;
