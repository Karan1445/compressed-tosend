require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoute');
const User = require('./models/User');
const { authenticateToken } = require('./middleware/auth');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: '*',
  allowedHeaders: '*'
}));

app.use('/', authRoutes);
app.use('/question', authenticateToken, questionRoutes);
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
