import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';

function AppShell({ children }) {
  const location = useLocation();
  const routeClass = `app-route-${(location.pathname || '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-') || 'dashboard'}`;

  return (
    <div className={`dashboard ${routeClass}`}>
      <Sidebar />
      {children}
    </div>
  );
}

export default AppShell;
