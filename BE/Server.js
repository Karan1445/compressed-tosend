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

    // 3. Auto-assign Super Admin and handle migration safely via native driver
    const db = mongoose.connection.db;
    const usersCol = db.collection('users');

    const adminExists = await usersCol.findOne({ role: superAdminRole._id });
    if (!adminExists) {
      const oldAdmin = await usersCol.findOne({ role: "Super Admin" });
      if (oldAdmin) {
        await usersCol.updateOne({ _id: oldAdmin._id }, { $set: { role: superAdminRole._id } });
      } else {
        const firstUser = await usersCol.findOne({}, { sort: { _id: 1 } });
        if (firstUser) {
          await usersCol.updateOne({ _id: firstUser._id }, { $set: { role: superAdminRole._id } });
          console.log(`👑 Assigned Super Admin role to the first user.`);
        }
      }
    }

    // 4. Migration: convert string roles to ObjectIds natively
    const usersWithStringRole = await usersCol.find({ role: { $type: 2 } }).toArray(); // 2 is BSON type String
    if (usersWithStringRole.length > 0) {
      console.log(`🔄 Found ${usersWithStringRole.length} users with string roles. Migrating...`);
      for (const u of usersWithStringRole) {
        const foundRole = await Role.findOne({ name: u.role });
        if (foundRole) {
          await usersCol.updateOne({ _id: u._id }, { $set: { role: foundRole._id } });
        } else {
          // If the role doesn't exist, default to Signer
          await usersCol.updateOne({ _id: u._id }, { $set: { role: signerRole._id } });
        }
      }
      console.log('✅ Migration complete.');
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
    const data = await User.find().populate('role').lean();
    res.json(data);
  } catch (err) {
    res.status(500).send("No data");
  }
});

app.get('/debug/docx', async (req, res) => {
  try {
    const Docx = require('./models/Docx');
    const docs = await Docx.find().lean();
    res.json(docs.map(d => ({ _id: d._id, originalName: d.originalName, assignees: d.assignees })));
  } catch (err) {
    res.status(500).json({ error: err.message });
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
