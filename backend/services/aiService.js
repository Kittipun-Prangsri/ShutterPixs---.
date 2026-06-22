const { GoogleGenerativeAI } = require('@google/generative-ai');
const packageService = require('./packageService');

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY || process.env.FIREBASE_API_KEY;
let genAI = null;
let model = null;
let isGeminiEnabled = true;

if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    }, { apiVersion: "v1beta" });
    console.log("✅ Gemini AI Service initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize Gemini AI:", error.message);
  }
} else {
  console.log("⚠️ GEMINI_API_KEY or FIREBASE_API_KEY is missing. AI replies will run in offline simulation mode.");
}

/**
 * Generate AI Response for Line OA user
 * @param {string} userMessage - Message sent by the user
 * @returns {Promise<string>} AI generated response
 */
async function generateResponse(userMessage) {
  if (!model || !isGeminiEnabled) {
    // Fallback if API key is not configured or Gemini is disabled/blocked
    return simulateAIReply(userMessage);
  }

  try {
    // Get latest active packages to provide dynamic context
    const packages = await packageService.getActivePackages();
    const packageCtx = packages.map(p => {
      return `- แพ็กเกจ: ${p.name}\n  ราคา: ฿${p.price.toLocaleString('th-TH')}\n  รายละเอียด: ${p.description}${p.is_seasonal ? '\n  *โปรโมชั่นพิเศษตามฤดูกาล*' : ''}`;
    }).join('\n\n');

    const systemInstruction = "คุณคือบอทแอดมินอัจฉริยะ (AI Assistant) ของสตูดิโอถ่ายภาพ 'ShutterPixs (ชัตเตอร์พิกส์)' ทำหน้าที่คอยให้ข้อมูลลูกค้า สุภาพ เป็นกันเอง มีความกระตือรือร้นในการให้บริการ ตอบคำถามภาษาไทยที่เป็นธรรมชาติ กระชับ และไม่ยาวจนเกินไป\n\nคำแนะนำและข้อมูลธุรกิจ:\n1. ให้บริการถ่ายภาพพรีเมียม 4 ประเภทงานหลัก: งานแต่งงาน (Wedding), งานบวช (Ordination), งานรับปริญญา (Graduation), และงานอื่นๆ/Portrait (Other)\n2. มีระบบการจองบนหน้าเว็ปหลักที่ใช้งานง่าย: https://shutterpixs59.web.app\n3. ลูกค้าสามารถส่งรหัสการจองเข้ามาที่แชท Line OA นี้ เช่น 'SP-20260622-123' เพื่อให้แอดมินหรือระบบดึงข้อมูลใบจองแสดงขึ้นมาและล็อคคิวได้\n4. ตรวจสอบรายละเอียดแพ็กเกจและราคาก่อนตอบเสมอ (จะอยู่ในบริบทแวดล้อมที่ส่งให้)\n5. ห้ามสมมุติข้อมูลราคาหรือบริการอื่นนอกจากที่มีในแพ็กเกจ หากไม่มีข้อมูลแน่ชัด ให้แจ้งว่าจะส่งต่อเรื่องให้เจ้าหน้าที่แอดมินที่เป็นคนจริงมาติดต่อกลับทันทีผ่านแชทนี้\n6. เน้นให้ลูกค้าจองผ่านเว็ปไซต์หลักเป็นอันดับแรก";

    const prompt = `บทบาทและข้อกำหนดของคุณ (System Instruction):\n${systemInstruction}\n\nข้อความจากลูกค้า: "${userMessage}"\n\nข้อมูลแพ็กเกจถ่ายภาพปัจจุบัน:\n${packageCtx}\n\nกรุณาตอบกลับลูกค้าอย่างเป็นมิตร สุภาพ กระชับ เป็นภาษาไทย และปิดท้ายด้วยการชวนจองคิวบนเว็ปไซต์หากเหมาะสม`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating Gemini response:", error.message);
    
    // หากเกิดปัญหาเรื่องคีย์บล็อค หรือไม่พบโมเดล ให้ปิดการเรียกใช้จริงเพื่อหลีกเลี่ยงการติด Timeout ในครั้งถัดๆ ไป
    if (error.message.includes('API_KEY_SERVICE_BLOCKED') || 
        error.message.includes('PERMISSION_DENIED') || 
        error.message.includes('not found') ||
        error.message.includes('403') ||
        error.message.includes('404')) {
      isGeminiEnabled = false;
      console.log("⚠️ Gemini API calls disabled dynamically due to service block or model error. Switching to simulation fallback mode.");
    }
    
    return simulateAIReply(userMessage);
  }
}

