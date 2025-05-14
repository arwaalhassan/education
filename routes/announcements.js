const express = require('express');
const router = express.Router();
const announcementsController = require('../controllers/announcementsController');
const upload = require('../controllers/upload');

router.post('/', upload.single('image'), announcementsController.addAnnouncement);
router.get('/', announcementsController.getAnnouncements);
router.delete('/delete/:id', announcementsController.deleteAnnouncement);


module.exports = router;

