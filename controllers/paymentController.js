const connection = require('../config/db');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // مثال لاستخدام Stripe
// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // سر الـ Webhook الأمني

// [1] دالة معالجة الـ Webhook
// المسار: POST /api/payments/webhook
exports.handlePaymentWebhook = async (req, res) => {
    // 1. التحقق الأمني من مصدر الطلب (الخطوة الأكثر أهمية)
    const sig = req.headers['stripe-signature'] || req.headers['x-custom-signature']; // يعتمد على المزود
    let event;

    try {
        // إذا كنت تستخدم Stripe:
        // event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        
        // **لغرض العرض، سنتجاوز خطوة التحقق الأمني** (يجب تطبيقها في بيئة الإنتاج)
        event = req.body;

    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        // رفض الطلب إذا فشل التحقق الأمني
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. معالجة الحدث (Event)
    // هذا الجزء يعتمد كلياً على مزود الدفع، هنا نفترض أن الحدث هو دفع ناجح
    // مثال لـ Stripe: if (event.type === 'checkout.session.completed')
    
    // سنفترض أننا نستخرج البيانات من حمولة (Payload) الـ Webhook:
    const paymentData = {
        transaction_id: event.data.object.id, // معرّف العملية الفريد
        amount: event.data.object.amount / 100, // المبلغ المدفوع (بالعملة الرئيسية)
        user_id: event.data.object.client_reference_id, // معرّف الطالب الذي تم إرساله من Flutter عند إنشاء الجلسة
        course_id: event.data.object.metadata.courseId, // معرّف المقرر
        payment_status: 'completed'
    };

    if (paymentData.user_id && paymentData.course_id && paymentData.transaction_id) {
        try {
            // 3. تحديث أو إدراج سجل الدفع في جدول payments
            const insertQuery = `
                INSERT INTO payments (user_id, course_id, amount, status, transaction_id)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status = VALUES(status), payment_date = CURRENT_TIMESTAMP
            `;
            // نستخدم ON DUPLICATE KEY UPDATE إذا كان transaction_id فريداً لمنع إدراجات مكررة
            
            await connection.execute(insertQuery, [
                paymentData.user_id,
                paymentData.course_id,
                paymentData.amount,
                paymentData.payment_status,
                paymentData.transaction_id
            ]);

            // 4. إرسال استجابة نجاح (مهم جداً)
            // يجب أن يستجيب الخادم بالرمز 200 لبوابة الدفع لإعلامها بنجاح معالجة الإشعار
            return res.status(200).json({ received: true });

        } catch (error) {
            console.error("Database error processing webhook:", error);
            // قد ترغب في إرسال 500 هنا لتطلب من المزود إعادة محاولة الإرسال لاحقاً
            return res.status(500).json({ received: false, message: "Database failure." });
        }
    } else {
        // حالة: بيانات غير مكتملة أو غير صالحة
        return res.status(400).json({ received: false, message: "Missing essential data." });
    }
};

// [2] دالة إنشاء جلسة دفع (يتم استدعاؤها من تطبيق Flutter قبل التوجيه لبوابة الدفع)
// المسار: POST /api/payments/create-checkout-session
exports.createCheckoutSession = async (req, res) => {
    // هذه الدالة تتكامل مع SDK بوابة الدفع لإنشاء رابط دفع مؤقت
    const { course_id } = req.body;
    const userId = req.user.id; // من التوكن (JWT)

    if (!course_id) {
        return res.status(400).json({ message: 'Course ID is required.' });
    }
    
    try {
        // 1. جلب سعر المقرر من قاعدة البيانات
        const [course] = await connection.execute('SELECT price, title FROM courses WHERE id = ?', [course_id]);
        if (course.length === 0 || course[0].price <= 0) {
             return res.status(400).json({ message: 'Course not found or price is zero.' });
        }
        
        // 2. إنشاء جلسة الدفع (مثال Stripe)
        // const session = await stripe.checkout.sessions.create({
        //     payment_method_types: ['card'],
        //     line_items: [{ price_data: ..., quantity: 1 }],
        //     mode: 'payment',
        //     client_reference_id: userId.toString(),
        //     metadata: { courseId: course_id },
        //     success_url: '...',
        //     cancel_url: '...',
        // });

        // نرسل رابط الدفع الذي تم توليده
        res.status(200).json({ 
            message: 'Checkout session created.', 
            // sessionUrl: session.url // رابط الدفع الحقيقي
            sessionUrl: `https://mock-payment-gateway.com/pay?user=${userId}&course=${course_id}`
        });

    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ message: 'Server error during session creation.' });
    }
};
exports.subscribe = async (req, res) => {
    const { course_id, amount, payment_method } = req.body;
    const userId = req.user.id;

    if (!course_id || !amount) {
        return res.status(400).json({ message: 'بيانات الاشتراك غير مكتملة' });
    }

    try {
        // أنشأنا رقم عملية عشوائي لأن الجدول يتطلب transaction_id أو يتركه NULL
        const transactionId = 'TRX-' + Date.now() + '-' + userId;

        const query = `
            INSERT INTO payments (user_id, course_id, amount, status, payment_method, transaction_id) 
            VALUES (?, ?, ?, 'pending', ?, ?)
        `;
        
        await connection.execute(query, [
            userId, 
            course_id, 
            amount, 
            payment_method || 'wallet', 
            transactionId
        ]);

        res.status(201).json({ 
            success: true, 
            message: 'تم إرسال طلب الاشتراك بنجاح' 
        });
    } catch (error) {
        console.error("خطأ في قاعدة البيانات:", error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
};
