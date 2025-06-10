// Import required modules
const express = require('express');             // Express framework for routing and server handling
const mongoose = require('mongoose');           // Mongoose for MongoDB interaction
const cors = require('cors');                   // Middleware to handle Cross-Origin Resource Sharing
const http = require('http');                   // Core Node.js HTTP module
const socketIo = require('socket.io');          // Socket.IO for real-time WebSocket communication
const dotenv = require('dotenv');               // Loads environment variables from .env file

// Import custom route handlers and models
const donationRoutes = require('./routes/donations');
const volunteerRoutes = require('./routes/volunteers');
const Donation = require('./models/Donation');
const Volunteer = require('./models/Volunteer');

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: '*',                // Allow requests from any origin
    methods: ['GET', 'POST']    // Allowed HTTP methods
  }
});

// Define server port and MongoDB URI from environment or defaults
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodconnect';

// -------------------- MIDDLEWARE --------------------

// Enable CORS
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Middleware to inject Socket.IO into request object for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// -------------------- ROUTES --------------------

// API routes for donations and volunteers
app.use('/api/donations', donationRoutes);
app.use('/api/volunteers', volunteerRoutes);

// Dashboard endpoint to provide application statistics
app.get('/api/dashboard', async (req, res) => {
  try {
    // Gather statistics from the database
    const totalDonations = await Donation.countDocuments();
    const availableDonations = await Donation.countDocuments({ status: 'available' });
    const claimedDonations = await Donation.countDocuments({ status: 'claimed' });
    const deliveredDonations = await Donation.countDocuments({ status: 'delivered' });
    const totalVolunteers = await Volunteer.countDocuments();
    const peopleHelped = deliveredDonations * 50 + 10000; // Example metric

    // Return stats as JSON response
    res.json({
      totalDonations,
      availableDonations,
      claimedDonations,
      deliveredDonations,
      totalVolunteers,
      peopleHelped
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- MONGODB CONNECTION --------------------

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// -------------------- SOCKET.IO EVENTS --------------------

// Listen for new socket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// -------------------- START SERVER --------------------

// Start the HTTP server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

