const nodemailer = require('nodemailer');

// إنشاء الاتصال مع خدمة البريد الإلكتروني باستخدام nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // تأكد من إضافة المتغيرات البيئية في .env
    pass: process.env.EMAIL_PASS,
  },
});

// دالة لإرسال بريد إعادة تعيين كلمة المرور
const sendResetPasswordEmail = async (email, resetLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'إعادة تعيين كلمة المرور',
    text: `لقد طلبت إعادة تعيين كلمة المرور الخاصة بك. اضغط على الرابط التالي لإعادة تعيين كلمة المرور:\n\n${resetLink}\n\nإذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.`,
  };

  try {
    await transporter.sendMail(mailOptions);  // إرسال البريد الإلكتروني
  } catch (error) {
    console.error('Error sending email:', error);  // طباعة الخطأ إذا حدث
    throw new Error('فشل إرسال البريد الإلكتروني');
  }
};

module.exports = { sendResetPasswordEmail };

