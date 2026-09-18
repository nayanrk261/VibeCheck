// Fixture containing un-rate-limited auth route & plaintext password save signal
const express = require('express');
const app = express();

app.post('/api/login', (req, res) => {
    const password = req.body.password;
    const user = new User({ password: req.body.password });
    user.save();
    res.json({ status: 'ok' });
});

module.exports = app;
