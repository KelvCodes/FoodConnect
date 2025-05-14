const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, default: Date.now },
  name: { type: String, required: true },
  quantity: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  pickup: { type: String, required: true },
  phone: { type: String, required: true },
  status: { type: String, default: 'available' },
  recipientPhone: { type: String },
  recipientLocation: { type: String }
});

module.exports = mongoose.model('Donation', donationSchema);