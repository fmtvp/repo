const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();

// MongoDB connection with proper error handling
const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
if (!mongoUrl) {
  console.error('MongoDB URL not provided. Set MONGO_URL environment variable.');
  process.exit(1);
}

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Schemas
const confessionSchema = new mongoose.Schema({
  content: { type: String, required: true },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const activationCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Confession = mongoose.model('Confession', confessionSchema);
const Admin = mongoose.model('Admin', adminSchema);
const ActivationCode = mongoose.model('ActivationCode', activationCodeSchema);

// Create default admin
// Admin.findOne({ username: 'admin' }).then(admin => {
//   if (!admin) {
//     bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10).then(hash => {
//       new Admin({ username: 'admin', password: hash }).save();
//     });
//   }
// }).catch(err => console.log('Admin creation skipped:', err.message));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// Public routes
app.get('/', (req, res) => {
  res.render('index', { confessions: [], showForm: true });
});

app.post('/', async (req, res) => {
  try {
    const { activationCode } = req.body;
    
    if (!activationCode) {
      return res.render('index', { confessions: [], showForm: true, error: 'code_required' });
    }
    
    const code = await ActivationCode.findOne({ code: activationCode, isActive: true });
    if (!code) {
      return res.render('index', { confessions: [], showForm: true, error: 'invalid_code' });
    }
    
    const confessions = await Confession.find({ approved: true }).sort({ createdAt: -1 });
    res.render('index', { confessions, showForm: false, activationCode });
  } catch (error) {
    res.render('index', { confessions: [], showForm: true, error: 'server_error' });
  }
});

app.get('/submit', (req, res) => {
  res.render('submit', { query: req.query });
});

app.post('/submit', async (req, res) => {
  try {
    const { content, activationCode } = req.body;
    
    if (!activationCode) {
      return res.redirect('/submit?error=code_required');
    }
    
    const code = await ActivationCode.findOne({ code: activationCode, isActive: true });
    if (!code) {
      return res.redirect('/submit?error=invalid_code');
    }
    
    await new Confession({ content }).save();
    res.redirect('/submit?success=1');
  } catch (error) {
    res.redirect('/submit?error=server_error');
  }
});

// Debug route to check admin accounts
app.get('/debug-admin', async (req, res) => {
  try {
    const admins = await Admin.find({});
    res.json({
      adminCount: admins.length,
      admins: admins.map(admin => ({
        id: admin._id,
        username: admin.username,
        hasPassword: !!admin.password
      }))
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Reset admin password (only if no other admins exist)
app.post('/reset-admin', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.json({ error: 'Password required' });
    }
    
    const adminCount = await Admin.countDocuments();
    if (adminCount !== 1) {
      return res.json({ error: 'Reset only allowed with exactly one admin' });
    }
    
    const hash = await bcrypt.hash(newPassword, 10);
    await Admin.updateOne({}, { password: hash });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Test login without session
app.post('/test-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Test login attempt for username:', username);
    
    const admin = await Admin.findOne({ username });
    console.log('Admin found:', !!admin);
    
    if (admin && await bcrypt.compare(password, admin.password)) {
      console.log('Password match successful');
      res.json({ success: true, message: 'Login successful', adminId: admin._id });
    } else {
      console.log('Login failed - invalid credentials');
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Admin auth routes
app.get('/setup', async (req, res) => {
  const adminExists = await Admin.findOne({});
  if (adminExists) {
    return res.status(404).send('Not Found');
  }
  res.render('setup', { error: req.query.error });
});

app.post('/setup', async (req, res) => {
  try {
    const adminExists = await Admin.findOne({});
    if (adminExists) {
      return res.status(404).send('Not Found');
    }
    
    const { username, password } = req.body;
    if (!username || !password) {
      return res.redirect('/setup?error=missing');
    }
    
    console.log('Creating admin with username:', username);
    const hash = await bcrypt.hash(password, 10);
    const newAdmin = await new Admin({ username, password: hash }).save();
    console.log('Admin created successfully:', newAdmin._id);
    
    // Redirect with success message
    res.send(`
      <html>
        <head><title>Setup Complete</title></head>
        <body style="font-family: Arial; background: #1a1a2e; color: #fff; padding: 40px; text-align: center;">
          <h2 style="color: #e94560;">✅ Admin Account Created Successfully!</h2>
          <p style="margin: 20px 0;">Username: <strong>${username}</strong></p>
          <div style="background: rgba(233,69,96,0.1); border: 1px solid rgba(233,69,96,0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #f27121;">🔑 Access Admin Panel:</h3>
            <p><a href="/admin/login" style="color: #e94560; font-size: 1.2em;">Go to Admin Login →</a></p>
            <p>Use the credentials you just created</p>
          </div>
          <p style="margin-top: 30px;"><a href="/" style="color: #f27121;">← Back to Home</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Setup error:', error);
    res.redirect('/setup?error=server');
  }
});

app.get('/admin/login', (req, res) => {
  res.render('login', { error: req.query.error });
});

app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);
    
    const admin = await Admin.findOne({ username });
    console.log('Admin found:', !!admin);
    
    if (admin && await bcrypt.compare(password, admin.password)) {
      console.log('Password match successful');
      req.session.adminId = admin._id;
      console.log('Session set, redirecting to /admin');
      res.redirect('/admin');
    } else {
      console.log('Login failed - invalid credentials');
      res.redirect('/admin/login?error=1');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/admin/login?error=1');
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin CRUD routes
app.get('/admin', requireAuth, async (req, res) => {
  try {
    const pending = await Confession.find({ approved: false }).sort({ createdAt: -1 });
    const approved = await Confession.find({ approved: true }).sort({ createdAt: -1 });
    const codes = await ActivationCode.find().sort({ createdAt: -1 });
    res.render('admin', { pending, approved, codes });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

app.post('/admin/generate-code', requireAuth, async (req, res) => {
  try {
    const crypto = require('crypto');
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    const generateSegment = () => Array.from({length: 8}, () => chars[crypto.randomInt(chars.length)]).join('');
    const code = Array.from({length: 3}, generateSegment).join('-');
    await new ActivationCode({ code }).save();
    res.redirect('/admin');
  } catch (error) {
    res.redirect('/admin');
  }
});

app.post('/admin/toggle-code/:id', requireAuth, async (req, res) => {
  try {
    const code = await ActivationCode.findById(req.params.id);
    await ActivationCode.findByIdAndUpdate(req.params.id, { isActive: !code.isActive });
    res.redirect('/admin');
  } catch (error) {
    res.redirect('/admin');
  }
});

app.post('/admin/delete-code/:id', requireAuth, async (req, res) => {
  try {
    await ActivationCode.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
  } catch (error) {
    res.redirect('/admin');
  }
});

app.post('/admin/approve/:id', requireAuth, async (req, res) => {
  try {
    await Confession.findByIdAndUpdate(req.params.id, { approved: true });
    res.redirect('/admin');
  } catch (error) {
    res.redirect('/admin');
  }
});

app.post('/admin/delete/:id', requireAuth, async (req, res) => {
  try {
    await Confession.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
  } catch (error) {
    res.redirect('/admin');
  }
});

app.post('/admin/edit/:id', requireAuth, async (req, res) => {
  try {
    await Confession.findByIdAndUpdate(req.params.id, { content: req.body.content });
    res.redirect('/admin');
  } catch (error) {
    res.redirect('/admin');
  }
});

module.exports = app;
