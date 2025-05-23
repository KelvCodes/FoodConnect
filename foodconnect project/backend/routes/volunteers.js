const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Volunteer = require('../models/Volunteer');

const validateVolunteer = [
  body('name').notEmpty().trim(),
  body('email').isEmail().trim(),
  body('phone').isMobilePhone().trim()
];

router.get('/', async (req, res) => {
  try {
    const volunteers = await Volunteer.find();
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', validateVolunteer, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
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