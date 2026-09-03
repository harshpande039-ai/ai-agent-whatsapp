import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { google } from 'googleapis';
import { CLINIC_INFO, INITIAL_FAQS } from './src/data/clinicData.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

// Green API Instance Credentials
const GREEN_ID_INSTANCE = process.env.GREEN_ID_INSTANCE || '710722718057';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || '5731ed53f86e41b2aa2ce54fc8eb5fba7c7f3b8dddfa4e0cb9';
const GREEN_API_HOST = process.env.GREEN_API_HOST || 'https://7107.api.greenapi.com';

import fs from 'fs';
import path from 'path';

// Google Calendar API Setup
let GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'harshpande039@gmail.com';

// Auto-detect JSON key file if environment variables are not set
const possibleKeyFiles = [
  './service-account.json',
  './credentials.json',
  './google-credentials.json',
  './google-key.json'
];

for (const keyPath of possibleKeyFiles) {
  if ((!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) && fs.existsSync(keyPath)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      if (fileData.client_email && fileData.private_key) {
        GOOGLE_CLIENT_EMAIL = fileData.client_email;
        GOOGLE_PRIVATE_KEY = fileData.private_key;
        console.log(`🔑 [Google Calendar] Loaded credentials from "${keyPath}" (${GOOGLE_CLIENT_EMAIL})`);
        break;
      }
    } catch (e) {
      console.warn(`Could not parse JSON key file at ${keyPath}:`, e.message);
    }
  }
}

let calendar = null;
if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
  try {
    const auth = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY,
      ['https://www.googleapis.com/auth/calendar']
    );
    calendar = google.calendar({ version: 'v3', auth });
    console.log(`✅ [Google Calendar Ready] Authenticated as ${GOOGLE_CLIENT_EMAIL} targeting calendar: ${CALENDAR_ID}`);
  } catch (err) {
    console.error('❌ [Google Calendar Auth Error]:', err.message);
  }
} else {
  console.warn('⚠️ [Google Calendar Setup Needed] GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are missing.');
  console.warn('   Add them to your .env file or place a "service-account.json" key file in this directory.');
}

// In-Memory Database
const clientDatabase = {};
const userSessions = {};

// Send message back via Green API REST API
async function sendGreenApiMessage(chatId, messageText) {
  const token = process.env.GREEN_API_TOKEN || GREEN_API_TOKEN;
  const host = process.env.GREEN_API_HOST || GREEN_API_HOST;
  const idInstance = process.env.GREEN_ID_INSTANCE || GREEN_ID_INSTANCE;

  // Ensure chatId is properly formatted (e.g. 919876543210@c.us)
  let formattedChatId = chatId;
  if (!formattedChatId.includes('@')) {
    formattedChatId = `${formattedChatId.replace(/[^0-9]/g, '')}@c.us`;
  }

  try {
    const url = `${host}/waInstance${idInstance}/sendMessage/${token}`;
    console.log(`[Green API] Sending message to ${formattedChatId}...`);
    const response = await axios.post(url, {
      chatId: formattedChatId,
      message: messageText
    });
    console.log(`[Green API] Reply sent successfully to ${formattedChatId}! Response ID:`, response.data?.idMessage);
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    const errorData = err.response?.data;
    console.error(`[Green API Error] Status ${status}: Could not send WhatsApp reply to ${formattedChatId}:`, errorData || err.message);

    if (status === 466) {
      console.error('⚠️ [Green API 3-Chat Limit] The Green API Developer (Free) plan allows chatting with a maximum of 3 numbers per month.');
      console.error('   To message new numbers, upgrade to the Business plan or manage active chats in the Green API Console (https://console.green-api.com).');
    }
  }
}

// Calendar Helpers
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

const STANDARD_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'
];

function isHealthAdviceQuery(lowerInput) {
  const healthKeywords = [
    'medicine', 'tablet', 'tablets', 'pill', 'pills', 'antibiotic', 'painkiller',
    'diagnose', 'symptom', 'cure', 'home remedy', 'treatment advice', 'what to take',
    'why does my', 'infection treatment', 'prescribe', 'prescription', 'how to treat',
    'medical advice', 'health advice', 'remedy', 'dosage'
  ];
  return healthKeywords.some(kw => lowerInput.includes(kw));
}

