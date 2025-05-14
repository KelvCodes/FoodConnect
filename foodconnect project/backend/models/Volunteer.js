const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  id: { type: Number, default: Date.now },
  name: String,
  email: String,
  phone: String
});

module.exports = mongoose.model('Volunteer', volunteerSchema);