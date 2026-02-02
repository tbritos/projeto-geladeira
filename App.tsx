import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AlertsProvider } from './context/AlertsContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import { useThemeApplier } from './hooks/useThemeApplier';

const AppContent: React.FC = () => {
  useThemeApplier();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/welcome" element={<Welcome />} />
        
        {/* Protected Routes Wrapper */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/reports" element={<HistoryPage />} /> {/* Reuse History for demo */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AlertsProvider>
        <AppContent />
      </AlertsProvider>
    </AppProvider>
  );
};

export default App;