function parseAndValidateDate(input) {
  if (!input) return null;
  const clean = input.trim().toLowerCase();

  // Reject generic conversational noise when expecting a date
  if (['yes', 'no', 'ok', 'sure', 'hi', 'hello', 'thanks', 'thank you', 'yeah', 'yep', 'cancel', 'reset', 'restart'].includes(clean)) {
    return null;
  }

  const now = new Date();

  if (clean.includes('today')) {
    return now.toISOString().split('T')[0];
  }
  if (clean.includes('tomorrow')) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split('T')[0];
  }

  // Handle day of week (e.g. "Monday", "Friday")
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = daysOfWeek.findIndex(d => clean.includes(d));
  if (dayIndex !== -1) {
    const currentDay = now.getDay();
    let diff = (dayIndex - currentDay + 7) % 7;
    if (diff === 0) diff = 7;
    const targetDate = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
    return targetDate.toISOString().split('T')[0];
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = clean.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD/MM
  const dmyMatch = clean.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = dmyMatch[3] ? (dmyMatch[3].length === 2 ? 2000 + parseInt(dmyMatch[3], 10) : parseInt(dmyMatch[3], 10)) : now.getFullYear();
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }

  // Month names (e.g. 26 Aug, Aug 26, 28th August)
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let i = 0; i < monthNames.length; i++) {
    if (clean.includes(monthNames[i])) {
      const dayMatch = clean.match(/(\d{1,2})/);
      if (dayMatch) {
        const d = parseInt(dayMatch[1], 10);
        const dt = new Date(now.getFullYear(), i, d);
        if (!isNaN(dt.getTime())) {
          if (dt < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
            dt.setFullYear(now.getFullYear() + 1);
          }
          return dt.toISOString().split('T')[0];
        }
      }
    }
  }

  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    if (dt.getFullYear() < now.getFullYear()) {
      dt.setFullYear(now.getFullYear());
    }
    return dt.toISOString().split('T')[0];
  }

  return null;
}

