const db = require('../db');

// ---------------- إضافة مدرب جديد ----------------
const addTrainer = (req, res) => {
  const { name, specialty, experience } = req.body;

  const query = `
    INSERT INTO trainers (name, specialty, experience)
    VALUES (?, ?, ?)
  `;

  db.query(query, [name, specialty, experience], (err, result) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ success: false, message: 'DB Error' });
    }

    res.json({ success: true, trainerId: result.insertId });
  });
};

// ---------------- جلب كل المدربين ----------------
const getAllTrainers = (req, res) => {
  const sql = 'SELECT * FROM trainers';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ success: false, message: 'DB Error' });
    }

    res.json(results);
  });
};

// ---------------- حذف مدرب ----------------
const deleteTrainer = (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM trainers WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ message: 'DB Error' });
    }
    res.status(200).json({ message: 'Deleted successfully' });
  });
};

module.exports = { addTrainer, getAllTrainers, deleteTrainer };
