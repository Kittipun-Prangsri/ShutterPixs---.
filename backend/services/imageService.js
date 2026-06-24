const { db, bucket, useFirebaseMock } = require('../config/firebase');
const path = require('path');

// จำลองฐานข้อมูลภาพภายในหน่วยความจำ กรณีรันในโหมดจำลอง (Mock Mode)
let mockImages = [
  { id: 'img1', name: 'Wedding at Glasshouse 1', category: 'wedding', url: 'assets/images/wedding_1.jpg', description: 'Candid golden hour', created_at: new Date().toISOString() },
  { id: 'img2', name: 'Wedding at Glasshouse 2', category: 'wedding', url: 'assets/images/wedding_2.jpg', description: 'Traditional ceremony', created_at: new Date().toISOString() },
  { id: 'img3', name: 'Ordination Shaving', category: 'ordination', url: 'assets/images/ordination_1.jpg', description: 'Shaving head', created_at: new Date().toISOString() },
  { id: 'img4', name: 'Ordination Walk', category: 'ordination', url: 'assets/images/ordination_2.jpg', description: 'Procession around chapel', created_at: new Date().toISOString() }
];

module.exports = {
  /**
   * สร้าง Signed URL สำหรับอัปโหลดไฟล์ตรงไปที่ Firebase Storage จากฝั่ง Client
   * @param {string} fileName - ชื่อไฟล์ที่ต้องการบันทึก
   * @param {string} contentType - ชนิดของไฟล์ เช่น image/jpeg, image/png
   */
  generateUploadSignedUrl: async (fileName, contentType) => {
    // ป้องกันการแฮกชื่อไฟล์ให้เปลี่ยนโฟลเดอร์โดยไม่ได้รับอนุญาต
    const safeFileName = `portfolios/${Date.now()}_${path.basename(fileName)}`;

    if (useFirebaseMock || !bucket) {
      console.log('⚠️ [Mock Storage] Generating Mock Signed URL.');
      return {
        uploadUrl: `http://localhost:3005/api/mock-upload/${safeFileName}`,
        fileUrl: `http://localhost:3005/uploads/${safeFileName}`,
        fileName: safeFileName
      };
    }

    try {
      const fileRef = bucket.file(safeFileName);
      
      // ตัวเลือกการทำ Signed URL
      const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // ลิงก์มีอายุ 15 นาที
        contentType: contentType || 'image/jpeg'
      };

      const [url] = await fileRef.getSignedUrl(options);
      
      // ลิงก์ดาวน์โหลดรูปภาพสาธารณะหลังจากอัปโหลดเสร็จสิ้น
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${safeFileName}`;

      return {
        uploadUrl: url,
        fileUrl: publicUrl,
        fileName: safeFileName
      };
    } catch (error) {
      console.error('Error generating signed URL:', error.message);
      throw new Error(`ไม่สามารถสร้าง Signed URL ได้: ${error.message}`);
    }
  },

  /**
   * สร้างเอกสาร Metadata ของรูปภาพในคอลเลกชัน Firestore
   */
  createImageMetadata: async (data) => {
    const newMetadata = {
      name: data.name,
      title: data.name, // Save both for app.js template compatibility
      category: data.category || 'other',
      url: data.url,
      image_url: data.url, // Save both for app.js template compatibility
      description: data.description || '',
      created_at: new Date().toISOString()
    };

    if (useFirebaseMock || !db) {
      const id = 'img_' + Math.random().toString(36).substr(2, 9);
      const record = { id, ...newMetadata };
      mockImages.push(record);
      return record;
    }

    try {
      const docRef = await db.collection('portfolios').add(newMetadata);
      return { id: docRef.id, ...newMetadata };
    } catch (error) {
      console.error('Error creating image metadata in Firestore:', error.message);
      throw new Error(`ไม่สามารถบันทึกข้อมูลภาพลงในระบบได้: ${error.message}`);
    }
  },

  /**
   * ดึงรายการ Metadata รูปภาพแบบทำ Pagination
   * @param {number} limit - จำนวนข้อมูลที่ดึงต่อหน้า
   * @param {string} [startAfterId] - Document ID ตัวสุดท้ายของหน้าที่แล้ว (Cursor)
   * @param {string} [category] - กรองข้อมูลตามหมวดหมู่
   */
  getImageMetadataList: async (limit = 10, startAfterId = null, category = null) => {
    const limitNum = parseInt(limit, 10);

    if (useFirebaseMock || !db) {
      let filtered = [...mockImages];
      if (category) {
        filtered = filtered.filter(img => img.category === category);
      }
      
      let startIndex = 0;
      if (startAfterId) {
        startIndex = filtered.findIndex(img => img.id === startAfterId) + 1;
      }

      const paginated = filtered.slice(startIndex, startIndex + limitNum);
      const nextCursor = paginated.length > 0 ? paginated[paginated.length - 1].id : null;
      const hasMore = startIndex + limitNum < filtered.length;

      return {
        data: paginated,
        cursor: nextCursor,
        hasMore
      };
    }

    try {
      let queryRef = db.collection('portfolios').orderBy('created_at', 'desc');

      if (category) {
        queryRef = queryRef.where('category', '==', category);
      }

      // ตรวจสอบ Cursor สำหรับการทำ Pagination หน้าถัดไป
      if (startAfterId) {
        const startAfterDoc = await db.collection('portfolios').doc(startAfterId).get();
        if (startAfterDoc.exists) {
          queryRef = queryRef.startAfter(startAfterDoc);
        }
      }

      // ดึงข้อมูลเผื่อมา 1 รายการเพื่อตรวจสอบว่ามีหน้าถัดไป (hasMore) หรือไม่
      const snapshot = await queryRef.limit(limitNum + 1).get();
      
      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });

      const hasMore = results.length > limitNum;
      if (hasMore) {
        results.pop(); // ลบส่วนเกินที่ดึงเผื่อไว้ออก
      }

      const nextCursor = results.length > 0 ? results[results.length - 1].id : null;

      return {
        data: results,
        cursor: nextCursor,
        hasMore
      };
    } catch (error) {
      console.error('Error getting image metadata from Firestore:', error.message);
      throw new Error(`ไม่สามารถดึงข้อมูลรายการภาพได้: ${error.message}`);
    }
  },

  /**
   * ดึงข้อมูลภาพรายอัน
   */
  getImageMetadataById: async (id) => {
    if (useFirebaseMock || !db) {
      const record = mockImages.find(img => img.id === id);
      if (!record) throw new Error('ไม่พบข้อมูลรูปภาพที่ต้องการ');
      return record;
    }

    try {
      const doc = await db.collection('portfolios').doc(id).get();
      if (!doc.exists) {
        throw new Error('ไม่พบข้อมูลรูปภาพที่ต้องการ');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`ไม่สามารถค้นหาข้อมูลรูปภาพได้: ${error.message}`);
    }
  },

  /**
   * อัปเดตข้อมูล Metadata
   */
  updateImageMetadata: async (id, data) => {
    if (useFirebaseMock || !db) {
      const index = mockImages.findIndex(img => img.id === id);
      if (index === -1) throw new Error('ไม่พบข้อมูลรูปภาพที่ต้องการแก้ไข');
      
      const updateData = {
        name: data.name,
        title: data.name, // Update both for compatibility
        category: data.category,
        description: data.description,
        updated_at: new Date().toISOString()
      };
      if (data.url) {
        updateData.url = data.url;
        updateData.image_url = data.url;
      }
      mockImages[index] = { ...mockImages[index], ...updateData };
      return mockImages[index];
    }

    try {
      const docRef = db.collection('portfolios').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error('ไม่พบข้อมูลรูปภาพที่ต้องการแก้ไข');
      }
      
      const updateData = {
        name: data.name,
        title: data.name, // Update both for compatibility
        category: data.category,
        description: data.description,
        updated_at: new Date().toISOString()
      };
      if (data.url) {
        updateData.url = data.url;
        updateData.image_url = data.url;
      }
      
      await docRef.update(updateData);
      return { id, ...doc.data(), ...updateData };
    } catch (error) {
      throw new Error(`ไม่สามารถแก้ไขข้อมูลรูปภาพได้: ${error.message}`);
    }
  },

  /**
   * ลบข้อมูลภาพออกคอลเลกชัน
   */
  deleteImageMetadata: async (id) => {
    if (useFirebaseMock || !db) {
      const index = mockImages.findIndex(img => img.id === id);
      if (index === -1) throw new Error('ไม่พบข้อมูลรูปภาพที่ต้องการลบ');
      mockImages.splice(index, 1);
      return { success: true, id };
    }

    try {
      const docRef = db.collection('portfolios').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error('ไม่พบข้อมูลรูปภาพที่ต้องการลบ');
      }
      await docRef.delete();
      return { success: true, id };
    } catch (error) {
      throw new Error(`ไม่สามารถลบข้อมูลรูปภาพได้: ${error.message}`);
    }
  }
};
