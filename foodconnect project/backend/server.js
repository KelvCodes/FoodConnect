
const Volunteer = require('./models/Volunteer');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodconnect';

// Middleware
app.use(cors());
app.use(express.json());

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/donations', donationRoutes);
app.use('/api/volunteers', volunteerRoutes);

app.get('/api/dashboard', async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments();
    const availableDonations = await Donation.countDocuments({ status: 'available' });
    const claimedDonations = await Donation.countDocuments({ status: 'claimed' });
    const deliveredDonations = await Donation.countDocuments({ status: 'delivered' });
    const totalVolunteers = await Volunteer.countDocuments();
    const peopleHelped = deliveredDonations * 50 + 10000;

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

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
