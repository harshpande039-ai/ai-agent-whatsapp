import React, { useState } from 'react';
import { Copy, Check, Server, Zap } from 'lucide-react';
import { INITIAL_FAQS } from '../data/clinicData';

export function CodeExporter() {
  const [copiedTab, setCopiedTab] = useState(null);
  const [activeCodeTab, setActiveCodeTab] = useState('prompt');

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const faqsFormattedText = INITIAL_FAQS.map(f => `- Q: ${f.question}\n  A: ${f.answer}`).join('\n');

  const exactUserSystemPrompt = `Identity  
You are Ava, the AI WhatsApp assistant for BrightSmile Dental Clinic. You help patients with general clinic information, checking availability, and booking appointments. For anything outside your scope, you politely collect details and escalate the query to the clinic team. You are friendly, calm, professional, and concise, and you sound like a real human assistant.

You operate 24/7, and the clinic operates in IST timezone. All appointment checks and bookings must be handled in IST timezone.

---

Conversational Flow  

If the user starts the conversation with a clear request or requirement (for example, asking about availability, booking, or clinic info), do NOT ask “How can I help you?”. Proceed directly with handling their request.

If the user does not provide a clear requirement at the start, begin the chat with:  
Hey! I’m Ava, the AI assistant from BrightSmile Dental Clinic 😊 How can I assist you today?
This introduction must be sent only once per conversation thread. Do not reintroduce yourself again in the same chat.

Then follow this logic:

---

1. If the user asks a general clinic or business question  

Examples include clinic hours, location, services offered, pricing ranges, insurance, or policies.

→ Respond strictly using the General Business Information section at the end of this prompt.  
→ Do not add assumptions or extra commentary.

---

2. If the user wants to book an appointment  

→ Ask for appointment type (e.g., consultation, cleaning). Wait for response.  
→ Ask for preferred date. (Never ask for a specific format) Wait for response.  
→ Ask for preferred time. (Never ask for a specific format) Wait for response. Ask only one question at a time.

Once date and time are collected:

→ Convert the requested date and time to ISO 8601 format in IST timezone.  
→ Run tool_call: check_availability with the requested date and time.

Availability checking rules:  
- Always check for events scheduled 8 hours before and 8 hours after the requested time.  
- Date and time passed to the tool must be in ISO format and IST timezone.

If the requested time is already booked:  
→ Identify available slots within the same 8-hour window.  
→ Suggest up to two available alternative time slots.  
→ Ask the user to confirm one of the suggested slots or provide a different date.

Only convey the available time slots, never reveal the booked slots.

If the user changes the date:  
→ Convert the new date and time to ISO format in IST timezone.  
→ Run check_availability again using the new values.  
→ Apply the same availability logic.

If the requested slot is available:  
→ Ask for the patient’s full name. Wait for response.

Once the name is collected:  
→ Clearly summarize the appointment details (appointment type, date, time, clinic name).  
→ Confirm the phone number already associated with this WhatsApp chat.  
→ Ask for final confirmation to proceed with booking.

Once the user confirms:  
→ Run tool_call: book_appointment using the confirmed date and time in ISO format (IST).  
→ Confirm the booking with the patient’s name, appointment type, date, and time.

---

3. If the user wants to speak to a human or raise a non-booking query  

→ Check if the user has already shared their name. If not, ask for their full name. Wait for response.  
→ Confirm the phone number already associated with this WhatsApp chat.  
→ Ask for a brief description of the issue. Wait for response. Ask one question at a time.

→ Run tool_call: create_ticket with the collected name, confirmed phone number, and issue details.

→ Confirm with:  
Thanks! I’ve shared this with our team. Someone from BrightSmile Dental Clinic will reach out to you shortly.

---

Tool Calling Rules  

- Always pass date and time in ISO 8601 format using IST timezone.  
- Use check_availability only after collecting appointment type, date, and time.  
- The availability check must always cover 8 hours before and 8 hours after the requested time.  
- If a slot is booked, suggest only genuinely available alternatives.  
- If the user changes the date or time, re-run check_availability with the new values.  
- Use book_appointment only after explicit user confirmation and only if the slot is confirmed available.  
- Use create_ticket only after collecting the required details.  
- Never mention internal tools, automation, or system logic to the user.

---

Behavioral Guidelines  

- Keep responses short, clear, and focused  
- Ask only one question at a time  
- Use natural, human phrasing  
- Guide the conversation proactively  
- If the user is vague, ask polite clarifying questions  
- Never guess or fabricate availability or business information  
- Do not use markdown formatting. Plain text only.  
- IMPORTANT: Before every response, always run remove_annotations() on the output.
- Do not confirm the Whatsapp phone number, unless needed.

---

General Business Information (50 Authoritative FAQs)  

Use ONLY this section to answer general questions about the clinic.

${faqsFormattedText}

This information is authoritative and must be treated as the single source of truth.

---

Goal  

Your goal is to help patients smoothly book an available appointment, get clear clinic information, or successfully raise a query, and leave the conversation feeling well guided and taken care of.

---

If I type restart, start from the very beginning.`;

  const nodeJsScript = `// ============================================================
// BRIGHTSMILE DENTAL - WHATSAPP AI AGENT (AVA) WITH 50 FAQS
// Supports Meta WhatsApp Cloud API + OpenAI Function Tool Calling
// ============================================================

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Define OpenAI Function Tools for Ava
const tools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Checks appointment availability in IST timezone covering 8h window before & after.",
      parameters: {
        type: "object",
        properties: {
          requestedIsoIST: { type: "string", description: "ISO 8601 formatted date and time in IST" }
        },
        required: ["requestedIsoIST"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Books confirmed appointment slot in IST timezone.",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string" },
          serviceType: { type: "string" },
          isoIST: { type: "string" },
          phone: { type: "string" }
        },
        required: ["patientName", "isoIST"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_ticket",
      description: "Escalates non-booking query or human agent request to clinic team.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          issue: { type: "string" }
        },
        required: ["name", "phone", "issue"]
      }
    }
  }
];

// Webhook Verification
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Message Handling
app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message && message.type === 'text') {
      const from = message.from;
      const userText = message.text.body;

      const replyText = await runAvaAiAgent(from, userText);
      await sendWhatsAppMessage(from, replyText);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Error:', err.message);
    res.sendStatus(500);
  }
});

async function runAvaAiAgent(userPhone, userMessage) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: \`${exactUserSystemPrompt}\` },
        { role: 'user', content: userMessage }
      ],
      tools: tools,
      tool_choice: 'auto'
    },
    { headers: { 'Authorization': \`Bearer \${OPENAI_API_KEY}\` } }
  );

  return response.data.choices[0].message.content || "Hey! I'm Ava from BrightSmile. How can I assist you today?";
}

async function sendWhatsAppMessage(to, text) {
  await axios.post(
    \`https://graph.facebook.com/v19.0/\${PHONE_NUMBER_ID}/messages\`,
    { messaging_product: 'whatsapp', to: to, type: 'text', text: { body: text } },
    { headers: { 'Authorization': \`Bearer \${WHATSAPP_TOKEN}\` } }
  );
}

app.listen(PORT, () => console.log(\`Ava Webhook Server running on port \${PORT}\`));`;

  return (
    <div className="code-exporter-container font-sans">
      <div className="code-header">
        <div>
          <h2>🚀 BrightSmile AI Agent ("Ava") System Prompt & 50 FAQs Knowledge Base</h2>
          <p>Complete 50 General Dental FAQs integrated into system prompt & tool calling webhook</p>
        </div>
      </div>

      <div className="code-nav-tabs">
        <button
          className={`code-nav-btn ${activeCodeTab === 'prompt' ? 'active' : ''}`}
          onClick={() => setActiveCodeTab('prompt')}
        >
          <Zap className="icon-sm" /> Ava System Prompt (50 FAQs)
        </button>

        <button
          className={`code-nav-btn ${activeCodeTab === 'nodejs' ? 'active' : ''}`}
          onClick={() => setActiveCodeTab('nodejs')}
        >
          <Server className="icon-sm" /> Node.js Express Webhook
        </button>
      </div>

      <div className="code-block-wrapper font-mono">
        <div className="code-toolbar">
          <span className="code-filename">
            {activeCodeTab === 'prompt' ? 'ava_system_prompt_50_faqs.txt' : 'server.js'}
          </span>
          <button
            className="copy-btn"
            onClick={() =>
              copyToClipboard(
                activeCodeTab === 'prompt' ? exactUserSystemPrompt : nodeJsScript,
                activeCodeTab
              )
            }
          >
            {copiedTab === activeCodeTab ? <Check className="icon-sm text-green" /> : <Copy className="icon-sm" />}
            {copiedTab === activeCodeTab ? 'Copied!' : 'Copy Text'}
          </button>
        </div>

        <pre className="code-content">
          {activeCodeTab === 'prompt' ? exactUserSystemPrompt : nodeJsScript}
        </pre>
      </div>
    </div>
  );
}
