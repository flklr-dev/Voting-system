const express = require('express');
const router = express.Router();
const { studentAuth } = require('../middleware/auth');
const Student = require('../models/Student');
const Election = require('../models/Election');

// Dashboard route
router.get('/dashboard', studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Your dashboard data logic here
    const dashboardData = {
      success: true,
      data: {
        activeElections: 0,
        completedVotes: 0,
        nextElection: '',
        timeRemaining: '',
        upcomingElections: []
      },
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        studentId: student.studentId
      }
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard data' 
    });
  }
});

// Active Elections route
router.get('/active-elections', studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get current date
    const now = new Date();

    // Find all active elections
    const activeElections = await Election.find({
      start_date: { $lte: now },
      end_date: { $gte: now },
      status: 'Ongoing',
      $or: [
        { election_type: 'General' },
        {
          $and: [
            { election_type: 'Faculty' },
            { restriction: student.faculty }
          ]
        },
        {
          $and: [
            { election_type: 'Program' },
            { restriction: student.program }
          ]
        }
      ]
    }).sort({ end_date: 1 }); // Sort by closest ending first

    if (activeElections.length === 0) {
      return res.json({
        success: true,
        message: 'No active elections as of the moment',
        elections: []
      });
    }

    res.json({
      success: true,
      elections: activeElections
    });

  } catch (error) {
    console.error('Active elections error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active elections'
    });
  }
});

module.exports = router; 