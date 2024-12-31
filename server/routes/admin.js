const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { adminAuth } = require('../middleware/auth');
const Student = require('../models/Student');
const Election = require('../models/Election');
const bcrypt = require('bcryptjs');
const Position = require('../models/Position');
const Candidate = require('../models/Candidate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const facultyPrograms = {
  FaCET: ['BSIT', 'BSCE', 'BSMRS', 'BSM', 'BSITM'],
  FALS: ['BSES', 'BSA', 'BSBIO'],
  FNAHS: ['BSN'],
  FTED: ['BSED', 'BEED'],
  FGCE: ['BSC'],
  FBM: ['BSBA', 'BSHM'],
  FHuSoCom: ['BSPolSci', 'BSDC']
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'candidates'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'candidate-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Register new admin
router.post('/register', async (req, res) => {
  try {
    const { firstName, middleName, lastName, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Generate next admin ID
    const adminId = await Admin.generateNextAdminId();

    // Create new admin
    const admin = new Admin({
      adminId,
      firstName,
      middleName,
      lastName,
      email,
      password
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      adminId: admin.adminId
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering admin'
    });
  }
});

// Login admin
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin._id,
        adminId: admin.adminId,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      adminId: admin.adminId,
      admin: {
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
});

// Get admin profile (protected route)
router.get('/profile', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id).select('-password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    res.json({
      success: true,
      admin
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin profile'
    });
  }
});

// Get all students with pagination and search
router.get('/students', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    // Create search query
    const searchQuery = search ? {
      $or: [
        { studentId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const students = await Student.find(searchQuery)
      .select('-password -faceData')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Student.countDocuments(searchQuery);

    res.json({ 
      success: true, 
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Error fetching students' });
  }
});

// Update API routes to match client paths
router.get('/api/admin/students', adminAuth, async (req, res) => {
  // ... existing students route logic ...
});

// Update student status
router.patch('/students/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Active', 'Inactive', 'Graduated', 'Suspended'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password -faceData');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    res.json({ success: true, student });
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating student status' 
    });
  }
});

// Delete student
router.delete('/students/:id', adminAuth, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting student' 
    });
  }
});

// Get all programs
router.get('/programs', adminAuth, async (req, res) => {
  try {
    // Get all programs from the facultyPrograms object
    const allPrograms = Object.values(facultyPrograms).flat();
    res.json({ success: true, programs: allPrograms });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ success: false, message: 'Error fetching programs' });
  }
});

// Get all elections
router.get('/elections', adminAuth, async (req, res) => {
  try {
    await Election.updateAllStatuses();
    const elections = await Election.find({})
      .sort({ created_at: -1 })
      .populate('created_by', 'firstName lastName');
    
    res.json({ success: true, elections });
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching elections'
    });
  }
});

// Create new election
router.post('/elections', adminAuth, async (req, res) => {
  try {
    const {
      election_name,
      description,
      election_type,
      restriction,
      start_date,
      end_date
    } = req.body;

    // Calculate initial status
    const now = new Date();
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    let status;
    
    if (now < startDate) {
      status = 'Upcoming';
    } else if (now >= startDate && now <= endDate) {
      status = 'Ongoing';
    } else {
      status = 'Completed';
    }

    // Create election with the authenticated user's ID
    const election = new Election({
      election_name,
      description,
      election_type,
      restriction: election_type === 'General' ? 'None' : restriction,
      start_date: startDate,
      end_date: endDate,
      status,
      created_by: req.user._id
    });

    // Generate and set election_id if not already set
    if (!election.election_id) {
      election.election_id = await Election.generateNextElectionId();
    }

    await election.save();
    res.json({ success: true, election });
  } catch (error) {
    console.error('Error creating election:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating election'
    });
  }
});

// Delete election
router.delete('/elections/:id', adminAuth, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Don't allow deletion of ongoing elections
    if (election.status === 'Ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an ongoing election'
      });
    }

    await Election.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Election deleted successfully' });
  } catch (error) {
    console.error('Error deleting election:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting election'
    });
  }
});

// Add a route to manually update election statuses
router.post('/elections/update-status', adminAuth, async (req, res) => {
  try {
    await Election.updateAllStatuses();
    res.json({ success: true, message: 'Election statuses updated successfully' });
  } catch (error) {
    console.error('Error updating election statuses:', error);
    res.status(500).json({ success: false, message: 'Error updating election statuses' });
  }
});

// Add a route to fetch updated election statuses
router.get('/elections/status', adminAuth, async (req, res) => {
  try {
    await Election.updateAllStatuses();
    const elections = await Election.find({}).sort({ created_at: -1 });
    res.json({ success: true, elections });
  } catch (error) {
    console.error('Error fetching updated election statuses:', error);
    res.status(500).json({ success: false, message: 'Error fetching election statuses' });
  }
});

