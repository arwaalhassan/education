const express = require('express');
const router = express.Router();
const { getAllLinks, addLink, deleteLink } = require('../controllers/linksController');

// GET: جلب جميع الروابط
router.get('/', getAllLinks);

// POST: إضافة رابط
router.post('/', addLink);

// DELETE: حذف رابط
router.delete('/:id', deleteLink);

module.exports = router;

