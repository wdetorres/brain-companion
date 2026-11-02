import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConsentPage, LoginPage } from './Auth.tsx';
import { App } from './App.tsx';
import './styles.css';

createRoot(document.getElementById('root')!).render(location.pathname === '/consent' ? <ConsentPage /> : location.pathname === '/sign-in' ? <LoginPage /> : <App />);
