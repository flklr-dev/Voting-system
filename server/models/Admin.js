const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  middleName: {
    type: String
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate next admin ID
adminSchema.statics.generateNextAdminId = async function() {
  const lastAdmin = await this.findOne({}, {}, { sort: { 'adminId': -1 } });
  if (!lastAdmin) {
    return 'ADMIN001';
  }
  const lastNumber = parseInt(lastAdmin.adminId.slice(5));
  return `ADMIN${String(lastNumber + 1).padStart(3, '0')}`;
};

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Add generateAuthToken method to the schema
adminSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      adminId: this.adminId,
      userType: 'admin'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || '7d' }  // Use environment variable or default to 7 days
  );
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
