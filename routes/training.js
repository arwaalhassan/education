const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');

// كورسات
router.post('/courses', trainingController.addCourse);
router.get('/courses', trainingController.getCourses);
router.post('/courses/register', trainingController.registerToCourse);
router.delete('/courses/delete/:id', trainingController.deleteCourse);


// الجدول الأسبوعي
router.post('/schedule', trainingController.addSchedule);
router.get('/schedule', trainingController.getSchedule);
router.delete('/schedule/:id', trainingController.deleteSchedule);
router.put('/schedule/:id', trainingController.updateSchedule);

module.exports = router;