function normalizeTimeSlot(timeInput) {
  if (!timeInput) return null;
  const clean = timeInput.trim().toLowerCase();
  
  const match = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  let period = match[3];

  if (!period) {
    if (hour >= 1 && hour <= 7) period = 'pm';
    else if (hour >= 9 && hour <= 11) period = 'am';
    else if (hour === 12) period = 'pm';
  }

  if (period === 'pm' && hour < 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  for (const slot of STANDARD_SLOTS) {
    const slotMatch = slot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    let sHour = parseInt(slotMatch[1], 10);
    const sMin = parseInt(slotMatch[2], 10);
    const sPeriod = slotMatch[3];

    if (sPeriod === 'PM' && sHour < 12) sHour += 12;
    if (sPeriod === 'AM' && sHour === 12) sHour = 0;

    if (sHour === hour && Math.abs(sMin - minutes) < 15) {
      return slot;
    }
  }

  return null;
}

function parseDateTime(dateStr, timeStr) {
  try {
    let hours = 10;
    let minutes = 0;
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      if (!meridiem) {
        if (hours >= 1 && hours <= 7) hours += 12;
      }
    }

    const dateParts = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    let year, month, day;
    if (dateParts) {
      year = parseInt(dateParts[1], 10);
      month = parseInt(dateParts[2], 10) - 1;
      day = parseInt(dateParts[3], 10);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
      day = now.getDate() + 1;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const startIso = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+05:30`;
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + 30 * 60000);

    return {
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      startLocalIST: startIso,
      hours,
      minutes
    };
  } catch (err) {
    console.error('[Date Parse Error]:', err.message);
    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 30 * 60000);
    return {
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      startLocalIST: startDate.toISOString(),
      hours: 10,
      minutes: 0
    };
  }
}

// Check availability in Google Calendar & In-Memory Store
async function checkGoogleCalendarSlotAvailability(dateStr, timeStr) {
  const { startTime, endTime } = parseDateTime(dateStr, timeStr);
  const reqStart = new Date(startTime).getTime();
  const reqEnd = new Date(endTime).getTime();

  // 1. Check local client database
  for (const client of Object.values(clientDatabase)) {
    for (const app of (client.appointments || [])) {
      if (app.date === dateStr && app.status !== 'Cancelled') {
        const appSlotNorm = normalizeTimeSlot(app.time);
        const reqSlotNorm = normalizeTimeSlot(timeStr);
        if (appSlotNorm && reqSlotNorm && appSlotNorm === reqSlotNorm) {
          console.log(`[Local DB Conflict] Slot ${timeStr} on ${dateStr} is already booked.`);
          return false;
        }
      }
    }
  }

  // 2. Check live Google Calendar
  if (calendar) {
    try {
      const dayStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
      const dayEnd = new Date(`${dateStr}T23:59:59+05:30`).toISOString();

      const res = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: dayStart,
        timeMax: dayEnd,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const items = res.data.items || [];
      for (const item of items) {
        if (item.status === 'cancelled') continue;
        const itemStartStr = item.start?.dateTime || item.start?.date;
        const itemEndStr = item.end?.dateTime || item.end?.date;
        if (!itemStartStr) continue;

        const evStart = new Date(itemStartStr).getTime();
        const evEnd = itemEndStr ? new Date(itemEndStr).getTime() : evStart + 30 * 60000;

        if (Math.max(reqStart, evStart) < Math.min(reqEnd, evEnd)) {
          console.log(`[Google Calendar Conflict] Slot ${timeStr} on ${dateStr} conflicts with event "${item.summary}" (${itemStartStr} - ${itemEndStr})`);
          return false;
        }
      }
    } catch (err) {
      console.error('[Google Calendar Availability Check Error]:', err.message);
    }
  }

  return true;
}

// Get free available slots for a given date
async function getGoogleCalendarFreeSlots(dateStr) {
  const busySlots = new Set();

  // 1. In-memory appointments
  Object.values(clientDatabase).forEach(client => {
    (client.appointments || []).forEach(app => {
      if (app.date === dateStr && app.status !== 'Cancelled') {
        const norm = normalizeTimeSlot(app.time);
        if (norm) busySlots.add(norm);
      }
    });
  });

  // 2. Google Calendar events for the day
  if (calendar) {
    try {
      const dayStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
      const dayEnd = new Date(`${dateStr}T23:59:59+05:30`).toISOString();

      const res = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: dayStart,
        timeMax: dayEnd,
        singleEvents: true
      });

      const items = res.data.items || [];
      for (const item of items) {
        if (item.status === 'cancelled') continue;
        const itemStartStr = item.start?.dateTime;
        if (!itemStartStr) continue;

        const evDate = new Date(itemStartStr);
        const hours = evDate.getHours();
        const minutes = evDate.getMinutes();
        
        for (const slot of STANDARD_SLOTS) {
          const { hours: sH, minutes: sM } = parseDateTime(dateStr, slot);
          if (Math.abs((sH * 60 + sM) - (hours * 60 + minutes)) < 25) {
            busySlots.add(slot);
          }
        }
      }
    } catch (err) {
      console.error('[Google Calendar List Slots Error]:', err.message);
    }
  }

  return STANDARD_SLOTS.filter(slot => !busySlots.has(slot));
}

async function createGoogleCalendarEvent({ patientName, email, phone, serviceType, dateStr, timeStr, healthIssue }) {
  const { startTime, endTime } = parseDateTime(dateStr, timeStr);

  if (!calendar) {
    console.warn('⚠️ [Google Calendar] Credentials (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY) are missing in environment variables. Event NOT created on Google Calendar.');
    return `CAL-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const formattedDescription = 
    `name: ${patientName}\n` +
    `email: ${email || 'N/A'}\n` +
    `phone number: +${phone}\n` +
    `health issue: ${healthIssue || 'None specified'}\n` +
    `service: ${serviceType}\n` +
    `status: Confirmed`;

  try {
    const event = {
      summary: `🦷 Dental Appointment: ${patientName} (${serviceType})`,
      description: formattedDescription,
      start: { dateTime: startTime, timeZone: 'Asia/Kolkata' },
      end: { dateTime: endTime, timeZone: 'Asia/Kolkata' }
    };

    console.log(`[Google Calendar ID: ${CALENDAR_ID}] Inserting event for ${patientName} at ${startTime}...`);
    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event
    });
    console.log(`✅ [Google Calendar ID: ${CALENDAR_ID}] Successfully created event! Event ID:`, res.data.id);
    return res.data.id;
  } catch (err) {
    console.error('❌ [Google Calendar Error] Failed to create event:', err.response?.data || err.message);
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

// AI Agent Core Engine
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
  const cleanPhone = senderPhone.replace('@c.us', '').replace(/[^0-9]/g, '');

  // Inactivity session timeout (15 minutes)
  const nowMs = Date.now();
  if (session.lastActivity && (nowMs - session.lastActivity > 15 * 60 * 1000) && session.step !== 'IDLE') {
    session.step = 'IDLE';
    session.bookingData = {};
  }
  session.lastActivity = nowMs;

  if (lower === 'reset' || lower === 'restart') {
    userSessions[senderPhone] = { step: 'IDLE', bookingData: {}, lastActivity: nowMs };
    return `Hello! 👋 Welcome to BrightSmile Dental Clinic. I’m Ava, your AI assistant!\n\nHow can I help your number (+${cleanPhone}) today?\n• Type *"Book appointment"* to schedule\n• Type *"Status"* to check your booking\n• Ask any question about services, location or timings!`;
  }

  // STATUS CHECK
  if (lower.includes('status') || lower.includes('my appointment') || lower.includes('check appointment')) {
    const activeApp = client.appointments.find(a => a.status !== 'Cancelled');
    const calEvent = await findGoogleCalendarEventByPhone(cleanPhone);

    if (activeApp || calEvent) {
      const patientName = client.name || (activeApp ? activeApp.patientName : 'Valued Patient');
      const date = activeApp ? activeApp.date : (calEvent.start.dateTime ? calEvent.start.dateTime.split('T')[0] : 'Scheduled');
      const time = activeApp ? activeApp.time : 'Scheduled Time';
      const service = activeApp ? activeApp.service : 'Dental Consultation';

      return `📋 *Appointment Status for +${cleanPhone}*\n\n` +
             `👤 *Patient*: ${patientName}\n` +
             `🦷 *Service*: ${service}\n` +
             `📅 *Date*: ${date}\n` +
             `⏰ *Time*: ${time}\n` +
             `✅ *Status*: Confirmed on Google Calendar (harshpande039@gmail.com)\n\n` +
             `Reply *"Cancel"* if you need to cancel this appointment.`;
    } else {
      return `ℹ️ No active appointments found for your WhatsApp number (+${cleanPhone}).\n\nReply *"Book appointment"* to schedule a new visit!`;
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

      return `❌ Your appointment for +${cleanPhone} has been CANCELLED and removed from Google Calendar (harshpande039@gmail.com).`;
    } else {
      return `You don't have any active appointments under +${cleanPhone} to cancel.`;
    }
  }

  // BOOKING FLOW
  if (session.step === 'IDLE' && (lower.includes('book') || lower.includes('appointment') || lower.includes('cleaning') || lower.includes('consultation') || lower.includes('schedule'))) {
    session.step = 'BOOK_SERVICE';
    return `I can help you book an appointment for +${cleanPhone}! What service do you need?\n1. Dental Consultation\n2. Teeth Cleaning\n3. Teeth Whitening\n4. Routine Checkup`;
  }

  if (session.step === 'BOOK_SERVICE') {
    let chosenService = input;
    if (input === '1' || lower.includes('consultation')) chosenService = 'Dental Consultation';
    else if (input === '2' || lower.includes('clean')) chosenService = 'Teeth Cleaning';
    else if (input === '3' || lower.includes('white')) chosenService = 'Teeth Whitening';
    else if (input === '4' || lower.includes('checkup') || lower.includes('routine')) chosenService = 'Routine Checkup';

    session.bookingData.service = chosenService;
    session.step = 'BOOK_DATE';
    return `Great! What date would you like to visit? (e.g. 2026-08-28, tomorrow, or Aug 29)`;
  }

  if (session.step === 'BOOK_DATE') {
    const validDate = parseAndValidateDate(input);
    if (!validDate) {
      return `Please provide a valid date for your visit (e.g. 2026-08-28, tomorrow, or Aug 29).`;
    }
    session.bookingData.date = validDate;
    session.step = 'BOOK_TIME';

    const freeSlots = await getGoogleCalendarFreeSlots(validDate);
    const slotsFormatted = freeSlots.length > 0
      ? freeSlots.map(s => `• ${s}`).join('\n')
      : 'No free slots remaining on this date.';

    return `Great! What time would you prefer on *${validDate}*?\n\n` +
           `📅 *Available free time slots:*\n${slotsFormatted}\n\n` +
           `Please reply with your preferred time slot (e.g. 10:00 AM or 02:30 PM).`;
  }

  if (session.step === 'BOOK_TIME') {
    const matchedSlot = normalizeTimeSlot(input);
    const freeSlots = await getGoogleCalendarFreeSlots(session.bookingData.date);

    if (!matchedSlot || !freeSlots.includes(matchedSlot)) {
      const slotsList = freeSlots.length > 0 
        ? freeSlots.map(s => `• ${s}`).join('\n')
        : 'Unfortunately, there are no free slots remaining on this date. Please reply with a different date.';

      return `Sorry, "${input}" is not available or does not match our clinic schedule.\n\n` +
             `📅 *Available time slots on ${session.bookingData.date}:*\n${slotsList}\n\n` +
             `Please reply with one of the available time slots above!`;
    }

    session.bookingData.time = matchedSlot;
    session.step = 'BOOK_NAME';
    return client.name 
      ? `Would you like to book this for ${client.name}? Reply "YES" or type a different name.`
      : `May I please have your full name for the booking?`;
  }

  if (session.step === 'BOOK_NAME') {
    const name = (lower === 'yes' && client.name) ? client.name : input;
    client.name = name;
    session.bookingData.name = name;
    session.step = 'BOOK_EMAIL';
    return `Thank you, ${name}! May I please have your email address?`;
  }

  if (session.step === 'BOOK_EMAIL') {
    session.bookingData.email = input;
    session.step = 'BOOK_ISSUE';
    return `Got it! Please briefly describe any health issue or reason for your visit (or type "none"):`;
  }

  if (session.step === 'BOOK_ISSUE') {
    session.bookingData.healthIssue = input;
    session.step = 'BOOK_CONFIRM';

    return `📋 *Confirm Booking Details*\n\n` +
           `👤 *Name*: ${session.bookingData.name}\n` +
           `📧 *Email*: ${session.bookingData.email}\n` +
           `📱 *Phone*: +${cleanPhone}\n` +
           `🦷 *Service*: ${session.bookingData.service}\n` +
           `📅 *Date*: ${session.bookingData.date}\n` +
           `⏰ *Time*: ${session.bookingData.time}\n` +
           `📝 *Health Issue*: ${session.bookingData.healthIssue}\n\n` +
           `Reply *"YES"* to check Google Calendar availability and confirm your appointment!`;
  }

  if (session.step === 'BOOK_CONFIRM') {
    if (lower.includes('yes') || lower.includes('confirm') || lower.includes('sure') || lower.includes('ok') || lower.includes('yep') || lower.includes('yeah')) {
      console.log(`[Booking Confirmation] Checking Google Calendar availability for ${session.bookingData.name} on ${session.bookingData.date} at ${session.bookingData.time}...`);
      const isAvailable = await checkGoogleCalendarSlotAvailability(session.bookingData.date, session.bookingData.time);

      if (!isAvailable) {
        console.warn(`[Booking Conflict] Slot ${session.bookingData.time} on ${session.bookingData.date} is no longer available.`);
        const freeSlots = await getGoogleCalendarFreeSlots(session.bookingData.date);
        const freeSlotsFormatted = freeSlots.length > 0
          ? freeSlots.map(s => `• ${s}`).join('\n')
          : '⚠️ No free slots remaining on this date. Please reply with another date.';

        session.step = 'BOOK_TIME';
        return `⚠️ *Slot Unavailable!*\n\n` +
               `Unfortunately, the slot on *${session.bookingData.date} at ${session.bookingData.time}* was just taken or conflicts with an existing event on Google Calendar (harshpande039@gmail.com).\n\n` +
               `📅 *Available slots for ${session.bookingData.date}:*\n${freeSlotsFormatted}\n\n` +
               `Please reply with another time slot from above to confirm your booking!`;
      }

      // Slot is available -> Create Google Calendar Event
      const eventId = await createGoogleCalendarEvent({
        patientName: session.bookingData.name,
        email: session.bookingData.email,
        phone: cleanPhone,
        serviceType: session.bookingData.service,
        dateStr: session.bookingData.date,
        timeStr: session.bookingData.time,
        healthIssue: session.bookingData.healthIssue
      });

      client.appointments.push({
        eventId,
        patientName: session.bookingData.name,
        email: session.bookingData.email,
        phone: cleanPhone,
        healthIssue: session.bookingData.healthIssue,
        service: session.bookingData.service,
        date: session.bookingData.date,
        time: session.bookingData.time,
        status: 'Confirmed'
      });

      const confirmed = { ...session.bookingData };
      userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };

      return `🎉 *Booking Confirmed!*\n\n` +
             `Your appointment has been successfully scheduled and added to Google Calendar (harshpande039@gmail.com)!\n\n` +
             `📋 *Appointment Details:*\n` +
             `• 👤 *Name*: ${confirmed.name}\n` +
             `• 📧 *Email*: ${confirmed.email}\n` +
             `• 📱 *Phone*: +${cleanPhone}\n` +
             `• 🦷 *Service*: ${confirmed.service}\n` +
             `• 📅 *Date*: ${confirmed.date}\n` +
             `• ⏰ *Time*: ${confirmed.time}\n` +
             `• 📝 *Health Issue*: ${confirmed.healthIssue || 'None'}\n` +
             `• 🆔 *Ref ID*: ${eventId}\n\n` +
             `You can reply *"status"* anytime to check your booking or *"cancel"* to reschedule. We look forward to welcoming you to BrightSmile Dental Clinic! 😊`;
    } else {
      userSessions[senderPhone] = { step: 'IDLE', bookingData: {} };
      return "Booking cancelled. Let me know if you would like to choose a different time or date!";
    }
  }

  // Health & Medical Advice Guardrail
  if (isHealthAdviceQuery(lower)) {
    return "⚠️ *Medical Disclaimer*: I am an automated clinic assistant and cannot provide medical or health advice, diagnoses, or prescriptions. For any dental symptoms, pain, or medical concerns, please book a consultation with our qualified dentist for a professional evaluation.";
  }

  // FAQs
  const faqMatch = INITIAL_FAQS.find(f => f.keywords.some(k => lower.includes(k)));
  if (faqMatch) return faqMatch.answer;

  return `Hello! 👋 I’m Ava from BrightSmile Dental Clinic.\n\nHow can I help your number (+${cleanPhone}) today?\n• Reply *"Book appointment"* to schedule\n• Reply *"Status"* to check your booking\n• Ask any questions about our clinic!`;
}

