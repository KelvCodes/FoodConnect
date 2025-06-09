
    await volu
    req.io.emit('newVolunteer', volunteer);
    res.status(201).json({ message: 'Volunteer registered' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
