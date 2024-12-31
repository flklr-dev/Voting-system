const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  position_id: {
    type: String,
    required: true,
    unique: true
  },
  position_name: {
    type: String,
    required: true,
    unique: true
  },
  max_vote: {
    type: Number,
    required: true,
    min: 1,
    default: 1
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

// Generate next position ID
positionSchema.statics.generateNextPositionId = async function() {
  try {
    const latestPosition = await this.findOne({}, {}, { sort: { 'position_id': -1 } });
    let nextId = 1;
    
    if (latestPosition && latestPosition.position_id) {
      const lastId = parseInt(latestPosition.position_id.split('-')[1]);
      if (!isNaN(lastId)) {
        nextId = lastId + 1;
      }
    }
    
    return `P-${String(nextId).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating position ID:', error);
    throw error;
  }
};

// Update timestamps on save
positionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const Position = mongoose.model('Position', positionSchema);

module.exports = Position; 