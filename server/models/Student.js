const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const studentSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{4}-\d{4}$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^.+@dorsu\.edu\.ph$/
  },
  faculty: {
    type: String,
    required: true,
    enum: ['FaCET', 'FALS', 'FNAHS', 'FTED', 'FGCE', 'FBM', 'FHuSoCom']
  },
  program: {
    type: String,
    required: true
  },
  faceData: {
    descriptors: [[Number]], // Array of face descriptors
    lastUpdated: Date,
    verificationAttempts: {
      type: Number,
      default: 0
    }
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Graduated', 'Suspended'],
    default: 'Active'
  },
  registrationComplete: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Method to compare password
studentSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Add face verification method
studentSchema.methods.verifyFace = async function(candidateFaceData) {
  try {
    if (!this.faceData || !this.faceData.descriptors || this.faceData.descriptors.length === 0) {
      throw new Error('No face data registered for this student');
    }

    // Update verification attempts
    this.faceData.verificationAttempts += 1;
    this.faceData.lastVerificationAttempt = new Date();
    await this.save();

    // Compare face descriptors
    const matches = this.faceData.descriptors.map(storedDescriptor => {
      const distance = euclideanDistance(candidateFaceData.descriptors[0], storedDescriptor);
      return distance < 0.6; // Threshold for face matching
    });

    // Need at least 2 matches for verification
    return matches.filter(Boolean).length >= 2;
  } catch (error) {
    console.error('Face verification error:', error);
    return false;
  }
};

// Helper function for face comparison
const euclideanDistance = (desc1, desc2) => {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) {
    return Infinity;
  }
  return Math.sqrt(
    desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0)
  );
};

// Method to update face data
studentSchema.methods.updateFaceData = async function(newFaceData) {
  if (!this.faceData) {
    this.faceData = {
      descriptors: [],
      lastUpdated: new Date(),
      verificationAttempts: 0
    };
  }
  
  // Add new descriptor to the array
  if (newFaceData.descriptors?.[0]) {
    this.faceData.descriptors.push(newFaceData.descriptors[0]);
    this.faceData.lastUpdated = new Date();
  }
  
  await this.save();
  return this.faceData;
};

// Add method to get face data
studentSchema.methods.getFaceData = function() {
  return this.faceData || {
    descriptors: [],
    lastUpdated: new Date(),
    verificationAttempts: 0
  };
};

// Update the updatedAt timestamp before saving
studentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Hash password before saving
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add generateAuthToken method to the schema
studentSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      studentId: this.studentId,
      userType: 'student'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || '7d' }
  );
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;