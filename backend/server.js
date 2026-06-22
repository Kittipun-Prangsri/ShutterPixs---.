require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const admin = require('firebase-admin');
const line = require('@line/bot-sdk');

const app = express();
const PORT = process.env.PORT || 3005;

// Enable CORS and Gzip compression
app.use(cors());
app.use(compression());

// Serve static files from the sibling frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize Firebase Admin (Firestore)
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let db = null;
let useFirebaseMock = true;

if (serviceAccountPath && serviceAccountPath.trim() !== '') {
  try {
    if (admin.apps.length === 0) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    db = admin.firestore();
    useFirebaseMock = false;
    console.log('✅ Firebase Admin (Firestore) initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin client:', error.message);
  }
} else {
  console.log('⚠️  Using In-Memory Fallback Database. Configure GOOGLE_APPLICATION_CREDENTIALS in .env to connect to your live database.');
}

// In-Memory Fallback Database
const mockBookings = [];
const mockPortfolios = [
  {
    id: "p1",
    title: "Eternal Love at The Glasshouse",
    category: "wedding",
    image_url: "assets/images/wedding_1.jpg",
    description: "Modern romantic garden wedding photoshoot featuring natural light and candid moments."
  },
  {
    id: "p2",
    title: "Traditional Thai Blessed Union",
    category: "wedding",
    image_url: "assets/images/wedding_2.jpg",
    description: "Elegant traditional Thai wedding ceremony capturing the exquisite details of Thai attire and sacred water pouring ritual."
  },
  {
    id: "p3",
    title: "Pristine Ordination Ceremony",
    category: "ordination",
    image_url: "assets/images/ordination_1.jpg",
    description: "Shaving ritual and serene ordination ceremony at the historic Wat Phra Kaew, capturing local cultural legacy."
  },
  {
    id: "p4",
    title: "Path to Enlightenment",
    category: "ordination",
    image_url: "assets/images/ordination_2.jpg",
    description: "The sacred moments of a monk walking around the chapel, surrounded by joyful family and friends."
  },
  {
    id: "p5",
    title: "Proud Achievements at Chulalongkorn",
    category: "graduation",
    image_url: "assets/images/graduation_1.jpg",
    description: "Joyful graduation outdoor portrait photoshoot with iconic campus backdrops and premium color grading."
  },
  {
    id: "p6",
    title: "Milestone Reached!",
    category: "graduation",
    image_url: "assets/images/graduation_2.jpg",
    description: "Group graduation photography capturing genuine smiles, mortarboard tosses, and bright memories with close friends."
  },
  {
    id: "p7",
    title: "Minimalist Studio Portraiture",
    category: "other",
    image_url: "assets/images/other_1.jpg",
    description: "High-end studio profile shoots highlighting personal branding, professional lighting, and editorial styles."
  },
  {
    id: "p8",
    title: "Sunset Beach Couple Session",
    category: "other",
    image_url: "assets/images/other_2.jpg",
    description: "Cinematic pre-wedding style couple photoshoot during the golden hour on the white sands of Phuket."
  }
];

// LINE Bot Configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

let lineClient = null;
let useLineMock = true;

if (lineConfig.channelAccessToken && lineConfig.channelSecret && !lineConfig.channelAccessToken.includes('placeholder')) {
  try {
    lineClient = new line.messagingApi.MessagingApiClient({ channelAccessToken: lineConfig.channelAccessToken });
    useLineMock = false;
    console.log('✅ LINE client initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize LINE client:', error.message);
  }
} else {
  console.log('⚠️  LINE features running in Demo mode. Configure LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET in .env for actual bot responses.');
}

// Set JSON parsers for standard routes
app.use(express.json());

// Register High-Performance CMS API routes for Images, Packages, and Bookings
const imageRoutes = require('./routes/imageRoutes');
const packageRoutes = require('./routes/packageRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api', imageRoutes);
app.use('/api', packageRoutes);
app.use('/api', bookingRoutes);

// API: Get Portfolios
app.get('/api/portfolios', async (req, res) => {
  const category = req.query.category;

  if (useFirebaseMock || !db) {
    let list = mockPortfolios;
    if (category) {
      list = mockPortfolios.filter(p => p.category === category);
    }
    return res.json(list);
  }

  try {
    let queryRef = db.collection('portfolios');
    if (category) {
      queryRef = queryRef.where('category', '==', category);
    }
    const snapshot = await queryRef.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    res.json(data);
  } catch (error) {
    console.error('Error fetching portfolios from Firestore:', error.message);
    // Graceful fallback to mock data
    let list = mockPortfolios;
    if (category) {
      list = mockPortfolios.filter(p => p.category === category);
    }
    res.json(list);
  }
});

