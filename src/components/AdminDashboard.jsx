import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Stethoscope,
  FileText
} from 'lucide-react';
import { getAppointments, cancelAppointment, rescheduleAppointment } from '../services/appointmentStore';
import { CLINIC_INFO, INITIAL_FAQS } from '../data/clinicData';

export function AdminDashboard({ lastUpdated }) {
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('appointments');
  const [selectedApp, setSelectedApp] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('10:00 AM');

  useEffect(() => {
    loadAppointments();
  }, [lastUpdated]);

  const loadAppointments = () => {
    setAppointments(getAppointments());
  };

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch =
      app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.patientPhone.includes(searchTerm) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.serviceName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === 'Confirmed').length,
    rescheduled: appointments.filter(a => a.status === 'Rescheduled').length,
    cancelled: appointments.filter(a => a.status === 'Cancelled').length
  };

  const handleCancelClick = (id) => {
    if (window.confirm(`Are you sure you want to cancel appointment ${id}?`)) {
      cancelAppointment(id, 'Cancelled by Admin');
      loadAppointments();
    }
  };

  const handleOpenReschedule = (app) => {
    setSelectedApp(app);
    setNewDate(app.date);
    setNewSlot(app.timeSlot);
    setRescheduleModal(true);
  };

  const handleSaveReschedule = () => {
    if (selectedApp && newDate && newSlot) {
      rescheduleAppointment(selectedApp.id, newDate, newSlot);
      setRescheduleModal(false);
      loadAppointments();
    }
  };

  return (
    <div className="admin-dashboard-container font-sans">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">{CLINIC_INFO.name} Operations</h1>
          <p className="admin-subtitle">Live WhatsApp AI Assistant ("Ava") & Appointment Manager • IST Timezone</p>
        </div>
        <div className="admin-status-badge">
          <span className="pulse-dot"></span>
          Ava AI Agent: Active & Listening
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card teal">
          <div className="kpi-icon-box">
            <Calendar className="icon-md" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Total Appointments</span>
            <span className="kpi-value">{stats.total}</span>
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon-box">
            <CheckCircle className="icon-md" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Confirmed (IST)</span>
            <span className="kpi-value">{stats.confirmed}</span>
          </div>
        </div>

        <div className="kpi-card blue">
          <div className="kpi-icon-box">
            <RefreshCw className="icon-md" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Rescheduled</span>
            <span className="kpi-value">{stats.rescheduled}</span>
          </div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-icon-box">
            <XCircle className="icon-md" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Cancelled</span>
            <span className="kpi-value">{stats.cancelled}</span>
          </div>
        </div>
      </div>

      <div className="admin-nav-tabs">
        <button
          className={`admin-nav-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          <Calendar className="icon-sm" /> Appointments ({appointments.length})
        </button>
        <button
          className={`admin-nav-btn ${activeTab === 'doctors' ? 'active' : ''}`}
          onClick={() => setActiveTab('doctors')}
        >
          <Stethoscope className="icon-sm" /> Medical Team
        </button>
        <button
          className={`admin-nav-btn ${activeTab === 'faqs' ? 'active' : ''}`}
          onClick={() => setActiveTab('faqs')}
        >
          <FileText className="icon-sm" /> Authoritative Business Info
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div className="admin-content-section">
          <div className="table-controls-bar">
            <div className="search-box">
              <Search className="icon-sm search-icon" />
              <input
                type="text"
                placeholder="Search by Patient, Phone, Ref Code, or Service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-box">
              <Filter className="icon-sm" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="table-responsive font-sans">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Patient Details</th>
                  <th>Appointment Type</th>
                  <th>Scheduled Date & Time (IST)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      No appointments matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <span className="app-ref-code">{app.id}</span>
                      </td>
                      <td>
                        <div className="patient-name">{app.patientName}</div>
                        <div className="patient-phone">{app.patientPhone}</div>
                      </td>
                      <td>
                        <div className="service-tag">{app.serviceName}</div>
                      </td>
                      <td>
                        <div className="datetime-cell">
                          <span><Calendar className="icon-xs" /> {app.date}</span>
                          <span className="time-badge"><Clock className="icon-xs" /> {app.timeSlot}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${app.status.toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          {app.status !== 'Cancelled' && (
                            <>
                              <button
                                className="table-btn reschedule-btn"
                                onClick={() => handleOpenReschedule(app)}
                              >
                                <RefreshCw className="icon-xs" /> Move
                              </button>
                              <button
                                className="table-btn cancel-btn"
                                onClick={() => handleCancelClick(app.id)}
                              >
                                <XCircle className="icon-xs" /> Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="admin-content-section">
          <h3 className="section-title">BrightSmile Medical Staff</h3>
          <div className="doctors-grid">
            {CLINIC_INFO.doctors.map((doc) => (
              <div key={doc.id} className="doc-card">
                <img src={doc.avatar} alt={doc.name} className="doc-avatar" />
                <div className="doc-info">
                  <h4>{doc.name}</h4>
                  <p className="doc-spec">{doc.specialty}</p>
                  <p className="doc-exp">Experience: {doc.experience}</p>
                  <div className="doc-hours">
                    <Clock className="icon-xs" /> 09:00 AM - 07:00 PM IST (Mon - Sat)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'faqs' && (
        <div className="admin-content-section">
          <h3 className="section-title">Authoritative General Business Information</h3>
          <div className="faqs-list">
            {INITIAL_FAQS.map((faq, idx) => (
              <div key={idx} className="faq-card">
                <div className="faq-question">❓ {faq.question}</div>
                <div className="faq-answer">💬 {faq.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rescheduleModal && selectedApp && (
        <div className="modal-overlay font-sans">
          <div className="modal-content">
            <h3>Reschedule Appointment #{selectedApp.id}</h3>
            <p>Patient: <strong>{selectedApp.patientName}</strong> ({selectedApp.serviceName})</p>

            <div className="modal-field">
              <label>Select New Date:</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>

            <div className="modal-field">
              <label>Select Time Slot (IST):</label>
              <select value={newSlot} onChange={(e) => setNewSlot(e.target.value)}>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="05:30 PM">05:30 PM</option>
                <option value="06:30 PM">06:30 PM</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setRescheduleModal(false)}>Close</button>
              <button className="modal-btn confirm" onClick={handleSaveReschedule}>Save New Slot</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
