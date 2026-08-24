import { INITIAL_APPOINTMENTS, SERVICES, CLINIC_INFO } from '../data/clinicData';

const STORAGE_KEY = 'smilecare_appointments_v1';
const FAQS_STORAGE_KEY = 'smilecare_faqs_v1';

export function getAppointments() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APPOINTMENTS));
    return INITIAL_APPOINTMENTS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_APPOINTMENTS;
  }
}

export function saveAppointments(appointments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

export function findAppointmentsByPhoneOrId(identifier) {
  const appointments = getAppointments();
  const cleanId = identifier.trim().toLowerCase();
  
  return appointments.filter(app => {
    const phoneMatch = app.patientPhone.replace(/\D/g, '').includes(cleanId.replace(/\D/g, ''));
    const idMatch = app.id.toLowerCase() === cleanId;
    const nameMatch = app.patientName.toLowerCase().includes(cleanId);
    return (phoneMatch || idMatch || nameMatch) && app.status !== 'Cancelled';
  });
}

export function createAppointment({ patientName, patientPhone, serviceId, doctorId, date, timeSlot, notes = '' }) {
  const appointments = getAppointments();
  const service = SERVICES.find(s => s.id === serviceId) || SERVICES[0];
  const doctor = CLINIC_INFO.doctors.find(d => d.id === doctorId) || CLINIC_INFO.doctors[0];
  
  const newApp = {
    id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
    patientName,
    patientPhone,
    serviceId: service.id,
    serviceName: service.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    date,
    timeSlot,
    status: 'Confirmed',
    createdAt: new Date().toISOString(),
    notes
  };

  appointments.unshift(newApp);
  saveAppointments(appointments);
  return newApp;
}

export function rescheduleAppointment(appointmentId, newDate, newTimeSlot) {
  const appointments = getAppointments();
  const index = appointments.findIndex(a => a.id === appointmentId);
  if (index === -1) return null;

  appointments[index] = {
    ...appointments[index],
    date: newDate,
    timeSlot: newTimeSlot,
    status: 'Rescheduled',
    updatedAt: new Date().toISOString()
  };

  saveAppointments(appointments);
  return appointments[index];
}

export function cancelAppointment(appointmentId, reason = 'Patient requested cancellation') {
  const appointments = getAppointments();
  const index = appointments.findIndex(a => a.id === appointmentId);
  if (index === -1) return null;

  appointments[index] = {
    ...appointments[index],
    status: 'Cancelled',
    cancelReason: reason,
    cancelledAt: new Date().toISOString()
  };

  saveAppointments(appointments);
  return appointments[index];
}

export function getAvailableSlots(date, doctorId = 'doc-1') {
  const allSlots = [
    '09:00 AM', '09:45 AM', '10:30 AM', '11:15 AM',
    '02:00 PM', '02:45 PM', '03:30 PM', '04:15 PM', '05:00 PM'
  ];

  const appointments = getAppointments();
  const booked = appointments
    .filter(a => a.date === date && a.doctorId === doctorId && a.status !== 'Cancelled')
    .map(a => a.timeSlot);

  return allSlots.map(slot => ({
    time: slot,
    available: !booked.includes(slot)
  }));
}

export function resetToDefaults() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APPOINTMENTS));
}
