const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.query.token; // الرمز في الرابط
  if (!token) {
    return res.status(403).send('الرمز مفقود');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next(); // إذا تم التحقق من الرمز، نستمر
  } catch (error) {
    res.status(400).send('الرمز غير صالح أو انتهت صلاحيته');
  }
};

module.exports = verifyToken;
