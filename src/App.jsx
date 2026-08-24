import React, { useState } from 'react';
import { Header } from './components/Header';
import { WhatsAppChat } from './components/WhatsAppChat';
import { AdminDashboard } from './components/AdminDashboard';
import { CodeExporter } from './components/CodeExporter';
import './index.css';

export default function App() {
  const [currentTab, setCurrentTab] = useState('chat');
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const handleAppointmentUpdated = () => {
    setLastUpdated(Date.now());
  };

  return (
    <div className="app-layout font-sans">
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="main-content">
        {currentTab === 'chat' && (
          <WhatsAppChat onAppointmentUpdated={handleAppointmentUpdated} />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard lastUpdated={lastUpdated} />
        )}

        {currentTab === 'code' && (
          <CodeExporter />
        )}
      </main>

      <footer className="main-footer font-sans">
        <p>
          SmileCare Dental AI Receptionist • Powered by Modern Conversational AI • Built with React, Express & Meta WhatsApp Cloud API
        </p>
      </footer>
    </div>
  );
}
