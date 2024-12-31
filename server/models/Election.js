const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
  election_id: {
    type: String,
    required: true,
    unique: true
  },
  election_name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  election_type: {
    type: String,
    enum: ['General', 'Faculty', 'Program'],
    required: true
  },
  restriction: {
    type: String,
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Ongoing', 'Upcoming', 'Completed'],
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
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

// Validate dates
electionSchema.pre('validate', function(next) {
  if (this.start_date && this.end_date) {
    // Ensure end date is after start date
    if (this.end_date <= this.start_date) {
      next(new Error('End date and time must be after start date and time'));
      return;
    }
  }
  next();
});

// Add this static method for generating election ID
electionSchema.statics.generateNextElectionId = async function() {
  try {
    const latestElection = await this.findOne({}, {}, { sort: { 'election_id': -1 } });
    let nextId = 1;
    
    if (latestElection && latestElection.election_id) {
      const lastId = parseInt(latestElection.election_id.split('-')[1]);
      if (!isNaN(lastId)) {
        nextId = lastId + 1;
      }
    }
    
    return `E-${String(nextId).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating election ID:', error);
    throw error;
  }
};

// Update the pre-save middleware
electionSchema.pre('save', async function(next) {
  try {
    // Generate election ID for new elections
    if (this.isNew && !this.election_id) {
      this.election_id = await this.constructor.generateNextElectionId();
    }

    // Update status based on current time and dates
    const now = new Date();
    const startDate = new Date(this.start_date);
    const endDate = new Date(this.end_date);

    if (now < startDate) {
      this.status = 'Upcoming';
    } else if (now >= startDate && now <= endDate) {
      this.status = 'Ongoing';
    } else {
      this.status = 'Completed';
    }

    this.updated_at = now;
    next();
  } catch (error) {
    next(error);
  }
});

// Update static method to update all election statuses with better error handling
electionSchema.statics.updateAllStatuses = async function() {
  try {
    const elections = await this.find({});
    console.log(`Updating status for ${elections.length} elections`);
    
    const now = new Date();
    let updatedCount = 0;

    for (const election of elections) {
      const startDate = new Date(election.start_date);
      const endDate = new Date(election.end_date);

      let newStatus;
      if (now < startDate) {
        newStatus = 'Upcoming';
      } else if (now >= startDate && now <= endDate) {
        newStatus = 'Ongoing';
      } else {
        newStatus = 'Completed';
      }

      if (election.status !== newStatus) {
        election.status = newStatus;
        await election.save();
        updatedCount++;
      }
    }

    console.log(`Updated status for ${updatedCount} elections`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating election statuses:', error);
    throw error;
  }
};

const Election = mongoose.model('Election', electionSchema);

module.exports = Election;