/**
 * Simulate AI replies when Gemini is not configured or fails
 */
function simulateAIReply(message) {
  const text = message.toLowerCase();
  
  if (text.includes('แต่งงาน') || text.includes('wedding')) {
    return `สวัสดีครับ ยินดีด้วยกับคู่บ่าวสาวล่วงหน้าครับ! ShutterPixs เรามีแพ็กเกจถ่ายภาพงานแต่งงาน เช่น Wedding Standard ราคาเริ่มต้น 15,000 บาท (ถ่ายภาพ 4 ชม. ปรับแต่งโทนสีพรีเมียมทั้งหมด) หรือเช็คโปรโมชั่นฤดูกาลปัจจุบันได้ครับ สนใจจองคิวหรือดูภาพผลงานเพิ่มเติมได้ที่เว็ปไซต์ https://shutterpixs59.web.app หรือส่งรายละเอียดงานบ่าวสาวเพื่อให้คนทักหาได้เลยครับ ✨`;
  }
  
  if (text.includes('บวช') || text.includes('อุปสมบท')) {
    return `สวัสดีครับ ทาง ShutterPixs มีบริการถ่ายภาพงานบวชเพื่อเก็บภาพบรรยากาศช่วงเวลาสำคัญ ทั้งพิธีปลงผม พิธีแห่นาค และภายในโบสถ์แบบสำรวมและประณีตครับ คุณลูกค้าสามารถจองคิวล่วงหน้าเพื่อล็อคคิวช่างภาพผ่านเว็ปไซต์หลัก https://shutterpixs59.web.app ได้เลยครับ หรือสอบถามรายละเอียดเพิ่มเติมแชททิ้งไว้ได้เลยครับ 🙏`;
  }
  
  if (text.includes('รับปริญญา') || text.includes('เรียนจบ') || text.includes('จบ')) {
    return `ยินดีด้วยกับความสำเร็จด้วยครับ! ShutterPixs มีบริการถ่ายรูปรับปริญญา ทั้งแบบเดี่ยวและแบบกลุ่มนอกรอบ หรือถ่ายวันจริงในมหาวิทยาลัยครับ สนใจดูคิวว่างและราคาแพ็กเกจผ่านเว็ปไซต์ https://shutterpixs59.web.app ได้เลยครับ สะดวกรวดเร็วมากครับ 🎓`;
  }

  if (text.includes('แพ็กเกจ') || text.includes('ราคา') || text.includes('โปรโมชั่น')) {
    return `สำหรับแพ็กเกจถ่ายภาพของ ShutterPixs เราครอบคลุมหลายบริการ ทั้งงานแต่งงาน งานบวช และงานรับปริญญาครับ โดยสามารถตรวจสอบราคาแบบอัปเดตเรียลไทม์ พร้อมเลือกส่วนเสริม (Add-on) ได้ด้วยตนเองทางเว็ปไซต์ https://shutterpixs59.web.app ครับ คุ้มค่าและโปร่งใสแน่นอนครับ 📸`;
  }
  
  return `ขอบคุณที่ติดต่อ ShutterPixs ครับ 📸 ขณะนี้ได้รับข้อความเรียบร้อยแล้ว แอดมิน AI ขอแนะนำเว็ปไซต์หลักของเรา https://shutterpixs59.web.app เพื่อใช้ตรวจสอบราคาแพ็กเกจปัจจุบันและจองคิวแบบด่วนครับ หากคุณจองแล้วสามารถส่งรหัสเช่น SP-XXXXXXXX-XXX เพื่อยืนยันได้เลย หรือหากต้องการสอบถามเรื่องอื่นๆ เพิ่มเติม โปรดระบุรายละเอียดไว้ได้เลยครับ เจ้าหน้าที่แอดมินคนจริงจะมาตอบกลับเร็วที่สุดครับ ✨`;
}

module.exports = {
  generateResponse
};