// Update election
router.put('/elections/:id', adminAuth, async (req, res) => {
  try {
    const {
      election_name,
      description,
      election_type,
      restriction,
      status,
      start_date,
      end_date
    } = req.body;

    const election = await Election.findByIdAndUpdate(
      req.params.id,
      {
        election_name,
        description,
        election_type,
        restriction: election_type === 'General' ? 'None' : restriction,
        status,
        start_date,
        end_date,
        updated_at: new Date()
      },
      { new: true }
    );

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    res.json({ success: true, election });
  } catch (error) {
    console.error('Error updating election:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating election'
    });
  }
});

// Get all positions
router.get('/positions', adminAuth, async (req, res) => {
  try {
    const positions = await Position.find({}).sort({ created_at: -1 });
    res.json({ success: true, positions });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ success: false, message: 'Error fetching positions' });
  }
});

// Create new position
router.post('/positions', adminAuth, async (req, res) => {
  try {
    const { position_name, max_vote } = req.body;

    // Validate max_vote
    if (!max_vote || max_vote < 1) {
      return res.status(400).json({
        success: false,
        message: 'Maximum votes must be at least 1'
      });
    }

    // Check if position already exists
    const existingPosition = await Position.findOne({ position_name });
    if (existingPosition) {
      return res.status(400).json({
        success: false,
        message: 'Position with this name already exists'
      });
    }

    const position = new Position({
      position_name,
      max_vote,
      position_id: await Position.generateNextPositionId()
    });

    await position.save();
    res.json({ success: true, position });
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating position'
    });
  }
});

// Update position
router.put('/positions/:id', adminAuth, async (req, res) => {
  try {
    const { position_name, max_vote } = req.body;

    // Validate max_vote
    if (max_vote < 1) {
      return res.status(400).json({
        success: false,
        message: 'Maximum votes must be at least 1'
      });
    }

    const position = await Position.findByIdAndUpdate(
      req.params.id,
      {
        position_name,
        max_vote,
        updated_at: new Date()
      },
      { new: true }
    );

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    res.json({ success: true, position });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating position'
    });
  }
});

// Delete position
router.delete('/positions/:id', adminAuth, async (req, res) => {
  try {
    const position = await Position.findByIdAndDelete(req.params.id);
    
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    res.json({ success: true, message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting position'
    });
  }
});

// Get eligible students for candidacy
router.get('/candidates/eligible-students/:electionId', adminAuth, async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    let query = { status: 'Active' };

    // Add restriction based on election type
    if (election.election_type === 'Faculty') {
      query.faculty = election.restriction;
    } else if (election.election_type === 'Program') {
      query.program = election.restriction;
    }

    const students = await Student.find(query)
      .select('studentId firstName middleName lastName program faculty');

    res.json({ success: true, students });
  } catch (error) {
    console.error('Error fetching eligible students:', error);
    res.status(500).json({ success: false, message: 'Error fetching eligible students' });
  }
});

// Get available elections for candidacy
router.get('/candidates/available-elections', adminAuth, async (req, res) => {
  try {
    const elections = await Election.find({
      status: { $in: ['Upcoming', 'Ongoing'] }
    }).sort({ start_date: 1 });
    
    res.json({ success: true, elections });
  } catch (error) {
    console.error('Error fetching available elections:', error);
    res.status(500).json({ success: false, message: 'Error fetching available elections' });
  }
});

// Get all candidates
router.get('/candidates', adminAuth, async (req, res) => {
  try {
    const candidates = await Candidate.find({})
      .populate('election', 'election_name election_type')
      .populate('student', 'studentId firstName lastName')
      .populate('position', 'position_name')
      .sort({ created_at: -1 });
    
    res.json({ success: true, candidates });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ success: false, message: 'Error fetching candidates' });
  }
});

// Create new candidate
router.post('/candidates', adminAuth, upload.single('profile_picture'), async (req, res) => {
  try {
    const { election, student, position, campaign_statement, partylist } = req.body;

    // Check if election exists and is not inactive
    const electionDoc = await Election.findById(election);
    if (!electionDoc || electionDoc.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Invalid election or election is completed'
      });
    }

    // Check if student is active
    const studentDoc = await Student.findById(student);
    if (!studentDoc || studentDoc.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Student is not active or not found'
      });
    }

    // Check if already a candidate in this election
    const existingCandidate = await Candidate.findOne({ election, student });
    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: 'Student is already a candidate in this election'
      });
    }

    // Handle profile picture
    let profilePicturePath = null; // Default to null instead of default image
    if (req.file) {
      profilePicturePath = `/uploads/candidates/${req.file.filename}`;
    }

    const candidate = new Candidate({
      candidate_id: await Candidate.generateNextCandidateId(),
      election,
      student,
      position,
      campaign_statement,
      partylist: partylist || '',
      profile_picture: profilePicturePath // Can be null
    });

    await candidate.save();

    const populatedCandidate = await Candidate.findById(candidate._id)
      .populate('election', 'election_name')
      .populate('student', 'studentId firstName lastName')
      .populate('position', 'position_name');

    res.json({ success: true, candidate: populatedCandidate });
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating candidate'
    });
  }
});

