import { CLINIC_INFO, SERVICES, INITIAL_FAQS } from '../data/clinicData';
import {
  createAppointment,
  getAppointments
} from './appointmentStore';

// Initial Conversation State for Ava
export const initialConversationState = {
  hasIntroduced: false,
  step: 'IDLE',
  draftBooking: {
    type: '',
    dateStr: '',
    timeStr: '',
    isoDateTimeIST: '',
    patientName: '',
    email: '',
    healthIssue: '',
    patientPhone: '+91 98765 43210'
  },
  draftTicket: {
    name: '',
    phone: '+91 98765 43210',
    issue: ''
  },
  availableAlternatives: []
};

export const STANDARD_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'
];

export function isHealthAdviceQuery(lowerInput) {
  const healthKeywords = [
    'medicine', 'tablet', 'tablets', 'pill', 'pills', 'antibiotic', 'painkiller',
    'diagnose', 'symptom', 'cure', 'home remedy', 'treatment advice', 'what to take',
    'why does my', 'infection treatment', 'prescribe', 'prescription', 'how to treat',
    'medical advice', 'health advice', 'remedy', 'dosage'
  ];
  return healthKeywords.some(kw => lowerInput.includes(kw));
}

export function parseAndValidateDate(input) {
  if (!input) return null;
  const clean = input.trim().toLowerCase();

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

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = daysOfWeek.findIndex(d => clean.includes(d));
  if (dayIndex !== -1) {
    const currentDay = now.getDay();
    let diff = (dayIndex - currentDay + 7) % 7;
    if (diff === 0) diff = 7;
    const targetDate = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
    return targetDate.toISOString().split('T')[0];
  }

  const ymdMatch = clean.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }

  const dmyMatch = clean.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = dmyMatch[3] ? (dmyMatch[3].length === 2 ? 2000 + parseInt(dmyMatch[3], 10) : parseInt(dmyMatch[3], 10)) : now.getFullYear();
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }

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

export function normalizeTimeSlot(timeInput) {
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

export function getFreeSlotsForDate(dateStr) {
  const appointments = getAppointments();
  const bookedOnDate = appointments.filter(a => a.date === dateStr && a.status !== 'Cancelled');
  const bookedSet = new Set();
  
  bookedOnDate.forEach(a => {
    const norm = normalizeTimeSlot(a.timeSlot);
    if (norm) bookedSet.add(norm);
  });

  return STANDARD_SLOTS.filter(slot => !bookedSet.has(slot));
}

export function check_availability(isoDateTimeIST) {
  const reqDate = isoDateTimeIST.split('T')[0];
  const reqTimeHour = parseInt(isoDateTimeIST.split('T')[1].split(':')[0], 10);

  const appointments = getAppointments();
  const bookedOnDate = appointments.filter(
    a => a.date === reqDate && a.status !== 'Cancelled'
  );

  const isBooked = bookedOnDate.some(a => {
    const appHour = parseHourFromSlot(a.timeSlot);
    return appHour === reqTimeHour;
  });

  const free = getFreeSlotsForDate(reqDate);

  return {
    isAvailable: !isBooked,
    suggestedAlternatives: free
  };
}

export function book_appointment(patientName, serviceType, isoDateTimeIST, phone = '+91 98765 43210') {
  const parts = isoDateTimeIST.split('T');
  const date = parts[0];
  const timeHour = parts[1].slice(0, 5);

  return createAppointment({
    patientName,
    patientPhone: phone,
    serviceId: 'consultation',
    doctorId: 'doc-1',
    date,
    timeSlot: formatTimeSlotFromIso(timeHour),
    notes: `Booked via Ava AI (IST)`
  });
}

export function create_ticket(name, phone, issue) {
  const ticketId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    ticketId,
    name,
    phone,
    issue,
    createdAt: new Date().toISOString()
  };
}

