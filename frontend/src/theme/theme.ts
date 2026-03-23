import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0d9488',
      light: '#14b8a6',
    },
    secondary: {
      main: '#3b82f6',
    },
    success: {
      main: '#10b981',
    },
    error: {
      main: '#ef4444',
    },
    grey: {
      500: '#6b7280',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    background: {
      default: '#f0fdfa',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "'Manrope', 'Cairo', sans-serif",
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--radius-md)',
          padding: '10px 24px',
          fontWeight: 600,
          transition: 'var(--transition)',
          boxShadow: 'var(--shadow-sm)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--shadow-lg)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          transition: 'var(--transition)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 'var(--shadow-lg)',
          },
        },
      },
    },
  },
});

export default theme;