// Update candidate
router.put('/candidates/:id', adminAuth, upload.single('profile_picture'), async (req, res) => {
  try {
    const { election, student, position, campaign_statement, partylist } = req.body;

    // Find the candidate first
    const existingCandidate = await Candidate.findById(req.params.id);
    if (!existingCandidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Check if the new student-election combination already exists (excluding current candidate)
    const duplicateCandidate = await Candidate.findOne({
      election,
      student,
      _id: { $ne: req.params.id }
    });

    if (duplicateCandidate) {
      return res.status(400).json({
        success: false,
        message: 'This student is already a candidate in this election'
      });
    }

    // Handle profile picture update
    let profilePicturePath = existingCandidate.profile_picture;
    if (req.file) {
      // Delete old profile picture if it exists
      if (existingCandidate.profile_picture) {
        const oldFilePath = path.join(__dirname, '..', 'public', existingCandidate.profile_picture);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      profilePicturePath = `/uploads/candidates/${req.file.filename}`;
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      {
        election,
        student,
        position,
        campaign_statement,
        partylist,
        profile_picture: profilePicturePath,
        updated_at: new Date()
      },
      { new: true }
    )
    .populate('election', 'election_name')
    .populate('student', 'studentId firstName lastName')
    .populate('position', 'position_name');

    res.json({ success: true, candidate });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating candidate'
    });
  }
});

// Delete candidate
router.delete('/candidates/:id', adminAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('election', 'status');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Check if election is ongoing
    if (candidate.election.status === 'Ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete candidate from an ongoing election'
      });
    }

    // Delete profile picture file if it exists
    if (candidate.profile_picture) {
      const filePath = path.join(__dirname, '..', 'public', candidate.profile_picture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting candidate'
    });
  }
});

// Dashboard route
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get current date
    const currentDate = new Date();

    // Fetch all required data in parallel
    const [
      totalStudents,
      ongoingElections,
      totalPositions,
      upcomingElections,
      recentActivities,
      currentElection,
      nextElection,
      lastCompletedElection,
      votingStats
    ] = await Promise.all([
      Student.countDocuments(),
      Election.countDocuments({ 
        status: 'ongoing',
        startDate: { $lte: currentDate },
        endDate: { $gt: currentDate }
      }),
      Position.countDocuments(),
      Election.find({
        startDate: { $gt: currentDate }
      })
      .select('election_name startDate endDate status')
      .sort({ startDate: 1 })
      .limit(5),
      // Recent activities (you'll need to implement this based on your activity logging)
      Election.findOne({
        status: 'ongoing',
        startDate: { $lte: currentDate },
        endDate: { $gt: currentDate }
      }).select('election_name startDate endDate totalVotes'),
      Election.findOne({
        startDate: { $gt: currentDate }
      })
      .sort({ startDate: 1 })
      .select('election_name startDate candidates'),
      Election.findOne({
        status: 'completed'
      })
      .sort({ endDate: -1 })
      .select('election_name totalVotes voterTurnout'),
      // Get voting statistics
      Position.aggregate([
        {
          $lookup: {
            from: 'votes',
            localField: '_id',
            foreignField: 'position',
            as: 'votes'
          }
        },
        {
          $project: {
            name: '$position_name',
            votes: { $size: '$votes' }
          }
        }
      ])
    ]);

    // Calculate time remaining for current election
    const timeRemaining = currentElection 
      ? Math.ceil((currentElection.endDate - currentDate) / (1000 * 60 * 60)) 
      : 0;

    // Return formatted data
    res.json({
      success: true,
      totalStudents,
      ongoingElections,
      totalPositions,
      upcomingElections,
      currentElection: currentElection ? {
        name: currentElection.election_name,
        timeRemaining: `${timeRemaining} hours`,
        voterTurnout: '65%' // Replace with actual calculation
      } : null,
      nextElection: nextElection ? {
        name: nextElection.election_name,
        startsIn: Math.ceil((nextElection.startDate - currentDate) / (1000 * 60 * 60 * 24)) + ' days',
        candidates: nextElection.candidates?.length || 0
      } : null,
      lastCompletedElection: lastCompletedElection ? {
        name: lastCompletedElection.election_name,
        totalVotes: lastCompletedElection.totalVotes,
        turnout: lastCompletedElection.voterTurnout + '%'
      } : null,
      votingStats: {
        totalVotes: votingStats.reduce((acc, curr) => acc + curr.votes, 0),
        positionVotes: votingStats
      },
      recentActivities: [
        { action: 'New election created', time: '2 hours ago' },
        { action: 'Student list updated', time: '4 hours ago' },
        { action: 'New admin added', time: '1 day ago' },
        { action: 'Election results published', time: '2 days ago' }
      ]
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

module.exports = router;