export function processUserMessage(userMessage, state = initialConversationState) {
  const input = userMessage.trim();
  const lower = input.toLowerCase();
  const nextState = JSON.parse(JSON.stringify(state));

  // Restart command
  if (lower === 'restart') {
    return {
      text: "Hey! I’m Ava, the AI assistant from BrightSmile Dental Clinic 😊 How can I assist you today?",
      toolCalls: [],
      state: { ...initialConversationState, hasIntroduced: true }
    };
  }

  // Health & Medical Advice Guardrail
  if (isHealthAdviceQuery(lower) && state.step === 'IDLE') {
    nextState.hasIntroduced = true;
    return {
      text: "⚠️ Medical Disclaimer: I am an automated clinic assistant and cannot provide medical or health advice, diagnoses, or prescriptions. For any dental symptoms, pain, or medical concerns, please book a consultation with our qualified dentist for a professional evaluation.",
      toolCalls: [],
      state: nextState
    };
  }

  // Check 50 Authoritative Business Info FAQs
  const faqMatch = find50FaqMatch(lower);
  if (faqMatch && state.step === 'IDLE') {
    nextState.hasIntroduced = true;
    return {
      text: faqMatch.answer,
      toolCalls: [],
      state: nextState
    };
  }

  // Check Escalation / Speak to Human / Non-booking query
  if (
    (lower.includes('human') || lower.includes('agent') || lower.includes('speak to someone') || lower.includes('complain') || lower.includes('talk to doctor') || lower.includes('receptionist')) &&
    state.step === 'IDLE'
  ) {
    nextState.step = 'TICKET_NAME';
    return {
      text: "I can help connect you with our clinic team. May I please have your full name?",
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'TICKET_NAME') {
    nextState.draftTicket.name = input;
    nextState.step = 'TICKET_ISSUE';
    return {
      text: "Could you please share a brief description of what you'd like assistance with?",
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'TICKET_ISSUE') {
    nextState.draftTicket.issue = input;
    const ticketResult = create_ticket(
      nextState.draftTicket.name,
      nextState.draftTicket.phone,
      input
    );
    nextState.step = 'IDLE';
    return {
      text: "Thanks! I’ve shared this with our team. Someone from BrightSmile Dental Clinic will reach out to you shortly.",
      toolCalls: [
        { name: 'create_ticket', args: { name: nextState.draftTicket.name, phone: nextState.draftTicket.phone, issue: input } }
      ],
      state: initialConversationState
    };
  }

  // Booking Flow

  if (state.step === 'IDLE') {
    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('cleaning') || lower.includes('consultation')) {
      nextState.hasIntroduced = true;
      nextState.step = 'BOOK_DATE';

      let appType = 'Dental Consultation';
      if (lower.includes('cleaning')) appType = 'Teeth Cleaning';
      if (lower.includes('whitening')) appType = 'Teeth Whitening';
      if (lower.includes('checkup')) appType = 'Routine Checkup';

      nextState.draftBooking.type = appType;

      return {
        text: `Got it, a ${appType}. What date would you prefer for your appointment?`,
        toolCalls: [],
        state: nextState
      };
    } else if (!state.hasIntroduced) {
      nextState.hasIntroduced = true;
      return {
        text: "Hey! I’m Ava, the AI assistant from BrightSmile Dental Clinic 😊 How can I assist you today?",
        toolCalls: [],
        state: nextState
      };
    }
  }

  if (state.step === 'BOOK_TYPE') {
    nextState.draftBooking.type = input;
    nextState.step = 'BOOK_DATE';
    return {
      text: "What date would you prefer for your appointment?",
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'BOOK_DATE') {
    const validDate = parseAndValidateDate(input);
    if (!validDate) {
      return {
        text: "Please provide a valid date for your visit (e.g. 2026-08-26, tomorrow, or Aug 26).",
        toolCalls: [],
        state: state
      };
    }

    nextState.draftBooking.dateStr = validDate;
    nextState.step = 'BOOK_TIME';

    const freeSlots = getFreeSlotsForDate(validDate);
    const slotsFormatted = freeSlots.length > 0
      ? freeSlots.map(s => `• ${s}`).join('\n')
      : 'No free slots remaining on this date.';

    return {
      text: `Great! What time would you prefer on ${validDate}?\n\n📅 Available free time slots:\n${slotsFormatted}\n\nPlease enter your preferred time slot (e.g. 10:00 AM or 04:00 PM).`,
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'BOOK_TIME') {
    const matchedSlot = normalizeTimeSlot(input);
    const freeSlots = getFreeSlotsForDate(nextState.draftBooking.dateStr);

    if (!matchedSlot || !freeSlots.includes(matchedSlot)) {
      const slotsList = freeSlots.length > 0
        ? freeSlots.map(s => `• ${s}`).join('\n')
        : 'Unfortunately, there are no free slots remaining on this date. Please try a different date.';

      return {
        text: `Sorry, "${input}" is not available or does not match our clinic schedule.\n\n📅 Here are the time slots in which we are free on ${nextState.draftBooking.dateStr}:\n${slotsList}\n\nPlease choose one of the available time slots listed above!`,
        toolCalls: [],
        state: nextState
      };
    }

    nextState.draftBooking.timeStr = matchedSlot;
    const isoIST = parseToIsoIST(nextState.draftBooking.dateStr, matchedSlot);
    nextState.draftBooking.isoDateTimeIST = isoIST;

    nextState.step = 'BOOK_NAME';
    return {
      text: `That slot (${matchedSlot}) is available! May I please have your full name?`,
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'BOOK_NAME') {
    nextState.draftBooking.patientName = input;
    nextState.step = 'BOOK_EMAIL';
    return {
      text: `Thank you, ${input}! May I please have your email address?`,
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'BOOK_EMAIL') {
    nextState.draftBooking.email = input;
    nextState.step = 'BOOK_ISSUE';
    return {
      text: "Got it! Please briefly describe any health issue or reason for your visit (or type 'none'):",
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'BOOK_ISSUE') {
    nextState.draftBooking.healthIssue = input;
    nextState.step = 'BOOK_CONFIRM';

    const readableDateStr = nextState.draftBooking.dateStr;
    const readableTimeStr = nextState.draftBooking.timeStr;
    const appType = nextState.draftBooking.type || 'Dental Consultation';

    return {
      text: `📋 Confirm Booking Details:\n\nname: ${nextState.draftBooking.patientName}\nemail: ${nextState.draftBooking.email}\nphone number: ${nextState.draftBooking.patientPhone}\nhealth issue: ${nextState.draftBooking.healthIssue}\nservice: ${appType}\ndate: ${readableDateStr}\ntime: ${readableTimeStr}\n\nShould I confirm and save this appointment to Google Calendar (harshpande039@gmail.com)?`,
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'BOOK_CONFIRM') {
    if (lower.includes('yes') || lower.includes('confirm') || lower.includes('sure') || lower.includes('ok') || lower.includes('proceed')) {
      const booking = book_appointment(
        nextState.draftBooking.patientName,
        nextState.draftBooking.type,
        nextState.draftBooking.isoDateTimeIST,
        nextState.draftBooking.patientPhone
      );

      nextState.step = 'IDLE';
      return {
        text: `🎉 Appointment Confirmed!\n\nYour appointment for ${nextState.draftBooking.patientName} (${nextState.draftBooking.type}) on ${nextState.draftBooking.dateStr} at ${nextState.draftBooking.timeStr} has been saved to Google Calendar (harshpande039@gmail.com)!\n\nSaved Details:\n• name: ${nextState.draftBooking.patientName}\n• email: ${nextState.draftBooking.email}\n• phone number: ${nextState.draftBooking.patientPhone}\n• health issue: ${nextState.draftBooking.healthIssue}`,
        toolCalls: [{ name: 'book_appointment', args: { name: nextState.draftBooking.patientName, isoIST: nextState.draftBooking.isoDateTimeIST } }],
        state: initialConversationState
      };
    } else {
      return {
        text: "No problem. Let me know if you would like to choose a different date or time.",
        toolCalls: [],
        state: initialConversationState
      };
    }
  }

  return {
    text: "I want to make sure I assist you properly. Would you like to book an appointment, check our clinic info, or speak with our team?",
    toolCalls: [],
    state: nextState
  };
}

function find50FaqMatch(lowerInput) {
  return INITIAL_FAQS.find(faq => {
    return faq.keywords.some(kw => lowerInput.includes(kw)) ||
           lowerInput.includes(faq.question.toLowerCase());
  });
}

function parseToIsoIST(dateInput, timeInput) {
  let datePart = "2026-08-25";
  if (dateInput.toLowerCase().includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    datePart = d.toISOString().split('T')[0];
  } else if (dateInput.match(/\d{4}-\d{2}-\d{2}/)) {
    datePart = dateInput.match(/\d{4}-\d{2}-\d{2}/)[0];
  }

  let hourPart = "10:00:00";
  const hourMatch = timeInput.match(/(\d{1,2})/);
  if (hourMatch) {
    let hr = parseInt(hourMatch[1], 10);
    if (timeInput.toLowerCase().includes('pm') && hr < 12) hr += 12;
    if (timeInput.toLowerCase().includes('am') && hr === 12) hr = 0;
    hourPart = `${hr.toString().padStart(2, '0')}:00:00`;
  }

  return `${datePart}T${hourPart}+05:30`;
}

function parseHourFromSlot(slotStr) {
  const match = slotStr.match(/(\d{1,2})/);
  if (!match) return 10;
  let hr = parseInt(match[1], 10);
  if (slotStr.toLowerCase().includes('pm') && hr < 12) hr += 12;
  if (slotStr.toLowerCase().includes('am') && hr === 12) hr = 0;
  return hr;
}

function formatTimeSlotFromIso(timeHourStr) {
  const hr = parseInt(timeHourStr.split(':')[0], 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const displayHr = hr % 12 || 12;
  return `${displayHr.toString().padStart(2, '0')}:00 ${ampm}`;
}
