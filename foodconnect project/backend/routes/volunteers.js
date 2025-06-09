// volunteerRoutes.js
/**
 * Volunteer API Routes
 * --------------------
 * Endpoints provided by this file:
 *   GET  /            → Fetch a list of volunteers
 *   POST /            → Register a new volunteer
 *
 * Behaviour is identical to the original snippet, but with:
 *   • Detailed inline documentation
 *   • Clear validation messages
 *   • Lean database queries for minor performance gains
 *   • Defensive error handling & logging
 */

const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');

const Volunteer = require('../models/Volunteer');

// -----------------------------------------------------------------------------
// Validation middleware
// -----------------------------------------------------------------------------
/**
 * validateVolunteer
 * A reusable collection of express‑validator checks that run
 * BEFORE the main controller for POST / requests.
 */
const validateVolunteer = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required'),

  body('email')
    .trim()
    .isEmail().withMessage('A valid e‑mail address is required')
    .normalizeEmail(),             // Tidies gmail aliases etc.

  body('phone')
    .trim()
    .isMobilePhone().withMessage('A valid phone number is required'),
];

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

/**
 * GET /
 * Returns a JSON array of all volunteers in the database.
 */
router.get('/', async (req, res) => {
  try {
    // .lean() skips mongoose document hydration for a tiny speed win
    const volunteers = await Volunteer.find().lean();
    return res.json(volunteers);
  } catch (err) {
    console.error('GET /volunteers failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /
 * Registers a new volunteer.
 *
 * req.body example:
 * {
 *   "name":  "Ada Lovelace",
 *   "email": "ada@example.com",
 *   "phone": "+233201234567"
 * }
 */
router.post('/', validateVolunteer, async (req, res) => {
  // Handle validation results first
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return *all* validation errors to the client
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Create and save the new volunteer record
    const volunteer = new Volunteer(req.body);
    await volunteer.save();

    // Emit a real‑time update over Socket.IO (req.io is injected upstream)
    req.io.emit('newVolunteer', volunteer);

    return res.status(201).json({
      message: 'Volunteer registered',
      volunteer, // Echo back the created object for convenience
    });
  } catch (err) {
    console.error('POST /volunteers failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

