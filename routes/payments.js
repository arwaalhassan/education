const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// المسار الأول: لإنشاء الجلسة (محمي بـ JWT)
router.post('/create-checkout-session', auth.authenticateToken, paymentController.createCheckoutSession);
router.post('/subscribe', auth.authenticateToken, paymentController.subscribe);
// المسار الثاني: لاستقبال الـ Webhook (يجب أن يكون raw body وغير محمي بـ JWT)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handlePaymentWebhook);

module.exports = router;
