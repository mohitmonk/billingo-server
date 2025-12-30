const express = require("express");
const twilio = require("twilio");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const crypto = require("crypto");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* ================= TWILIO ================= */
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/* ================= SEND SMS ================= */
app.post("/send-sms", async (req, res) => {
  const { phoneNumber, billUrl } = req.body;

  if (!phoneNumber || !billUrl) {
    return res.status(400).json({ error: "Phone number and bill URL required" });
  }

  try {
    const msg = await client.messages.create({
      body: `Here is your digital bill: ${billUrl}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    res.status(200).json({ message: "SMS sent", sid: msg.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SMS failed" });
  }
});

/* ================= CASHFREE CREATE ORDER ================= */
app.post("/create-cashfree-order", async (req, res) => {
  try {
    const { amount, customerName, customerPhone } = req.body;

    const orderId = "ORDER_" + Date.now();

    const response = await axios.post(
      "https://sandbox.cashfree.com/pg/orders",
      {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerPhone,
          customer_name: customerName,
          customer_phone: customerPhone,
        },
      },
      {
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });
  } catch (error) {
    console.error("Cashfree order error:", error.response?.data || error);
    res.status(500).json({ error: "Cashfree order creation failed" });
  }
});

/* ================= CASHFREE WEBHOOK ================= */
app.post("/cashfree/webhook", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const rawBody = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
    .update(rawBody)
    .digest("base64");

  if (signature !== expectedSignature) {
    return res.status(400).send("Invalid signature");
  }

  const event = req.body;

  if (event.type === "PAYMENT_SUCCESS") {
    console.log("Payment successful:", event.data.order.order_id);
    // TODO: Save payment status in DB / Firestore
  }

  res.status(200).send("Webhook received");
});

/* ================= START SERVER ================= */
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
