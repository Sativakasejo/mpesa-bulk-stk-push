const express = require('express');
const { processPayment } = require('../controllers/paymentController');

const router = express.Router();

router.post('/stkpush', processPayment);

module.exports = router;