const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const { Client, Environment } = require('square');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Initialize Square client
const client = new Client({
  environment: Environment.Sandbox, // Use Environment.Production for live transactions
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

app.use(cors());

// Define a route to handle payment processing
app.post('/process-payment', async (req, res) => {
  const { nonce, amount } = req.body;

  try {
    const paymentsApi = client.paymentsApi;
    const requestBody = {
      sourceId: nonce,
      idempotencyKey: new Date().getTime().toString(), // Unique key to prevent duplicate charges
      amountMoney: {
        amount: amount, // The payment amount in smallest currency unit (e.g., cents for USD)
        currency: 'USD',
      },
      locationId: process.env.SQUARE_LOCATION_ID,
    };

    const { result } = await paymentsApi.createPayment(requestBody);
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});