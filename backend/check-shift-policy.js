// Quick script to check shift punch policy in database
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/hr-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const shiftSchema = new mongoose.Schema({
  name: String,
  punchPolicy: String,
  shiftType: mongoose.Schema.Types.ObjectId,
  startTime: String,
  endTime: String,
  graceInMinutes: Number,
  graceOutMinutes: Number,
  requiresApprovalForOvertime: Boolean,
  active: Boolean,
});

const Shift = mongoose.model('Shift', shiftSchema);

async function checkShifts() {
  try {
    console.log('Fetching all shifts...\n');
    const shifts = await Shift.find({});
    
    shifts.forEach(shift => {
      console.log(`Shift: ${shift.name}`);
      console.log(`  ID: ${shift._id}`);
      console.log(`  Punch Policy: "${shift.punchPolicy}" (type: ${typeof shift.punchPolicy})`);
      console.log(`  Active: ${shift.active}`);
      console.log('---');
    });

    // Check specifically for Night Rotational
    console.log('\nLooking for "Night Rotational" shift...');
    const nightShift = await Shift.findOne({ name: /night.*rotational/i });
    if (nightShift) {
      console.log('Found Night Rotational:');
      console.log(JSON.stringify(nightShift, null, 2));
    } else {
      console.log('Night Rotational shift not found');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkShifts();
