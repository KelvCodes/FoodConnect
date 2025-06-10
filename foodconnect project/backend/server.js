

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
