// Fixture reading req.body without schema validation library
const express = require('express');
const app = express();

app.post('/api/data', (req, res) => {
    const payload = req.body;
    res.send(`Received: ${payload.name}`);
});

module.exports = app;
