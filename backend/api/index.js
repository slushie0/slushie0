require('dotenv').config();
const CHECKWX_API_KEY = process.env.CHECKWX_API_KEY;

const express = require('express');
const request = require('request');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/airport/:idents', (req, res) => {
  let airports = req.query.idents;
  request(
    { url: `https://aviationweather.gov/api/data/airport?ids=${airports}&format=json` },
    (error, response, body) => {
      if (error || response.statusCode !== 200) {
        return res.status(500).json({ type: 'error', message: error });
      }

      res.json(JSON.parse(body));
    }
  )
});
app.get('/metar/:idents', (req, res) => {
  let airports = req.query.idents;
  request(
    { url: `https://api.checkwx.com/metar/${airports}/decoded?x-api-key=${CHECKWX_API_KEY}` },
    (error, response, body) => {
      if (error || response.statusCode !== 200) {
        return res.status(500).json({ type: 'error', message: error });
      }

      res.json(JSON.parse(body));
    }
  )
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));