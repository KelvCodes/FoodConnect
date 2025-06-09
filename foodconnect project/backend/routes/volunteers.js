
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const volunteer = new Volunteer(req.body);
    await volunteer.save();
    req.io.emit('newVolunteer', volunteer);
    res.status(201).json({ message: 'Volunteer registered' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
