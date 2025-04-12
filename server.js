const express = require('express');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('TWILIO_ACCOUNT_SID:', accountSid || 'Not found');
console.log('TWILIO_AUTH_TOKEN:', authToken ? 'Set' : 'Not found');
console.log('TWILIO_PHONE_NUMBER:', twilioNumber || 'Not found');

if (!accountSid || !authToken || !twilioNumber) {
  throw new Error('Missing Twilio credentials');
}

const client = new twilio(accountSid, authToken);

app.post('/send-sms', async (req, res) => {
  const { phoneNumber, billUrl } = req.body;

  if (!phoneNumber || !billUrl) {
    return res.status(400).json({ error: 'Phone number and bill URL are required.' });
  }

  try {
    const message = await client.messages.create({
      body: `Here is your digital bill: ${billUrl}`,
      from: twilioNumber,
      to: phoneNumber,
    });

    console.log('SMS sent successfully:', message.sid);
    res.status(200).json({ message: 'SMS sent successfully!', sid: message.sid });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
