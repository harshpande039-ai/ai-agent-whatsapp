import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const { MessagingResponse } = twilio.twiml;

const app = express();
app.use(cors());

// Parse Twilio's incoming urlencoded form data body
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health Check / Root route
app.get('/', (req, res) => {
  res.send('WhatsApp Webhook Backend Server is running.');
});

// Webhook Verification endpoint
app.get('/webhook', (req, res) => {
  res.status(200).send('Webhook is active.');
});

// Twilio WhatsApp Webhook Event Listener & Auto-Responder
app.post('/webhook', (req, res) => {
  const incomingMsg = req.body.Body || '';
  const senderNumber = req.body.From || '';
  
  console.log(`Received WhatsApp message from ${senderNumber}: "${incomingMsg}"`);

  // AI Agent Response Logic
  let botReply = "Hello! I’m Ava, the AI assistant from BrightSmile Dental Clinic 😊 How can I assist you today?";
  
  const lower = incomingMsg.toLowerCase();
  
  if (lower.includes('location') || lower.includes('address') || lower.includes('where')) {
    botReply = "Our clinic is located at 123 Main Street, New York, NY. Patients can contact us for directions.";
  } else if (lower.includes('book') || lower.includes('appointment')) {
    botReply = "Got it! To book an appointment, please tell me your full name, preferred service (e.g. Teeth Cleaning), and date/time.";
  } else if (lower.includes('timing') || lower.includes('hours') || lower.includes('open')) {
    botReply = "BrightSmile Dental Clinic is open Monday through Saturday from 9:00 AM to 7:00 PM.";
  } else if (lower.includes('price') || lower.includes('cost') || lower.includes('fee')) {
    botReply = "Our consultation fees start at $50, and teeth cleaning starts at $80. Would you like to book a consultation?";
  }

  // Create TwiML XML response so Twilio replies back directly on WhatsApp!
  const twiml = new MessagingResponse();
  twiml.message(botReply);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
