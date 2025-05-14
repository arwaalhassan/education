const express = require('express');
const router = express.Router();
const islamicController = require('../controllers/islamicController');

// كورسات
router.post('/courses', islamicController.addCourse);
router.get('/courses', islamicController.getCourses);
router.post('/courses/register', islamicController.registerToCourse);
router.delete('/courses/delete/:id', islamicController.deleteCourse);
// الجدول الأسبوعي

router.post('/schedule', islamicController.addSchedule);
router.get('/schedule', islamicController.getSchedule);
router.delete('/schedule/:id', islamicController.deleteSchedule);
router.put('/schedule/:id', islamicController.updateSchedule);


module.exports = router;

