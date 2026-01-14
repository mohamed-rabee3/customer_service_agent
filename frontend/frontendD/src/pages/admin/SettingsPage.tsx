// src/pages/admin/SettingsPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Card,
  CardContent,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 

const SettingsPage: React.FC = () => {
  // States 
  const [companyName, setCompanyName] = useState('Customer Service Platform');
  const [supportEmail, setSupportEmail] = useState('support@company.com');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState('ar');

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [inAppNotif, setInAppNotif] = useState(true);

  const [twoFactor, setTwoFactor] = useState(false);

  const [maxActiveConversations, setMaxActiveConversations] = useState(5);
  const [autoAssign, setAutoAssign] = useState(true);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      // هنا الـ API call الحقيقي (مثال)
      // await api.put('/settings', { companyName, supportEmail, ... });
      await new Promise(resolve => setTimeout(resolve, 1200)); // simulate delay

      // نجاح → Toast أخضر
      toast.success('Settings saved successfully!', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      // خطأ → Toast أحمر
      toast.error('Failed to save settings. Please try again.', {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, direction: 'ltr', bgcolor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Headline  */}
      <Typography
        variant="h4"
        fontWeight={900}
        color="var(--text-main)"
        sx={{ mb: 6 }}
      >
        Settings
      </Typography>

      {/* Main Content  */}
      <Grid container spacing={4}>
        {/* General Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>General Settings</Typography>
              <Divider sx={{ mb: 3 }} />
              <TextField fullWidth label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} sx={{ mb: 3 }} />
              <TextField fullWidth label="Support Email" type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} sx={{ mb: 3 }} />
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Default Language</InputLabel>
                <Select value={language} label="Default Language" onChange={e => setLanguage(e.target.value)}>
                  <MenuItem value="ar">Arabic</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
              {/* Logo Upload */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Platform Logo</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={logoPreview || undefined} sx={{ width: 80, height: 80, bgcolor: 'var(--primary)' }}>
                    {!logoPreview && 'Logo'}
                  </Avatar>
                  <label htmlFor="logo-upload">
                    <Button variant="outlined" component="span" startIcon={<PhotoCamera />}>
                      Upload Logo
                    </Button>
                    <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  </label>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Notification Preferences</Typography>
              <Divider sx={{ mb: 3 }} />
              <FormControlLabel control={<Switch checked={emailNotif} onChange={e => setEmailNotif(e.target.checked)} />} label="Email Notifications" sx={{ display: 'block', mb: 2 }} />
              <FormControlLabel control={<Switch checked={pushNotif} onChange={e => setPushNotif(e.target.checked)} />} label="Push Notifications" sx={{ display: 'block', mb: 2 }} />
              <FormControlLabel control={<Switch checked={inAppNotif} onChange={e => setInAppNotif(e.target.checked)} />} label="In-app Notifications" sx={{ display: 'block' }} />
            </CardContent>
          </Card>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Security</Typography>
              <Divider sx={{ mb: 3 }} />
              <FormControlLabel control={<Switch checked={twoFactor} onChange={e => setTwoFactor(e.target.checked)} />} label="Enable Two-Factor Authentication" sx={{ display: 'block', mb: 2 }} />
              <Button variant="outlined" color="primary" sx={{ mt: 2 }}>Change Password</Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Agent Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Agent Settings</Typography>
              <Divider sx={{ mb: 3 }} />
              <TextField fullWidth label="Max Active Conversations per Agent" type="number" value={maxActiveConversations} onChange={e => setMaxActiveConversations(Number(e.target.value))} sx={{ mb: 3 }} inputProps={{ min: 1 }} />
              <FormControlLabel control={<Switch checked={autoAssign} onChange={e => setAutoAssign(e.target.checked)} />} label="Auto-assign Conversations" sx={{ display: 'block' }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 6, textAlign: 'right' }}>
        <Button variant="contained" color="primary" size="large" onClick={handleSave}>
          Save Changes
        </Button>
      </Box>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </Box>
  );
};

export default SettingsPage;