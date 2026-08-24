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
    patientPhone: '+91 98765 43210'
  },
  draftTicket: {
    name: '',
    phone: '+91 98765 43210',
    issue: ''
  },
  availableAlternatives: []
};

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

  const allPossibleSlots = [
    { timeStr: '09:00 AM', hour: 9, iso: `${reqDate}T09:00:00+05:30` },
    { timeStr: '10:00 AM', hour: 10, iso: `${reqDate}T10:00:00+05:30` },
    { timeStr: '11:00 AM', hour: 11, iso: `${reqDate}T11:00:00+05:30` },
    { timeStr: '02:00 PM', hour: 14, iso: `${reqDate}T14:00:00+05:30` },
    { timeStr: '04:00 PM', hour: 16, iso: `${reqDate}T16:00:00+05:30` },
    { timeStr: '05:30 PM', hour: 17, iso: `${reqDate}T17:30:00+05:30` },
    { timeStr: '06:30 PM', hour: 18, iso: `${reqDate}T18:30:00+05:30` }
  ];

  const availableSlots = allPossibleSlots.filter(s => {
    const isSlotBooked = bookedOnDate.some(a => parseHourFromSlot(a.timeSlot) === s.hour);
    const inWindow = Math.abs(s.hour - reqTimeHour) <= 8;
    return !isSlotBooked && inWindow;
  });

  return {
    isAvailable: !isBooked,
    suggestedAlternatives: availableSlots.slice(0, 2)
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
    nextState.draftBooking.dateStr = input;
    nextState.step = 'BOOK_TIME';
    return {
      text: "What time would you prefer for your appointment?",
      toolCalls: [],
      state: nextState
    };
  }

  if (state.step === 'BOOK_TIME') {
    nextState.draftBooking.timeStr = input;
    const isoIST = parseToIsoIST(nextState.draftBooking.dateStr, nextState.draftBooking.timeStr);
    nextState.draftBooking.isoDateTimeIST = isoIST;

    const availResult = check_availability(isoIST);

    if (!availResult.isAvailable) {
      const alts = availResult.suggestedAlternatives.map(a => a.timeStr).join(' or ');
      nextState.availableAlternatives = availResult.suggestedAlternatives;
      return {
        text: `That time slot is not available. Would either ${alts} work for you, or would you prefer a different date?`,
        toolCalls: [{ name: 'check_availability', args: { requestedIsoIST: isoIST } }],
        state: nextState
      };
    } else {
      nextState.step = 'BOOK_NAME';
      return {
        text: "That slot is available! May I please have your full name?",
        toolCalls: [{ name: 'check_availability', args: { requestedIsoIST: isoIST } }],
        state: nextState
      };
    }
  }

  if (state.step === 'BOOK_NAME') {
    nextState.draftBooking.patientName = input;
    nextState.step = 'BOOK_CONFIRM';

    const readableDateStr = nextState.draftBooking.dateStr;
    const readableTimeStr = nextState.draftBooking.timeStr;
    const appType = nextState.draftBooking.type || 'Dental Consultation';

    return {
      text: `Great! To confirm, you'd like to book a ${appType} on ${readableDateStr} at ${readableTimeStr} at BrightSmile Dental Clinic for ${input}.\n\nShould I go ahead and confirm this booking for you?`,
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
        text: `Your appointment for ${nextState.draftBooking.patientName} (${nextState.draftBooking.type}) on ${nextState.draftBooking.dateStr} at ${nextState.draftBooking.timeStr} is confirmed! We look forward to seeing you at BrightSmile Dental Clinic.`,
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
