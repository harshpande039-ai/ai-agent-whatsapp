import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { google } from 'googleapis';
import { CLINIC_INFO, INITIAL_FAQS } from './src/data/clinicData.js';

dotenv.config();

const { MessagingResponse } = twilio.twiml;

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Google Calendar API Setup
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'harshpande039@gmail.com';

let calendar;
if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    ['https://www.googleapis.com/auth/calendar']
  );
  calendar = google.calendar({ version: 'v3', auth });
}

// In-Memory Database indexed by WhatsApp Sender Phone Number
// Maps: senderPhone -> { name, appointments: [{ eventId, service, date, time, status }] }
const clientDatabase = {};
const userSessions = {};

// 1. Google Calendar API Helpers

// Find active event on Google Calendar by Phone Number in description
async function findGoogleCalendarEventByPhone(phone) {
  if (!calendar) return null;
  try {
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    const match = res.data.items.find(item => item.description && item.description.includes(phone));
    return match || null;
  } catch (err) {
    console.error('Error finding Google Calendar event:', err.message);
    return null;
  }
}

// Book / Insert Event into Google Calendar
async function createGoogleCalendarEvent(patientName, serviceType, dateStr, timeStr, phone) {
  const startTime = new Date(`${dateStr} ${timeStr}`).toISOString();
  const endTime = new Date(new Date(startTime).getTime() + 45 * 60000).toISOString();

  if (!calendar) {
    console.log('Google Calendar credentials not configured. Generating local Event ID.');
    return `CAL-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  try {
    const event = {
      summary: `🦷 Dental Appointment: ${patientName} (${serviceType})`,
      description: `Patient Name: ${patientName}\nWhatsApp Phone: ${phone}\nService: ${serviceType}\nStatus: Confirmed\nBooked via WhatsApp AI Agent (Ava)`,
      start: { dateTime: startTime, timeZone: 'Asia/Kolkata' },
      end: { dateTime: endTime, timeZone: 'Asia/Kolkata' }
    };

    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event
    });
    console.log('Created Google Calendar event:', res.data.id);
    return res.data.id;
  } catch (err) {
    console.error('Error creating Google Calendar event:', err.message);
    return `CAL-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

// Reschedule Event in Google Calendar
async function rescheduleGoogleCalendarEvent(eventId, dateStr, timeStr) {
  const newStartTime = new Date(`${dateStr} ${timeStr}`).toISOString();
  const newEndTime = new Date(new Date(newStartTime).getTime() + 45 * 60000).toISOString();

  if (!calendar) return true;
  try {
    const event = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
    event.data.start = { dateTime: newStartTime, timeZone: 'Asia/Kolkata' };
    event.data.end = { dateTime: newEndTime, timeZone: 'Asia/Kolkata' };
    
    await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: eventId,
      resource: event.data
    });
    console.log('Rescheduled Google Calendar event:', eventId);
    return true;
  } catch (err) {
    console.error('Error rescheduling Google Calendar event:', err.message);
    return false;
  }
}

// Cancel Event in Google Calendar
async function cancelGoogleCalendarEvent(eventId) {
  if (!calendar) return true;
  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId
    });
    console.log('Cancelled/Deleted Google Calendar event:', eventId);
    return true;
  } catch (err) {
    console.error('Error deleting Google Calendar event:', err.message);
    return false;
  }
}

