const express = require('express');
const router = express.Router();
const educationController = require('../controllers/educationController');

// كورسات
router.post('/courses', educationController.addCourse);
router.get('/courses', educationController.getCourses);
router.post('/courses/register', educationController.registerToCourse);
router.delete('/courses/delete/:id', educationController.deleteCourse);
// الجدول الأسبوعي
router.post('/schedule', educationController.addSchedule);
router.get('/schedule', educationController.getSchedule);
router.delete('/schedule/:id', educationController.deleteSchedule);
router.put('/schedule/:id', educationController.updateSchedule);

module.exports = router;

