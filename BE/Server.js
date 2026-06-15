require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoute')
const pdfTemplateRoutes = require('./routes/pdfTemplateRoutes')
const User = require('./models/User');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// PDF templates can include large base64 payloads, so raise the body limit.
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: '*',
  methods: '*',
  allowedHeaders: '*'
}));

app.use('/', authRoutes);
app.use('/question',authenticateToken ,questionRoutes)
app.use('/pdf-templates', authenticateToken, pdfTemplateRoutes);
app.get("/", authenticateToken, async (req, res) => {
  try {
    const data = await User.find().lean();
    res.json(data);
  } catch (err) {
    res.status(500).send("No data");
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Mongo Booted UP!");
    app.listen(8888, () => {
      console.log("Server is up and thriving on port 8888!");
    });
  })
  .catch((error) => {
    console.log("Database connection failed:", error);
  });
