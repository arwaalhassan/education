const express = require('express');
const router = express.Router();
const controller = require('../controllers/hallsController');

router.get('/', controller.getHalls);
router.post('/', controller.addHall);
router.delete('/delete/:id', controller.deleteHalls);

module.exports = router;

