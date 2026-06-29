require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoute');
const docxRoutes = require('./routes/docxRoute');
const roleRoutes = require('./routes/roleRoutes');
const User = require('./models/User');
const Role = require('./models/Role');
const { authenticateToken } = require('./middleware/auth');
const path = require('path');

// ─── Bootstrap Logic ─────────────────────────────────────────────────────────
async function bootstrapRolesAndAdmin() {
  try {
    // 1. Ensure Super Admin role exists
    const superAdminRoleName = 'Super Admin';
    let superAdminRole = await Role.findOne({ name: superAdminRoleName });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: superAdminRoleName,
        permissions: ['send', 'sign', 'create_role', 'assign_role']
      });
      console.log('✅ Super Admin role created.');
    }

    // 2. Ensure Signer role exists (default for new users)
    const signerRoleName = 'Signer';
    let signerRole = await Role.findOne({ name: signerRoleName });
    if (!signerRole) {
      signerRole = await Role.create({
        name: signerRoleName,
        permissions: ['sign']
      });
      console.log('✅ Signer role created.');
    }

    // 3. Auto-assign Super Admin to the first registered user if no Super Admin exists
    const adminExists = await User.findOne({ role: superAdminRoleName });
    if (!adminExists) {
      const firstUser = await User.findOne().sort({ _id: 1 });
      if (firstUser) {
        firstUser.role = superAdminRoleName;
        await firstUser.save();
        console.log(`👑 Assigned Super Admin role to the first user: ${firstUser.email}`);
      }
    }
  } catch (error) {
    console.error('Error bootstrapping roles:', error);
  }
}


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
app.use('/docx', authenticateToken, docxRoutes);
app.use('/roles', authenticateToken, roleRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get("/", authenticateToken, async (req, res) => {
  try {
    const data = await User.find().lean();
    res.json(data);
  } catch (err) {
    res.status(500).send("No data");
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Mongo Booted UP!");
    
    await bootstrapRolesAndAdmin();

    app.listen(8888, () => {
      console.log("Server is up and thriving on port 8888!");
    });
  })
  .catch((error) => {
    console.log("Database connection failed:", error);
  });
