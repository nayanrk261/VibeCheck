const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const bcrypt = require('bcrypt');

const app = express();
app.use(helmet());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

app.post('/api/login', async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json(parse.error);

    const hash = await bcrypt.hash(parse.data.password, 10);
    res.json({ success: true });
});

module.exports = app;
