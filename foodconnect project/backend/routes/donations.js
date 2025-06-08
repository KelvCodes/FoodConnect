/**
 * ----------------------------------
 * This file rewrites the original donation router in a more modular, verbose, and self‑documenting style.
 * All business logic remains identical:
 *   • List donations
 *   • Read single donation
 *   • Create donation
 *   • Claim donation
 *   • Mark donation as delivered
 *
 * Additional improvements
 *   • Centralised constants for donation "states"
 *   • Middleware wrapper to catch async errors → keeps route bodies clean
 *   • Detailed JSDoc comments for every public symbol
 *   • Fine‑grained logging with contextual prefixes
 *   • Grouped validation middlewares
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const Donation = require('../models/Donation');

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                    Section 1 –  Constants &  Utilities                     */
/* -------------------------------------------------------------------------- */

/**
 * Allowed donation lifecycle states.
 * We keep them in one place to avoid typos.
 * @enum {string}
 */
const DONATION_STATUS = {
  AVAILABLE: 'available',
  CLAIMED: 'claimed',
  DELIVERED: 'delivered'
};

/**
 * Helper that wraps an async route so we can simply `throw`
 * and let Express error‑handling middleware take over.
 * @param {(req,res,next)=>Promise<void>} fn
 * @returns {(req,res,next)=>void}
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Collects validation errors (if any) and turns them into a `400 Bad Request`.
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('[Validation] Bad request', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/* -------------------------------------------------------------------------- */
/*                     Section 2 –  Validation Middlewares                    */
/* -------------------------------------------------------------------------- */

/** Validation chain for a _donation_ submission */
const validateDonation = [
  body('business').notEmpty().trim()
    .withMessage('Business name is required'),

  body('quantity').notEmpty().trim()
    .withMessage('Quantity is required'),

  body('type').notEmpty().trim()
    .withMessage('Food type is required'),

  body('location').notEmpty().trim()
    .withMessage('Pickup location is required'),

  body('pickup').notEmpty().trim()
    .withMessage('Pickup time is required'),

  body('phone').isMobilePhone().trim()
    .withMessage('Valid phone number is required'),

  handleValidation
];

/** Validation chain for a _recipient_ claiming a donation */
const validateRecipient = [
  body('phone').isMobilePhone().trim()
    .withMessage('Valid phone number is required'),

  body('location').notEmpty().trim()
    .withMessage('Delivery location is required'),

  handleValidation
];

/* -------------------------------------------------------------------------- */
/*                           Section 3 –  Route Handlers                      */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/donations
 * Returns **all** donations in the system
 */
router.get('/', asyncHandler(async (req, res) => {
  const donations = await Donation.find();
  console.log('[GET /donations] Fetched', donations.length, 'items');
  res.json(donations);
}));

/**
 * GET /api/donations/:id
 * Returns a single donation by its MongoID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);

  if (!donation) {
    console.log(`[GET /donations/${req.params.id}] Not found`);
    return res.status(404).json({ error: 'Donation not found' });
  }

  res.json(donation);
}));

/**
 * POST /api/donations
 * Creates a new donation entry
 */
router.post('/', validateDonation, asyncHandler(async (req, res) => {
  const { business, quantity, type, location, pickup, phone } = req.body;

  const donation = new Donation({
    name: `${business} Donation`,
    quantity,
    type,
    location,
    pickup,
    phone,
    status: DONATION_STATUS.AVAILABLE
  });

  await donation.save();

  console.log('[POST /donations] New donation created', donation._id);
  req.io.emit('newDonation', donation);      // Real‑time broadcast
  res.status(201).json({ message: 'Donation submitted', donation });
}));

/**
 * POST /api/donations/:id/request
 * Lets a recipient _claim_ an **available** donation.
 */
router.post('/:id/request', validateRecipient, asyncHandler(async (req, res) => {
  const { phone, location } = req.body;

  const donation = await Donation.findOneAndUpdate(
    { _id: req.params.id, status: DONATION_STATUS.AVAILABLE },
    {
      status: DONATION_STATUS.CLAIMED,
      recipientPhone: phone,
      recipientLocation: location
    },
    { new: true }
  );

  if (!donation) {
    console.log(`[POST /donations/${req.params.id}/request] Not found or already claimed`);
    return res.status(404).json({ error: 'Donation not found or already claimed' });
  }

  req.io.emit('donationUpdate', donation);
  res.json({ message: 'Request submitted', donation });
}));

/**
 * POST /api/donations/:id/accept
 * Marks a **claimed** donation as **delivered**
 */
router.post('/:id/accept', asyncHandler(async (req, res) => {
  const donation = await Donation.findOneAndUpdate(
    { _id: req.params.id, status: DONATION_STATUS.CLAIMED },
    { status: DONATION_STATUS.DELIVERED },
    { new: true }
  );

  if (!donation) {
    console.log(`[POST /donations/${req.params.id}/accept] Not found or not claimed`);
    return res.status(404).json({ error: 'Donation not found or not in claimed status' });
  }

  req.io.emit('donationUpdate', donation);
  res.json({ message: 'Delivery accepted', donation });
}));

/* -------------------------------------------------------------------------- */
/*                         Section 4 –  Export the Router                     */
/* -------------------------------------------------------------------------- */

module.exports = router;