// API: Create Booking
app.post('/api/bookings', async (req, res) => {
  const { customer_name, customer_phone, customer_line_id, event_type, event_date, package_name, total_price, details } = req.body;

  if (!customer_name || !customer_phone || !event_type || !event_date || !package_name || total_price === undefined) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  // Generate Booking ID: SP-YYYYMMDD-XXX
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dateStr = String(dateObj.getDate()).padStart(2, '0');
  const randNum = String(Math.floor(100 + Math.random() * 900));
  const bookingId = `SP-${year}${month}${dateStr}-${randNum}`;

  const newBooking = {
    id: bookingId,
    customer_name,
    customer_phone,
    customer_line_id: customer_line_id || null,
    event_type,
    event_date,
    package_name,
    total_price: Number(total_price),
    status: 'pending',
    details: details || '',
    created_at: new Date().toISOString()
  };

  if (useFirebaseMock || !db) {
    mockBookings.push(newBooking);
    console.log(`Saved mock booking: ${bookingId}. Total saved mock bookings: ${mockBookings.length}`);
    // Notify admin via LINE push (if LINE client is configured)
    await notifyAdminNewBooking(newBooking);
    return res.status(201).json(newBooking);
  }

  try {
    await db.collection('bookings').doc(bookingId).set(newBooking);
    console.log(`✅ Saved booking to Firestore: ${bookingId}`);
    // Notify admin via LINE push
    await notifyAdminNewBooking(newBooking);
    res.status(201).json(newBooking);
  } catch (error) {
    console.error('Error inserting booking into Firestore:', error.message);
    // Fallback to mock booking
    mockBookings.push(newBooking);
    console.log(`Fallback saved mock booking: ${bookingId}`);
    res.status(201).json(newBooking);
  }
});