// Web endpoints
app.get('/', (req, res) => {
  res.send('🟢 Green API WhatsApp Webhook Server is active.');
});

// Green API Webhook Receiver
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('[Green API Incoming Webhook]:', JSON.stringify(body));

    // Detect Green API quota exceeded event
    if (body.typeWebhook === 'quotaExceeded') {
      console.warn('⚠️ [Green API Quota Exceeded]: Free Developer instance reached 3-chat limit. Upgrade to Business plan to message new numbers.');
      return res.status(200).send('OK');
    }

    // Handle all Green API incoming webhook types
    let senderChatId = '';
    let textMsg = '';

    if (body.typeWebhook === 'incomingMessageReceived') {
      senderChatId = body.senderData?.chatId || body.senderData?.sender;
      
      const mData = body.messageData || {};
      textMsg = 
        mData.textMessageData?.textMessage ||
        mData.extendedTextMessageData?.text ||
        mData.extendedTextMessageData?.description ||
        mData.quotedMessage?.textMessage ||
        mData.buttonsResponseMessage?.selectedDisplayText ||
        mData.buttonsResponseMessage?.selectedButtonId ||
        mData.listResponseMessage?.title ||
        mData.listResponseMessage?.singleSelectReply?.selectedRowId ||
        mData.templateButtonsReplyMessage?.selectedDisplayText ||
        mData.imageMessageData?.caption ||
        mData.documentMessageData?.caption ||
        mData.videoMessageData?.caption ||
        '';
    } else if (body.chatId) {
      senderChatId = body.chatId;
      textMsg = body.textMessage || body.message || body.text || '';
    }

    if (senderChatId && textMsg) {
      console.log(`[Green API Processing] Incoming message from ${senderChatId}: "${textMsg}"`);
      const replyText = await handleWhatsAppAiAgent(senderChatId, textMsg);
      await sendGreenApiMessage(senderChatId, replyText);
    } else {
      console.log('[Green API Info] Received webhook notification without extractable text or sender.');
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('OK');
  }
});

// Global Process Error Handlers for 100% Uptime & Concurrency Resilience
process.on('uncaughtException', (err) => {
  console.error('[Global Process Handler] Uncaught Exception:', err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Global Process Handler] Unhandled Rejection:', reason);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
