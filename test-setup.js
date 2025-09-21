const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Test MongoDB connection and admin creation
async function testSetup() {
  try {
    // Use a test MongoDB URL (you'd need to provide this)
    const mongoUrl = 'mongodb://localhost:27017/test-confession';
    await mongoose.connect(mongoUrl);
    console.log('✅ MongoDB connected');

    // Define schemas
    const adminSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true }
    });
    const Admin = mongoose.model('Admin', adminSchema);

    // Test admin creation
    const testUsername = 'testadmin';
    const testPassword = 'testpass123';
    
    const hash = await bcrypt.hash(testPassword, 10);
    const admin = new Admin({ username: testUsername, password: hash });
    await admin.save();
    console.log('✅ Admin created successfully');

    // Test login verification
    const foundAdmin = await Admin.findOne({ username: testUsername });
    const passwordMatch = await bcrypt.compare(testPassword, foundAdmin.password);
    console.log('✅ Password verification:', passwordMatch);

    // Cleanup
    await Admin.deleteOne({ username: testUsername });
    await mongoose.disconnect();
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSetup();
