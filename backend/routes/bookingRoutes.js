const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const adminAuth = require('../middlewares/auth');

// ==========================================
// เส้นทางสำหรับผู้บริหารระบบ (Admin CMS Endpoints - ถูกป้องกันด้วย Middleware)
// ==========================================

// ดึงรายการประวัติการจองคิวลูกค้าทั้งหมด
router.get('/admin/bookings', adminAuth, bookingController.getAllBookings);

// ปรับปรุงสถานะการจองคิวลูกค้า (เช่น เปลี่ยนจาก pending เป็น confirmed หรือ completed)
router.put('/admin/bookings/:id', adminAuth, bookingController.updateBookingStatus);

// ลบรายการจองคิวลูกค้า
router.delete('/admin/bookings/:id', adminAuth, bookingController.deleteBooking);

module.exports = router;