// API: Get Booking Details
app.get('/api/bookings/:id', async (req, res) => {
  const bookingId = req.params.id;

  if (useFirebaseMock || !db) {
    const booking = mockBookings.find(b => b.id === bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    return res.json(booking);
  }

  try {
    const docRef = db.collection('bookings').doc(bookingId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      const booking = mockBookings.find(b => b.id === bookingId);
      if (booking) return res.json(booking);
      return res.status(404).json({ error: 'Booking not found.' });
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error('Error fetching booking details from Firestore:', error.message);
    res.status(404).json({ error: 'Booking not found.' });
  }
});

// Helper: Query Booking for LINE Bot (supports both Firestore and memory fallback)
async function findBookingById(bookingId) {
  if (useFirebaseMock || !db) {
    return mockBookings.find(b => b.id === bookingId);
  }
  try {
    const docRef = db.collection('bookings').doc(bookingId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return mockBookings.find(b => b.id === bookingId);
    }
    return { id: docSnap.id, ...docSnap.data() };
  } catch (err) {
    return mockBookings.find(b => b.id === bookingId);
  }
}

// Helper: Push booking notification to Admin LINE
async function notifyAdminNewBooking(booking) {
  const adminUserId = process.env.LINE_ADMIN_USER_ID;
  if (!lineClient || !adminUserId || useLineMock) return;

  const eventNames = {
    wedding: 'งานแต่งงาน (Wedding)',
    ordination: 'งานบวช (Ordination)',
    graduation: 'งานรับปริญญา (Graduation)',
    other: 'งานอื่นๆ (Other)'
  };

  try {
    await lineClient.pushMessage({
      to: adminUserId,
      messages: [
        {
          type: 'flex',
          altText: `📸 การจองใหม่! ${booking.id}`,
          contents: {
            type: 'bubble',
            styles: {
              header: { backgroundColor: '#111827' },
              body: { backgroundColor: '#1f2937' },
              footer: { backgroundColor: '#111827' }
            },
            header: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '📸 SHUTTERPIXS', weight: 'bold', color: '#e5e7eb', size: 'sm' },
                { type: 'text', text: '🔔 มีการจองใหม่!', weight: 'bold', color: '#fbbf24', size: 'xl', margin: 'xs' }
              ]
            },
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                { type: 'text', text: `รหัส: ${booking.id}`, color: '#9ca3af', size: 'xs', weight: 'bold' },
                { type: 'separator', margin: 'md', color: '#374151' },
                {
                  type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm',
                  contents: [
                    {
                      type: 'box', layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'ชื่อลูกค้า:', color: '#9ca3af', size: 'sm', flex: 3 },
                        { type: 'text', text: booking.customer_name, color: '#f3f4f6', size: 'sm', flex: 5, weight: 'bold', wrap: true }
                      ]
                    },
                    {
                      type: 'box', layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'เบอร์โทร:', color: '#9ca3af', size: 'sm', flex: 3 },
                        { type: 'text', text: booking.customer_phone, color: '#f3f4f6', size: 'sm', flex: 5 }
                      ]
                    },
                    {
                      type: 'box', layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'ประเภทงาน:', color: '#9ca3af', size: 'sm', flex: 3 },
                        { type: 'text', text: eventNames[booking.event_type] || booking.event_type, color: '#f3f4f6', size: 'sm', flex: 5, weight: 'bold', wrap: true }
                      ]
                    },
                    {
                      type: 'box', layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'วันที่จัดงาน:', color: '#9ca3af', size: 'sm', flex: 3 },
                        { type: 'text', text: booking.event_date, color: '#f3f4f6', size: 'sm', flex: 5 }
                      ]
                    },
                    {
                      type: 'box', layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'แพ็กเกจ:', color: '#9ca3af', size: 'sm', flex: 3 },
                        { type: 'text', text: booking.package_name, color: '#fbbf24', size: 'sm', flex: 5, weight: 'bold', wrap: true }
                      ]
                    },
                    {
                      type: 'box', layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'ราคารวม:', color: '#9ca3af', size: 'sm', flex: 3 },
                        { type: 'text', text: `฿${booking.total_price.toLocaleString('th-TH')}`, color: '#10b981', size: 'base', flex: 5, weight: 'bold' }
                      ]
                    }
                  ]
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'กรุณาติดต่อลูกค้าและล็อควันงานครับ 🙏',
                  color: '#d1d5db',
                  size: 'xs',
                  wrap: true,
                  align: 'center'
                }
              ]
            }
          }
        }
      ]
    });
    console.log(`📨 Admin notified via LINE for booking: ${booking.id}`);
  } catch (err) {
    console.error('❌ Failed to push admin LINE notification:', err.message);
  }
}

// LINE OA Webhook endpoint
app.post('/api/webhook/line', line.middleware({ channelSecret: lineConfig.channelSecret }), async (req, res) => {
  if (useLineMock) {
    console.log('Received Line Webhook (DEMO mode):', JSON.stringify(req.body, null, 2));
    return res.sendStatus(200);
  }

  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleLineEvent));
    res.json(results);
  } catch (err) {
    console.error('Line webhook error:', err);
    res.status(500).end();
  }
});

