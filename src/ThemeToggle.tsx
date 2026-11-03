import React from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  return <button className="theme-toggle" type="button" data-theme-toggle="">
    <span className="theme-light"><Sun aria-hidden="true" /><span className="sr-only">Switch to light mode</span></span>
    <span className="theme-dark"><Moon aria-hidden="true" /><span className="sr-only">Switch to dark mode</span></span>
  </button>;
}
