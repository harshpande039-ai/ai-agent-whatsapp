import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_secret_token';

// Health Check / Root route
app.get('/', (req, res) => {
  res.send('WhatsApp Webhook Backend Server is running.');
});

// 1. Webhook Verification endpoint (Meta WhatsApp API requirement)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
});

// 2. Webhook Event Listener (Receives incoming WhatsApp messages)
app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log('Incoming Webhook event:', JSON.stringify(body, null, 2));

  // Respond instantly with 200 OK to Meta
  res.status(200).send('EVENT_RECEIVED');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
