const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  candidate_id: {
    type: String,
    required: true,
    unique: true
  },
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  position: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position',
    required: true
  },
  campaign_statement: {
    type: String,
    required: true
  },
  partylist: {
    type: String,
    required: false
  },
  profile_picture: {
    type: String,
    default: 'default-profile.png' // Default image if none uploaded
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index to prevent duplicate candidates in same election
candidateSchema.index({ election: 1, student: 1 }, { unique: true });

// Generate next candidate ID
candidateSchema.statics.generateNextCandidateId = async function() {
  try {
    const latestCandidate = await this.findOne({}, {}, { sort: { 'candidate_id': -1 } });
    let nextId = 1;
    
    if (latestCandidate && latestCandidate.candidate_id) {
      const lastId = parseInt(latestCandidate.candidate_id.split('-')[1]);
      if (!isNaN(lastId)) {
        nextId = lastId + 1;
      }
    }
    
    return `C-${String(nextId).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating candidate ID:', error);
    throw error;
  }
};

// Update timestamps on save
candidateSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate; 