// Event Handler for LINE Messages
async function handleLineEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userText = event.message.text.trim();
  const replyToken = event.replyToken;

  // Pattern match for Booking ID, e.g. SP-20260622-001
  const bookingMatch = userText.match(/SP-\d{8}-\d{3}/i);

  if (bookingMatch) {
    const bookingId = bookingMatch[0].toUpperCase();
    const booking = await findBookingById(bookingId);

    if (booking) {
      const typeThaiMap = {
        wedding: 'งานแต่งงาน (Wedding)',
        ordination: 'งานบวช (Ordination)',
        graduation: 'งานรับปริญญา (Graduation)',
        other: 'งานอื่นๆ (Other events)'
      };

      const dateStr = new Date(booking.event_date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const flexMessage = {
        type: 'flex',
        altText: `ยืนยันการจอง ShutterPixs ${bookingId}`,
        contents: {
          type: 'bubble',
          styles: {
            header: { backgroundColor: '#111827' },
            body: { backgroundColor: '#1f2937' },
            footer: { backgroundColor: '#111827' }
          },
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '📸 SHUTTERPIXS', weight: 'bold', color: '#e5e7eb', size: 'sm', letterSpacing: '0.1em' },
              { type: 'text', text: 'ยืนยันรหัสการจอง', weight: 'bold', color: '#fbbf24', size: 'xl', margin: 'xs' }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: `รหัสอ้างอิง: ${booking.id}`, color: '#9ca3af', size: 'xs', weight: 'bold' },
              { type: 'separator', margin: 'md', color: '#374151' },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box', layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'ชื่อลูกค้า:', color: '#9ca3af', size: 'sm', flex: 2 },
                      { type: 'text', text: booking.customer_name, color: '#f3f4f6', size: 'sm', flex: 4, weight: 'bold' }
                    ]
                  },
                  {
                    type: 'box', layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'เบอร์โทร:', color: '#9ca3af', size: 'sm', flex: 2 },
                      { type: 'text', text: booking.customer_phone, color: '#f3f4f6', size: 'sm', flex: 4 }
                    ]
                  },
                  {
                    type: 'box', layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'ประเภทงาน:', color: '#9ca3af', size: 'sm', flex: 2 },
                      { type: 'text', text: typeThaiMap[booking.event_type] || booking.event_type, color: '#f3f4f6', size: 'sm', flex: 4, weight: 'bold' }
                    ]
                  },
                  {
                    type: 'box', layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'วันที่จัดงาน:', color: '#9ca3af', size: 'sm', flex: 2 },
                      { type: 'text', text: dateStr, color: '#f3f4f6', size: 'sm', flex: 4 }
                    ]
                  },
                  {
                    type: 'box', layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'แพ็กเกจ:', color: '#9ca3af', size: 'sm', flex: 2 },
                      { type: 'text', text: booking.package_name, color: '#fbbf24', size: 'sm', flex: 4, weight: 'bold' }
                    ]
                  },
                  {
                    type: 'box', layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'ราคารวม:', color: '#9ca3af', size: 'sm', flex: 2 },
                      { type: 'text', text: `฿${booking.total_price.toLocaleString('th-TH')}`, color: '#10b981', size: 'base', flex: 4, weight: 'bold' }
                    ]
                  },
                  {
                    type: 'box', layout: 'horizontal',
                    contents: [
                      { type: 'text', text: 'สถานะ:', color: '#9ca3af', size: 'sm', flex: 2 },
                      {
                        type: 'text',
                        text: booking.status === 'pending' ? 'รอเจ้าหน้าที่ตรวจสอบ' : 'ยืนยันสิทธิ์แล้ว',
                        color: booking.status === 'pending' ? '#f59e0b' : '#10b981',
                        size: 'sm',
                        flex: 4,
                        weight: 'bold'
                      }
                    ]
                  }
                ]
              },
              { type: 'separator', margin: 'md', color: '#374151' },
              {
                type: 'text',
                text: 'แอดมินได้รับข้อมูลแล้ว และจะติดต่อกลับผ่านแชทนี้โดยเร็วที่สุดครับ 🙏',
                color: '#d1d5db',
                size: 'xs',
                margin: 'md',
                wrap: true
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: 'ดูรายละเอียดบนหน้าเว็ป',
                  uri: `https://shutterpixs59.web.app`
                },
                style: 'primary',
                color: '#d97706'
              }
            ]
          }
        }
      };

      return lineClient.replyMessage({
        replyToken: replyToken,
        messages: [flexMessage]
      });
    } else {
      return lineClient.replyMessage({
        replyToken: replyToken,
        messages: [{
          type: 'text',
          text: `ขออภัยครับ ไม่พบข้อมูลการจองรหัส ${bookingId} ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง หรือทำรายการจองใหม่บนเว็ปไซต์หลักครับ 🙏`
        }]
      });
    }
  }

  // Default welcome response
  return lineClient.replyMessage({
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: 'สวัสดีครับ ยินดีต้อนรับสู่ ShutterPixs 📸✨\n\nหากคุณจองบริการบนเว็ปไซต์แล้ว กรุณาส่ง "รหัสการจอง" (เช่น: SP-20260622-123) เข้ามาในแชทนี้เพื่อยืนยันคิวได้เลยครับ!\n\nหรือเลือกดูแพ็กเกจของเราด้านล่างนี้เลย 👇'
      },
      {
        type: 'flex',
        altText: 'แพ็กเกจบริการจาก ShutterPixs',
        contents: {
          type: 'carousel',
          contents: [
            {
              type: 'bubble',
              hero: {
                type: 'image',
                url: 'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover'
              },
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: 'Wedding Ceremony', weight: 'bold', size: 'xl', color: '#F06292' },
                  { type: 'text', text: 'บริการถ่ายภาพงานแต่งงานและพรีเวดดิ้ง เก็บทุกโมเมนต์แห่งความรัก', size: 'sm', color: '#888888', wrap: true, margin: 'sm' },
                  { type: 'separator', margin: 'md', color: '#eeeeee' },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'box', layout: 'baseline', spacing: 'sm',
                        contents: [
                          { type: 'text', text: '✔', size: 'sm', flex: 1, color: '#F06292' },
                          { type: 'text', text: 'ช่างภาพหลัก / แคนดิด', wrap: true, color: '#444444', size: 'sm', flex: 7 }
                        ]
                      },
                      {
                        type: 'box', layout: 'baseline', spacing: 'sm',
                        contents: [
                          { type: 'text', text: '✔', size: 'sm', flex: 1, color: '#F06292' },
                          { type: 'text', text: 'ปรับโทนสีสวยงามทุกรูป', wrap: true, color: '#444444', size: 'sm', flex: 7 }
                        ]
                      }
                    ]
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    height: 'sm',
                    color: '#F06292',
                    action: {
                      type: 'uri',
                      label: 'ดูผลงาน / จองคิว',
                      uri: 'https://shutterpixs59.web.app/'
                    }
                  }
                ],
                flex: 0
              }
            },
            {
              type: 'bubble',
              hero: {
                type: 'image',
                url: 'https://images.unsplash.com/photo-1582650517303-052edb20c62b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover'
              },
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: 'Ordination Ceremony', weight: 'bold', size: 'xl', color: '#E67E22' },
                  { type: 'text', text: 'บริการถ่ายภาพงานอุปสมบท บันทึกภาพความทรงจำอันเป็นมงคล', size: 'sm', color: '#888888', wrap: true, margin: 'sm' },
                  { type: 'separator', margin: 'md', color: '#eeeeee' },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'box', layout: 'baseline', spacing: 'sm',
                        contents: [
                          { type: 'text', text: '✔', size: 'sm', flex: 1, color: '#E67E22' },
                          { type: 'text', text: 'ถ่ายภาพพิธีการครบถ้วน', wrap: true, color: '#444444', size: 'sm', flex: 7 }
                        ]
                      },
                      {
                        type: 'box', layout: 'baseline', spacing: 'sm',
                        contents: [
                          { type: 'text', text: '✔', size: 'sm', flex: 1, color: '#E67E22' },
                          { type: 'text', text: 'ส่งงานรวดเร็ว พร้อมกรอบรูป', wrap: true, color: '#444444', size: 'sm', flex: 7 }
                        ]
                      }
                    ]
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    height: 'sm',
                    color: '#E67E22',
                    action: {
                      type: 'uri',
                      label: 'ดูผลงาน / จองคิว',
                      uri: 'https://shutterpixs59.web.app/'
                    }
                  }
                ],
                flex: 0
              }
            },
            {
              type: 'bubble',
              hero: {
                type: 'image',
                url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover'
              },
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: 'Funeral Ceremony', weight: 'bold', size: 'xl', color: '#222222' },
                  { type: 'text', text: 'บริการถ่ายภาพงานฌาปนกิจ บันทึกภาพด้วยความสุภาพและสำรวม', size: 'sm', color: '#888888', wrap: true, margin: 'sm' },
                  { type: 'separator', margin: 'md', color: '#eeeeee' },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'box', layout: 'baseline', spacing: 'sm',
                        contents: [
                          { type: 'text', text: '✔', size: 'sm', flex: 1, color: '#222222' },
                          { type: 'text', text: 'ทีมงานมืออาชีพ แต่งกายสุภาพ', wrap: true, color: '#444444', size: 'sm', flex: 7 }
                        ]
                      },
                      {
                        type: 'box', layout: 'baseline', spacing: 'sm',
                        contents: [
                          { type: 'text', text: '✔', size: 'sm', flex: 1, color: '#222222' },
                          { type: 'text', text: 'ส่งมอบภาพถ่ายด้วยความรวดเร็ว', wrap: true, color: '#444444', size: 'sm', flex: 7 }
                        ]
                      }
                    ]
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    height: 'sm',
                    color: '#222222',
                    action: {
                      type: 'uri',
                      label: 'ดูผลงาน / จองคิว',
                      uri: 'https://shutterpixs59.web.app/'
                    }
                  }
                ],
                flex: 0
              }
            }
          ]
        }
      }
    ]
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 ShutterPixs Server is running on port ${PORT}`);
  console.log(`👉 Access Local Website: http://localhost:${PORT}`);
});