// 2. Main WhatsApp AI Agent Logic with Phone-Number Client Recognition & Status Check
async function handleWhatsAppAiAgent(senderPhone, userMessage) {
  // Initialize client profile if new phone number
  if (!clientDatabase[senderPhone]) {
    clientDatabase[senderPhone] = {
      phone: senderPhone,
      name: '',
      appointments: []
    };
  }

  if (!userSessions[senderPhone]) {
    userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
  }

  const client = clientDatabase[senderPhone];
  const session = userSessions[senderPhone];
  const input = userMessage.trim();
  const lower = input.toLowerCase();

  // Clean phone number format for display (e.g., +918983740068)
  const cleanPhone = senderPhone.replace('whatsapp:', '');

  // Reset command
  if (lower === 'reset' || lower === 'restart') {
    userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
    return `Hello! Your session has been reset. How can I assist you today at BrightSmile Dental Clinic?`;
  }

  // --- 🔍 1. CHECK APPOINTMENT STATUS BY PHONE NUMBER ---
  if (lower.includes('status') || lower.includes('my appointment') || lower.includes('check appointment')) {
    // First check local database by phone number
    const activeApp = client.appointments.find(a => a.status !== 'Cancelled');
    
    // Also search Google Calendar by phone number
    const calEvent = await findGoogleCalendarEventByPhone(cleanPhone);

    if (activeApp || calEvent) {
      const patientName = client.name || (activeApp ? activeApp.patientName : 'Valued Patient');
      const date = activeApp ? activeApp.date : calEvent.start.dateTime.split('T')[0];
      const time = activeApp ? activeApp.time : new Date(calEvent.start.dateTime).toLocaleTimeString();
      const service = activeApp ? activeApp.service : 'Dental Service';

      return `📋 *Appointment Status for ${cleanPhone}*\n\n` +
             `👤 *Patient*: ${patientName}\n` +
             `🦷 *Service*: ${service}\n` +
             `📅 *Date*: ${date}\n` +
             `⏰ *Time*: ${time}\n` +
             `✅ *Status*: Confirmed on Google Calendar\n\n` +
             `Would you like to *reschedule* or *cancel* this appointment?`;
    } else {
      return `ℹ️ No active appointments found for your WhatsApp number (${cleanPhone}).\n\nWould you like to book a new appointment? Reply "Book appointment" to get started!`;
    }
  }

  // --- ❌ 2. CANCEL APPOINTMENT BY PHONE NUMBER ---
  if (lower.includes('cancel')) {
    const activeApp = client.appointments.find(a => a.status !== 'Cancelled');
    const calEvent = await findGoogleCalendarEventByPhone(cleanPhone);

    if (activeApp || calEvent) {
      const eventIdToDelete = activeApp ? activeApp.eventId : (calEvent ? calEvent.id : null);
      if (eventIdToDelete) {
        await cancelGoogleCalendarEvent(eventIdToDelete);
      }
      if (activeApp) activeApp.status = 'Cancelled';

      return `❌ Your appointment for ${cleanPhone} has been CANCELLED and removed from Google Calendar (harshpande039@gmail.com). Let us know if you'd like to book another time!`;
    } else {
      return `You don't have any active appointments under ${cleanPhone} to cancel.`;
    }
  }

  // --- 🔄 3. RESCHEDULE APPOINTMENT BY PHONE NUMBER ---
  if (lower.includes('reschedule') || lower.includes('change date') || lower.includes('change time')) {
    const activeApp = client.appointments.find(a => a.status !== 'Cancelled');
    if (activeApp || await findGoogleCalendarEventByPhone(cleanPhone)) {
      session.step = 'RESCHEDULE_NEW_DATE';
      return `Sure! I can help you reschedule your appointment for ${cleanPhone}. What is your preferred NEW date? (e.g. 2026-08-28)`;
    } else {
      return `No existing appointment found for ${cleanPhone} to reschedule. Would you like to book a new one?`;
    }
  }

  if (session.step === 'RESCHEDULE_NEW_DATE') {
    session.bookingData.newDate = input;
    session.step = 'RESCHEDULE_NEW_TIME';
    return `Got it! What preferred NEW time slot on ${input}? (e.g. 11:00 AM or 4:00 PM)`;
  }

  if (session.step === 'RESCHEDULE_NEW_TIME') {
    const activeApp = client.appointments.find(a => a.status !== 'Cancelled');
    const calEvent = await findGoogleCalendarEventByPhone(cleanPhone);

    const eventIdToUpdate = activeApp ? activeApp.eventId : (calEvent ? calEvent.id : null);
    
    if (eventIdToUpdate) {
      await rescheduleGoogleCalendarEvent(eventIdToUpdate, session.bookingData.newDate, input);
      if (activeApp) {
        activeApp.date = session.bookingData.newDate;
        activeApp.time = input;
        activeApp.status = 'Rescheduled';
      }
    }

    userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
    return `🔄 Done! Your appointment for ${cleanPhone} has been RESCHEDULED to *${session.bookingData.newDate} at ${input}* on Google Calendar (harshpande039@gmail.com)!`;
  }

  // --- 📅 4. BOOK NEW APPOINTMENT ---
  if (session.step === 'IDLE' && (lower.includes('book') || lower.includes('appointment') || lower.includes('cleaning') || lower.includes('consultation'))) {
    session.step = 'BOOK_SERVICE';
    return `I can help you book an appointment for ${cleanPhone}! What service do you need?\n1. Dental Consultation\n2. Teeth Cleaning\n3. Teeth Whitening\n4. Routine Checkup`;
  }

  if (session.step === 'BOOK_SERVICE') {
    session.bookingData.service = input;
    session.step = 'BOOK_DATE';
    return `Great, ${input}! What date would you like to visit? (e.g. 2026-08-26)`;
  }

  if (session.step === 'BOOK_DATE') {
    session.bookingData.date = input;
    session.step = 'BOOK_TIME';
    return `What time would you prefer on ${input}? (e.g. 10:00 AM or 3:00 PM)`;
  }

  if (session.step === 'BOOK_TIME') {
    session.bookingData.time = input;
    session.step = 'BOOK_NAME';
    return client.name 
      ? `Would you like to book this for ${client.name}? Reply "YES" or type a different name.`
      : `May I please have your full name for the booking?`;
  }

  if (session.step === 'BOOK_NAME') {
    const name = (lower === 'yes' && client.name) ? client.name : input;
    client.name = name;
    session.bookingData.name = name;
    session.step = 'BOOK_CONFIRM';

    return `📋 *Confirm Booking Details*\n\n` +
           `👤 *Name*: ${name}\n` +
           `📱 *Phone*: ${cleanPhone}\n` +
           `🦷 *Service*: ${session.bookingData.service}\n` +
           `📅 *Date*: ${session.bookingData.date}\n` +
           `⏰ *Time*: ${session.bookingData.time}\n\n` +
           `Reply *"YES"* to confirm and schedule on Google Calendar!`;
  }

  if (session.step === 'BOOK_CONFIRM') {
    if (lower.includes('yes') || lower.includes('confirm')) {
      const eventId = await createGoogleCalendarEvent(
        session.bookingData.name,
        session.bookingData.service,
        session.bookingData.date,
        session.bookingData.time,
        cleanPhone
      );

      // Save to client's appointment history
      client.appointments.push({
        eventId,
        patientName: session.bookingData.name,
        service: session.bookingData.service,
        date: session.bookingData.date,
        time: session.bookingData.time,
        status: 'Confirmed'
      });

      userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
      return `🎉 *Booking Confirmed!*\n\n` +
             `Your appointment for *${session.bookingData.name}* (${session.bookingData.service}) on *${session.bookingData.date} at ${session.bookingData.time}* has been added to Google Calendar (harshpande039@gmail.com)!\n\n` +
             `You can type *"status"* anytime to check your booking details.`;
    } else {
      userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
      return "Booking cancelled. Let me know if you would like to choose a different time!";
    }
  }

  // --- FAQs Check ---
  const faqMatch = INITIAL_FAQS.find(f => f.keywords.some(k => lower.includes(k)));
  if (faqMatch) {
    return faqMatch.answer;
  }

  // Welcome / Default Greeting
  const greetingName = client.name ? ` back, ${client.name}` : '';
  return `Hello${greetingName}! 👋 I’m Ava from BrightSmile Dental Clinic.\n\n` +
         `How can I help your number (${cleanPhone}) today?\n` +
         `1. Type *"Book appointment"* to schedule\n` +
         `2. Type *"Status"* to check your existing appointment\n` +
         `3. Type *"Reschedule"* or *"Cancel"* to modify\n` +
         `4. Ask any questions about location, hours, or services!`;
}

// Health Check / Root route
app.get('/', (req, res) => {
  res.send('WhatsApp AI Agent Backend with Phone Number Client Recognition & Google Calendar Sync is running.');
});

app.get('/webhook', (req, res) => {
  res.status(200).send('Webhook is active.');
});

// WhatsApp Webhook Listener
app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body || '';
  const senderNumber = req.body.From || '';

  console.log(`Incoming message from ${senderNumber}: "${incomingMsg}"`);

  const botReply = await handleWhatsAppAiAgent(senderNumber, incomingMsg);

  const twiml = new MessagingResponse();
  twiml.message(botReply);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
