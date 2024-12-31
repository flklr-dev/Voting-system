const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyFaceData } = require('../utils/faceVerification');
const Student = require('../models/Student');
const { body, validationResult } = require('express-validator');
const { studentAuth } = require('../middleware/auth');
const Admin = require('../models/Admin');

// Program mapping
const facultyPrograms = {
  FaCET: ['BSIT', 'BSCE', 'BSMRS', 'BSM', 'BSITM'],
  FALS: ['BSES', 'BSA', 'BSBIO'],
  FNAHS: ['BSN'],
  FTED: ['BSED', 'BEED'],
  FGCE: ['BSC'],
  FBM: ['BSBA', 'BSHM'],
  FHuSoCom: ['BSPolSci', 'BSDC']
};

// Validation middleware
const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('studentId')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Invalid student ID format'),
  body('email')
    .matches(/^.+@dorsu\.edu\.ph$/)
    .withMessage('Must be a valid DOrSU email'),
  body('faculty')
    .isIn(Object.keys(facultyPrograms))
    .withMessage('Invalid faculty'),
  body('program')
    .custom((value, { req }) => {
      if (!facultyPrograms[req.body.faculty]?.includes(value)) {
        throw new Error('Invalid program for selected faculty');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Step 1: Temporary registration
router.post('/temp-register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName,
      middleName,
      lastName,
      studentId,
      email,
      faculty,
      program,
      password
    } = req.body;

    // Check if student already exists
    let student = await Student.findOne({ 
      $or: [{ studentId }, { email }] 
    });

    if (student) {
      return res.status(400).json({ 
        message: 'Student already registered' 
      });
    }

    // Create temporary token with registration data
    const tempToken = jwt.sign(
      { 
        type: 'registration',
        registrationData: {
          firstName,
          middleName,
          lastName,
          studentId,
          email,
          faculty,
          program,
          password
        }
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      tempToken,
      message: 'Temporary registration successful'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Step 2: Complete registration with face data
router.post('/complete-registration', async (req, res) => {
  try {
    const { faceData, tempToken, registrationData } = req.body;

    // Verify temp token and get decoded data
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid registration token' 
      });
    }

    // Create new student with registration data
    const student = new Student(registrationData);
    
    // Initialize face data structure
    student.faceData = {
      descriptors: [],
      lastUpdated: new Date(),
      verificationAttempts: 0
    };

    // Add the face descriptor
    if (faceData?.descriptors?.[0]) {
      student.faceData.descriptors.push(faceData.descriptors[0]);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid face data provided'
      });
    }

    // Set registration as complete
    student.registrationComplete = true;

    // Save the student
    await student.save();

    res.json({
      success: true,
      message: 'Registration completed successfully'
    });

  } catch (error) {
    console.error('Registration completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing registration'
    });
  }
});

// Student login route
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    
    if (!student) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate token with userType
    const token = jwt.sign(
      { 
        id: student._id,
        userType: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token: `Bearer ${token}`,
      studentId: student.studentId,
      student: {
        firstName: student.firstName,
        lastName: student.lastName
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Face verification route
router.post('/verify-face', async (req, res) => {
  try {
    const { faceData, studentId } = req.body;

    // Find student and ensure face data exists
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Get stored face data
    const storedFaceData = student.getFaceData();
    
    // Verify face data
    const isMatch = await verifyFaceData(faceData, storedFaceData);
    
    if (!isMatch) {
      // Increment verification attempts
      storedFaceData.verificationAttempts += 1;
      await student.save();
      
      return res.status(401).json({
        success: false,
        message: 'Face verification failed'
      });
    }

    // Reset verification attempts on success
    storedFaceData.verificationAttempts = 0;
    await student.save();

    // Generate new token
    const token = jwt.sign(
      { 
        id: student._id,
        userType: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      message: 'Face verification successful',
      token: `Bearer ${token}`,
      student: {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName
      }
    });

  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during face verification'
    });
  }
});

// Add student profile route
router.get('/student/profile', studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .select('-password -__v');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      student: {
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        email: student.email,
        studentId: student.studentId,
        faculty: student.faculty,
        program: student.program
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Admin login route
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Create token
    const token = jwt.sign(
      { 
        id: admin._id,
        userType: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token: token, // Token without 'Bearer ' prefix
      adminId: admin._id,
      admin: {
        email: admin.email,
        name: admin.name
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

module.exports = router; 