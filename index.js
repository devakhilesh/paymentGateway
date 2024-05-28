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
  environment: Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

app.use(cors());

// Define a route to handle payment processing
app.post('/process-payment', async (req, res) => {
  let data = req.body
  const { nonce} = data;
     data.amount  = "5.25"
  // Convert the amount to the smallest currency unit (cents for USD)
  let amountInCents = Math.round(parseFloat(data.amount) * 100);

  // Check if amountInCents is a BigInt and convert it to a regular number
  if (typeof amountInCents === 'bigint') {
    amountInCents = Number(amountInCents); 
  }

  try {
    const paymentsApi = client.paymentsApi;
    const requestBody = {
      sourceId: nonce,
      idempotencyKey: new Date().getTime().toString(),
      amountMoney: {
        amount: amountInCents, // Use the converted value here
        currency: 'USD',
      },
      locationId: process.env.SQUARE_LOCATION_ID,
    };

    const { result } = await paymentsApi.createPayment(requestBody);
    console.log(result);

    // Convert any BigInt values in the result to regular numbers before sending the response
    const sanitizedResult = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint'? Number(value) : value
    ));

    res.status(200).json({ success: true, result: sanitizedResult });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
