

const validateDonation = [
  body('business').notEmpty().trim().withMessage('Business name is required'),
  body('quantity').notEmpty().trim().withMessage('Quantity is required'),
  body('type').notEmpty().trim().withMessage('Food type is required'),
  body('location').notEmpty().trim().withMessage('Pickup location is required'),
  body('pickup').notEmpty().trim().withMessage('Pickup time is required'),
  body('phone').isMobilePhone().trim().withMessage('Valid phone number is required')
];

const validateRecipient = [
  body('phone').isMobilePhone().trim().withMessage('Valid phone number is required'),
  body('location').notEmpty().trim().withMessage('Delivery location is required')
];

router.get('/', async (req, res) => {
  try {
    const donations = await Donation.find();
    console.log('GET /api/donations - Fetched donations:', donations);
    res.json(donations);
  } catch (err) {
    console.error('GET /api/donations - Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      console.log(`GET /api/donations/${req.params.id} - Donation not found`);
      return res.status(404).json({ error: 'Donation not found' });
    }
    console.log(`GET /api/donations/${req.params.id} - Fetched donation:`, donation);
    res.json(donation);
  } catch (err) {
    console.error(`GET /api/donations/${req.params.id} - Error:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', validateDonation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('POST /api/donations - Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { business, quantity, type, location, pickup, phone } = req.body;
    const donation = new Donation({
      name: `${business} Donation`,
      quantity,
      type,
      location,
      pickup,
      phone,
      status: 'available'
    });
    await donation.save();
    console.log('POST /api/donations - Created donation:', donation);
    req.io.emit('newDonation', donation);
    res.status(201).json({ message: 'Donation submitted', donation });
  } catch (err) {
    console.error('POST /api/donations - Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/request', validateRecipient, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('POST /api/donations/:id/request - Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const donation = await Donation.findOneAndUpdate(
      { _id: req.params.id, status: 'available' },
      { 
        status: 'claimed', 
        recipientPhone: req.body.phone, 
        recipientLocation: req.body.location 
      },
      { new: true }
    );
    
    if (!donation) {
      console.log(`POST /api/donations/${req.params.id}/request - Donation not found or already claimed`);
      return res.status(404).json({ error: 'Donation not found or already claimed' });
    }

    console.log('POST /api/donations/:id/request - Updated donation:', donation);
    req.io.emit('donationUpdate', donation);
    res.json({ message: 'Request submitted', donation });
  } catch (err) {
    console.error('POST /api/donations/:id/request - Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/accept', async (req, res) => {
  try {
    const donation = await Donation.findOneAndUpdate(
      { _id: req.params.id, status: 'claimed' },
      { status: 'delivered' },
      { new: true }
    );
    
    if (!donation) {
      console.log(`POST /api/donations/${req.params.id}/accept - Donation not found or not claimed`);
      return res.status(404).json({ error: 'Donation not found or not in claimed status' });
    }

    console.log('POST /api/donations/:id/accept - Donation accepted:', donation);
    req.io.emit('donationUpdate', donation);
    res.json({ message: 'Delivery accepted', donation });
  } catch (err) {
    console.error('POST /api/donations/:id/accept - Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
