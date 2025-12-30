const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const twilio = require("twilio");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

/* ================= MIDDLEWARE ================= */
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
    return res.status(400).json({ error: "Phone and bill URL required" });
  }

  try {
    const message = await client.messages.create({
      body: `Your bill: ${billUrl}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`,
    });

    res.json({ success: true, sid: message.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SMS failed" });
  }
});

/* ================= CASHFREE ORDER ================= */
app.post("/create-cashfree-order", async (req, res) => {
  try {
    const { amount, customerName, customerPhone } = req.body;

    if (!amount || !customerPhone) {
      return res.status(400).json({ error: "Amount & phone required" });
    }

    const isProd = process.env.CASHFREE_ENV === "PROD";

    const cashfreeUrl = isProd
      ? "https://api.cashfree.com/pg/orders"
      : "https://sandbox.cashfree.com/pg/orders";

    const response = await axios.post(
      cashfreeUrl,
      {
        order_id: `ORDER_${Date.now()}`,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerPhone,
          customer_name: customerName || "Guest",
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: "https://your-domain.com/payment-success",
        },
      },
      {
        headers: {
          "x-client-id": process.env.CASHFREE_CLIENT_ID,
          "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      payment_session_id: response.data.payment_session_id,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Cashfree order creation failed" });
  }
});

/* ================= SERVER ================= */
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
