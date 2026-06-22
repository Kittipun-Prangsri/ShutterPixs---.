const bookingService = require('../services/bookingService');

module.exports = {
  /**
   * ดึงรายการคิวการจองทั้งหมด (Admin Only)
   * GET /api/admin/bookings
   */
  getAllBookings: async (req, res) => {
    try {
      const list = await bookingService.getAllBookings();
      return res.status(200).json(list);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'ไม่สามารถดึงข้อมูลรายการจองทั้งหมดได้',
        details: error.message
      });
    }
  },

  /**
   * อัปเดตสถานะคิวการจอง (Admin Only)
   * PUT /api/admin/bookings/:id
   */
  updateBookingStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'จำเป็นต้องส่งค่าสถานะ (status) ใน request body'
        });
      }

      const result = await bookingService.updateBookingStatus(id, status);
      return res.status(200).json(result);
    } catch (error) {
      const status = error.message.includes('ไม่พบ') ? 404 : 500;
      return res.status(status).json({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message: error.message
      });
    }
  },

  /**
   * ลบรายการคิวการจอง (Admin Only)
   * DELETE /api/admin/bookings/:id
   */
  deleteBooking: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await bookingService.deleteBooking(id);
      return res.status(200).json(result);
    } catch (error) {
      const status = error.message.includes('ไม่พบ') ? 404 : 500;
      return res.status(status).json({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message: error.message
      });
    }
  }
};
