import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#213448',
      light: '#547792',
      dark: '#0f1a24',
    },
    secondary: {
      main: '#547792',
    },
    success: {
      main: '#10b981',
    },
    error: {
      main: '#ef4444',
    },
    grey: {
      500: '#547792',
    },
    text: {
      primary: '#213448',
      secondary: '#547792',
    },
    background: {
      default: '#ffffff',
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