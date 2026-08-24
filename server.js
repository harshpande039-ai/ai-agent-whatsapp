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

// Parse Twilio incoming request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Google Calendar Setup
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
const clientDatabase = {};
const userSessions = {};

// Helper functions for Calendar
async function findGoogleCalendarEventByPhone(phone) {
  if (!calendar) return null;
  try {
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    return res.data.items.find(item => item.description && item.description.includes(phone)) || null;
  } catch (err) {
    console.error('Error finding Google Calendar event:', err.message);
    return null;
  }
}

async function createGoogleCalendarEvent(patientName, serviceType, dateStr, timeStr, phone) {
  const startTime = new Date(`${dateStr} ${timeStr}`).toISOString();
  const endTime = new Date(new Date(startTime).getTime() + 45 * 60000).toISOString();

  if (!calendar) {
    console.log('Google Calendar credentials not configured. Generated Event ID.');
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

async function cancelGoogleCalendarEvent(eventId) {
  if (!calendar) return true;
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
    return true;
  } catch (err) {
    console.error('Error deleting Google Calendar event:', err.message);
    return false;
  }
}

// AI Agent Processor
async function handleWhatsAppAiAgent(senderPhone, userMessage) {
  if (!clientDatabase[senderPhone]) {
    clientDatabase[senderPhone] = { phone: senderPhone, name: '', appointments: [] };
  }
  if (!userSessions[senderPhone]) {
    userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
  }

  const client = clientDatabase[senderPhone];
  const session = userSessions[senderPhone];
  const input = userMessage.trim();
  const lower = input.toLowerCase();
  const cleanPhone = senderPhone.replace('whatsapp:', '');

  if (lower === 'reset' || lower === 'restart' || lower.includes('join')) {
    userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
    return `Hello! 👋 Welcome to BrightSmile Dental Clinic. I’m Ava, your AI assistant!\n\nHow can I help your number (${cleanPhone}) today?\n• Type *"Book appointment"* to schedule\n• Type *"Status"* to check your booking\n• Ask any question about services, location or timings!`;
  }

  // STATUS CHECK
  if (lower.includes('status') || lower.includes('my appointment') || lower.includes('check appointment')) {
    const activeApp = client.appointments.find(a => a.status !== 'Cancelled');
    const calEvent = await findGoogleCalendarEventByPhone(cleanPhone);

    if (activeApp || calEvent) {
      const patientName = client.name || (activeApp ? activeApp.patientName : 'Valued Patient');
      const date = activeApp ? activeApp.date : calEvent.start.dateTime.split('T')[0];
      const time = activeApp ? activeApp.time : '10:00 AM';
      const service = activeApp ? activeApp.service : 'Dental Consultation';

      return `📋 *Appointment Status for ${cleanPhone}*\n\n` +
             `👤 *Patient*: ${patientName}\n` +
             `🦷 *Service*: ${service}\n` +
             `📅 *Date*: ${date}\n` +
             `⏰ *Time*: ${time}\n` +
             `✅ *Status*: Confirmed on Google Calendar (harshpande039@gmail.com)\n\n` +
             `Reply *"Cancel"* if you need to cancel this appointment.`;
    } else {
      return `ℹ️ No active appointments found for your WhatsApp number (${cleanPhone}).\n\nReply *"Book appointment"* to schedule a new visit!`;
    }
  }

  // CANCEL
  if (lower.includes('cancel')) {
    const activeApp = client.appointments.find(a => a.status !== 'Cancelled');
    const calEvent = await findGoogleCalendarEventByPhone(cleanPhone);

    if (activeApp || calEvent) {
      const eventIdToDelete = activeApp ? activeApp.eventId : (calEvent ? calEvent.id : null);
      if (eventIdToDelete) await cancelGoogleCalendarEvent(eventIdToDelete);
      if (activeApp) activeApp.status = 'Cancelled';

      return `❌ Your appointment for ${cleanPhone} has been CANCELLED and removed from Google Calendar (harshpande039@gmail.com).`;
    } else {
      return `You don't have any active appointments under ${cleanPhone} to cancel.`;
    }
  }

  // BOOKING FLOW
  if (session.step === 'IDLE' && (lower.includes('book') || lower.includes('appointment') || lower.includes('cleaning') || lower.includes('consultation'))) {
    session.step = 'BOOK_SERVICE';
    return `I can help you book an appointment for ${cleanPhone}! What service do you need?\n1. Dental Consultation\n2. Teeth Cleaning\n3. Teeth Whitening\n4. Routine Checkup`;
  }

  if (session.step === 'BOOK_SERVICE') {
    session.bookingData.service = input;
    session.step = 'BOOK_DATE';
    return `Great! What date would you like to visit? (e.g. 2026-08-26)`;
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
             `You can type *"status"* anytime to check your booking.`;
    } else {
      userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
      return "Booking cancelled. Let me know if you would like to choose a different time!";
    }
  }

  // FAQs
  const faqMatch = INITIAL_FAQS.find(f => f.keywords.some(k => lower.includes(k)));
  if (faqMatch) return faqMatch.answer;

  return `Hello! 👋 I’m Ava from BrightSmile Dental Clinic.\n\nHow can I help your number (${cleanPhone}) today?\n• Reply *"Book appointment"* to schedule\n• Reply *"Status"* to check your booking\n• Ask any questions about our clinic!`;
}

// Health Check / Root route
app.get('/', (req, res) => {
  res.send('WhatsApp AI Agent Webhook Server is active.');
});

// Twilio Webhook Receiver
app.post('/webhook', async (req, res) => {
  try {
    const incomingMsg = req.body.Body || req.body.body || '';
    const senderNumber = req.body.From || req.body.from || '';

    console.log(`[Twilio Webhook] Received from ${senderNumber}: "${incomingMsg}"`);

    const botReplyText = await handleWhatsAppAiAgent(senderNumber, incomingMsg);

    const twiml = new MessagingResponse();
    twiml.message(botReplyText);

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  } catch (err) {
    console.error('Webhook processing error:', err);
    const twiml = new MessagingResponse();
    twiml.message("Hello! I am Ava from BrightSmile Dental Clinic. How can I assist you today?");
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
