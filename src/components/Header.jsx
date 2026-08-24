import React from 'react';
import { MessageSquare, LayoutDashboard, Code, ShieldCheck, Sparkles } from 'lucide-react';
import { CLINIC_INFO } from '../data/clinicData';

export function Header({ currentTab, setCurrentTab }) {
  return (
    <header className="main-header font-sans">
      <div className="header-brand">
        <div className="brand-logo">
          <span className="tooth-icon">🦷</span>
        </div>
        <div className="brand-titles">
          <div className="brand-name">
            {CLINIC_INFO.name}
            <span className="brand-tag">WhatsApp AI Receptionist</span>
          </div>
          <div className="brand-sub font-mono">{CLINIC_INFO.phone} • San Francisco, CA</div>
        </div>
      </div>

      <nav className="header-nav font-sans">
        <button
          className={`nav-link ${currentTab === 'chat' ? 'active' : ''}`}
          onClick={() => setCurrentTab('chat')}
        >
          <MessageSquare className="icon-sm" />
          <span>WhatsApp Simulator</span>
        </button>

        <button
          className={`nav-link ${currentTab === 'admin' ? 'active' : ''}`}
          onClick={() => setCurrentTab('admin')}
        >
          <LayoutDashboard className="icon-sm" />
          <span>Clinic Operations</span>
        </button>

        <button
          className={`nav-link ${currentTab === 'code' ? 'active' : ''}`}
          onClick={() => setCurrentTab('code')}
        >
          <Code className="icon-sm" />
          <span>Deployment Code</span>
        </button>
      </nav>
    </header>
  );
}
