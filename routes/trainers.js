const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');

router.post('/add', trainerController.addTrainer);
router.get('/all', trainerController.getAllTrainers);
router.delete('/delete/:id', trainerController.deleteTrainer);

module.exports = router;
