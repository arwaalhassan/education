const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db'); // استيراد اتصال قاعدة البيانات

const router = express.Router();
const authController = require('../controllers/authController');


// مسارات تسجيل الدخول والتسجيل
router.post('/login', authController.login);
router.post('/register', authController.register);

module.exports = router;

