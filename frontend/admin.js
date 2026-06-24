// Client JS Controller for ShutterPixs Admin CMS Dashboard
const API_BASE = '/api';

// State management
let appToken = localStorage.getItem('shutterpixs_admin_token') || null;
let currentTab = 'dashboard';
let allBookingsList = [];
let allPackagesList = [];
let allPortfoliosList = [];
let galleryCursor = null;
let prevCursorsStack = []; // สำหรับบันทึก Cursor ของหน้าก่อนหน้า
let selectedImageFile = null;
let isOfflineMode = false;
let statsInterval = null;

// Mock Fallback Data
const fallbackPackages = [
  { id: "pkg1", name: "Bronze Package", price: 4900, description: "ช่างภาพหลัก 1 คน, 4 ชั่วโมง, ไฟล์รูปปรับโทนสีทั้งหมด, ส่งงาน 7-10 วัน", is_seasonal: false },
  { id: "pkg2", name: "Silver Package", price: 8900, description: "ช่างภาพ 2 คน (หลัก+แคนดิด), 6 ชั่วโมง, กล่องไม้พร้อมแฟลชไดรฟ์, ส่งงาน 5-7 วัน", is_seasonal: false },
  { id: "pkg3", name: "Gold Package", price: 14900, description: "ช่างภาพ 3 คน, 8 ชั่วโมง (เต็มวัน), บริการไฟสตูดิโอขนาดใหญ่หน้างาน, โฟโต้บุ๊คระดับพรีเมียม, ส่งงานด่วน 3 วัน", is_seasonal: false }
];

const fallbackBookings = [
  { id: "SP-20260622-789", customer_name: "คุณเกริกพล", customer_phone: "0812345678", event_type: "wedding", event_date: "2026-07-12", package_name: "Silver Package", total_price: 8900, status: "pending", created_at: "2026-06-22T04:22:00.000Z" },
  { id: "SP-20260622-456", customer_name: "คุณพรพิศ", customer_phone: "0898765432", event_type: "ordination", event_date: "2026-07-20", package_name: "Bronze Package", total_price: 4900, status: "confirmed", created_at: "2026-06-21T09:15:00.000Z" },
  { id: "SP-20260621-123", customer_name: "คุณกิตติทัต", customer_phone: "0855551234", event_type: "graduation", event_date: "2026-08-05", package_name: "Gold Package", total_price: 14900, status: "completed", created_at: "2026-06-20T14:30:00.000Z" }
];

const fallbackPortfolios = [
  { id: "p1", name: "Eternal Love at The Glasshouse", category: "wedding", url: "assets/images/wedding_1.jpg", description: "Modern romantic garden wedding photoshoot featuring natural light and candid moments." },
  { id: "p2", name: "Traditional Thai Blessed Union", category: "wedding", url: "assets/images/wedding_2.jpg", description: "Elegant traditional Thai wedding ceremony capturing the exquisite details of Thai attire and sacred water pouring ritual." },
  { id: "p3", name: "Pristine Ordination Ceremony", category: "ordination", url: "assets/images/ordination_1.jpg", description: "Shaving ritual and serene ordination ceremony at the historic Wat Phra Kaew, capturing local cultural legacy." },
  { id: "p4", name: "Path to Enlightenment", category: "ordination", url: "assets/images/ordination_2.jpg", description: "The sacred moments of a monk walking around the chapel, surrounded by joyful family and friends." },
  { id: "p5", name: "Proud Achievements at Chulalongkorn", category: "graduation", url: "assets/images/graduation_1.jpg", description: "Joyful graduation outdoor portrait photoshoot with iconic campus backdrops and premium color grading." },
  { id: "p6", name: "Milestone Reached!", category: "graduation", url: "assets/images/graduation_2.jpg", description: "Group graduation photography capturing genuine smiles, mortarboard tosses, and bright memories with close friends." },
  { id: "p7", name: "Minimalist Studio Portraiture", category: "other", url: "assets/images/other_1.jpg", description: "High-end studio profile shoots highlighting personal branding, professional lighting, and editorial styles." },
  { id: "p8", name: "Sunset Beach Couple Session", category: "other", url: "assets/images/other_2.jpg", description: "Cinematic pre-wedding style couple photoshoot during the golden hour on the white sands of Phuket." }
];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initApp();
    setupEventListeners();
});

function initApp() {
    if (appToken) {
        showAdminPanel();
    } else {
        showLoginPanel();
    }
}

function showLoginPanel() {
    document.getElementById('login-overlay').classList.remove('d-none');
    document.getElementById('admin-container').classList.add('d-none');
}

function getEmailFromToken(token) {
    if (!token || token === 'mock-admin-token') return 'admin@shutterpixs.com';
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload).email || 'admin@shutterpixs.com';
    } catch (e) {
        console.warn('Failed to parse email from JWT:', e);
        return 'admin@shutterpixs.com';
    }
}

function showAdminPanel() {
    document.getElementById('login-overlay').classList.add('d-none');
    document.getElementById('admin-container').classList.remove('d-none');
    
    const displayEmail = getEmailFromToken(appToken);
    document.getElementById('admin-user-email').textContent = appToken === 'mock-admin-token' ? `${displayEmail} (Mock)` : displayEmail;
    
    // ตั้งค่าสถานะ Indicator ความปลอดภัย
    const shieldIcon = document.querySelector('.badge-shield-icon');
    const indicatorDot = document.querySelector('.indicator-dot');
    const indicatorText = document.querySelector('.indicator-text');
    
    if (appToken === 'mock-admin-token') {
        shieldIcon.style.color = '#8b5cf6';
        indicatorDot.className = 'indicator-dot dot-green';
        indicatorText.textContent = 'ทำงานอยู่ในโหมดจำลอง (Mock Authorization)';
    } else {
        shieldIcon.style.color = '#10b981';
        indicatorDot.className = 'indicator-dot dot-green';
        indicatorDot.style.backgroundColor = '#10b981';
        indicatorText.textContent = 'เชื่อมต่อระบบความปลอดภัย Firebase Real-Time แล้ว';
    }

    // โหลดข้อมูลเข้าแดชบอร์ด
    loadDashboardStats();
    switchTab(currentTab);

    // เริ่มระบบตรวจสอบข้อมูลและแจ้งเตือนอัตโนมัติ (Polling) ทุกๆ 15 วินาที
    if (statsInterval) clearInterval(statsInterval);
    statsInterval = setInterval(() => {
        if (appToken) {
            loadDashboardStats();
            // รีโหลดตารางหากกำลังแสดงผลตารางคิวการจองอยู่ เพื่อให้เห็นอัปเดตแบบเรียลไทม์
            if (currentTab === 'bookings') {
                loadBookings();
            }
        }
    }, 15000);
}

// -------------------------------------------------------------
// สับเปลี่ยนหน้าต่างเมนู (Navigation System)
// -------------------------------------------------------------
function switchTab(tabId) {
    currentTab = tabId;
    
    // อัปเดต Sidebar Links
    document.querySelectorAll('.menu-link').forEach(link => {
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // อัปเดตหน้าต่าง Content Panels
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.getAttribute('id') === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // โหลดข้อมูลเฉพาะหน้าเมื่อกดเปลี่ยนหน้า
    if (tabId === 'dashboard') {
        loadDashboardStats();
    } else if (tabId === 'bookings') {
        loadBookings();
    } else if (tabId === 'packages') {
        loadPackages();
    } else if (tabId === 'portfolio-manager') {
        galleryCursor = null;
        prevCursorsStack = [];
        loadPortfolio();
    }
}

// -------------------------------------------------------------
// ตั้งค่า Event Listeners ทั้งหมด
// -------------------------------------------------------------
function setupEventListeners() {
    // โหมดธีม มืด/สว่าง
    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('shutterpixs_theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    // ฟอร์มเข้าสู่ระบบ
    document.getElementById('login-form').addEventListener('submit', handleFirebaseLogin);
    document.getElementById('btn-mock-login').addEventListener('click', handleMockLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Sidebar navigation
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const tab = link.getAttribute('data-tab');
            if (tab) {
                e.preventDefault();
                switchTab(tab);
            }
        });
    });

    // ค้นหาคิวจองคิว
    document.getElementById('booking-search').addEventListener('input', filterBookingsTable);
    document.getElementById('booking-status-filter').addEventListener('change', filterBookingsTable);

    // ฟอร์มแพ็กเกจ (เพิ่ม / แก้ไข)
    document.getElementById('pkg-is-seasonal').addEventListener('change', (e) => {
        const dateContainer = document.getElementById('seasonal-dates-container');
        if (e.target.checked) {
            dateContainer.classList.remove('d-none');
            document.getElementById('pkg-start-date').required = true;
            document.getElementById('pkg-end-date').required = true;
        } else {
            dateContainer.classList.add('d-none');
            document.getElementById('pkg-start-date').required = false;
            document.getElementById('pkg-end-date').required = false;
        }
    });

    document.getElementById('package-form').addEventListener('submit', savePackageData);
    document.getElementById('booking-form').addEventListener('submit', saveBookingData);
    document.getElementById('image-edit-form').addEventListener('submit', savePortfolioImageData);

    // การลากและวางอัปเดตรูปภาพ (Drag & Drop Zone)
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('image-file-input');

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    document.getElementById('btn-remove-preview').addEventListener('click', clearFileSelection);
    document.getElementById('upload-image-form').addEventListener('submit', handleImageUploadFlow);

    // กรองรูปภาพพอร์ตโฟลิโอและปุ่มแบ่งหน้า (Pagination)
    document.getElementById('gallery-category-filter').addEventListener('change', () => {
        galleryCursor = null;
        prevCursorsStack = [];
        loadPortfolio();
    });

    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (prevCursorsStack.length > 0) {
            // ดึง cursor ก่อนหน้าออกมา
            galleryCursor = prevCursorsStack.pop();
            loadPortfolio(true); // ระบุว่าเป็นการย้อนกลับ ไม่ต้องพุช cursor ลงสแต็กอีก
        }
    });

    document.getElementById('btn-next-page').addEventListener('click', () => {
        // next cursor ถูกจัดเก็บในปุ่มเรียบร้อยแล้ว
        const nextCursor = document.getElementById('btn-next-page').getAttribute('data-cursor');
        if (nextCursor) {
            prevCursorsStack.push(galleryCursor); // บันทึก cursor ปัจจุบันไว้สำหรับย้อนกลับ
            galleryCursor = nextCursor;
            loadPortfolio();
        }
    });

    // เริ่มต้นระบบจัดการ UI การแจ้งเตือน
    setupNotificationUI();
}

// -------------------------------------------------------------
// ระบบล็อกอิน (Authentication Logic)
// -------------------------------------------------------------
function handleMockLogin() {
    localStorage.setItem('shutterpixs_admin_token', 'mock-admin-token');
    appToken = 'mock-admin-token';
    showToast('เข้าสู่ระบบแบบจำลองสำเร็จ (Mock Mode)');
    showAdminPanel();
}

async function handleFirebaseLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบสิทธิ์...';

    try {
        if (!window.firebaseAuthInstance || !window.signInWithEmailAndPassword) {
            throw new Error('ระบบล็อกอิน Firebase ยังไม่ได้เริ่มต้น หรือโหลดไม่สำเร็จ');
        }

        // ล็อกอินระบบจริงของ Firebase Auth
        const userCredential = await window.signInWithEmailAndPassword(window.firebaseAuthInstance, email, password);
        const user = userCredential.user;
        
        // รับค่า ID Token จริง (JWT Token) ส่งให้หลังบ้านเพื่อตรวจสอบสิทธิ์
        const idToken = await user.getIdToken();
        
        localStorage.setItem('shutterpixs_admin_token', idToken);
        appToken = idToken;
        
        showToast('เข้าสู่ระบบด้วยบัญชี Firebase สำเร็จ');
        showAdminPanel();
    } catch (error) {
        console.error('Firebase Auth Error:', error);
        let errorMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือเกิดความผิดพลาดในการเข้าสู่ระบบ';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
        } else if (error.code === 'auth/too-many-requests') {
            errorMsg = 'ถูกระงับการเข้าสู่ระบบชั่วคราวเนื่องจากพยายามหลายครั้งเกินไป กรุณาลองใหม่ในภายหลัง';
        }
        showToast(errorMsg, true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function handleLogout() {
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }
    try {
        if (window.firebaseAuthInstance && window.firebaseSignOut) {
            await window.firebaseSignOut(window.firebaseAuthInstance);
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('shutterpixs_admin_token');
    appToken = null;
    currentTab = 'dashboard';
    showToast('ออกจากระบบเรียบร้อยแล้ว', true);
    showLoginPanel();
}

// -------------------------------------------------------------
// บริการดึงข้อมูลสถิติภาพรวม (Dashboard Overview Stats)
// -------------------------------------------------------------
async function loadDashboardStats() {
    try {
        const headers = { 'Authorization': `Bearer ${appToken}` };
        
        let bookings = [];
        let packages = [];
        
        try {
            // 1. ดึงคิวการจอง
            const bookingsRes = await fetch(`${API_BASE}/admin/bookings`, { headers });
            if (!bookingsRes.ok) throw new Error('API Error');
            const contentType = bookingsRes.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                bookings = await bookingsRes.json();
                isOfflineMode = false;
            } else {
                throw new Error('Not JSON');
            }
        } catch (e) {
            console.warn('Dashboard bookings API unreachable, using local fallback:', e.message);
            isOfflineMode = true;
            if (allBookingsList.length === 0) {
                allBookingsList = [...fallbackBookings];
            }
            bookings = allBookingsList;
        }

        try {
            // 2. ดึงจำนวนแพ็คเกจ
            const packagesRes = await fetch(`${API_BASE}/packages`);
            if (!packagesRes.ok) throw new Error('API Error');
            const contentType = packagesRes.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                packages = await packagesRes.json();
            } else {
                throw new Error('Not JSON');
            }
        } catch (e) {
            console.warn('Dashboard packages API unreachable, using local fallback:', e.message);
            if (allPackagesList.length === 0) {
                allPackagesList = [...fallbackPackages];
            }
            packages = allPackagesList;
        }

        allBookingsList = Array.isArray(bookings) ? bookings : [];
        
        // ตรวจสอบและแจ้งเตือนการจองคิวใหม่
        checkNewBookings(allBookingsList);

        const activePackagesCount = Array.isArray(packages) ? packages.length : 0;

        // คำนวณสถิติ
        const total = allBookingsList.length;
        const pending = allBookingsList.filter(b => b.status === 'pending').length;
        const confirmed = allBookingsList.filter(b => b.status === 'confirmed').length;

        // อัปเดต UI Stats
        document.getElementById('stat-total-bookings').textContent = total;
        document.getElementById('stat-pending-bookings').textContent = pending;
        document.getElementById('stat-confirmed-bookings').textContent = confirmed;
        document.getElementById('stat-active-packages').textContent = activePackagesCount;

        // อัปเดตคิวแจ้งเตือนสีแดงในเมนู Sidebar
        const pendingBadge = document.getElementById('pending-badge');
        if (pending > 0) {
            pendingBadge.textContent = pending;
            pendingBadge.classList.remove('d-none');
        } else {
            pendingBadge.classList.add('d-none');
        }

        // วาดรายการจองล่าสุด 5 รายการ
        renderRecentBookings();
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function renderRecentBookings() {
    const listContainer = document.getElementById('recent-bookings-list');
    listContainer.innerHTML = '';

    const sorted = [...allBookingsList]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    if (sorted.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="4" class="text-center">ไม่มีข้อมูลการจองคิวล่าสุด</td></tr>';
        return;
    }

    sorted.forEach(b => {
        const dateThai = new Date(b.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        const statusMap = {
            pending: '<span class="badge-status badge-pending">รอการยืนยัน</span>',
            confirmed: '<span class="badge-status badge-confirmed">ยืนยันคิวแล้ว</span>',
            completed: '<span class="badge-status badge-completed">งานเสร็จสิ้น</span>',
            cancelled: '<span class="badge-status badge-cancelled">ยกเลิกแล้ว</span>'
        };

        const row = `
            <tr>
                <td><b>${b.id}</b></td>
                <td>${b.customer_name}</td>
                <td>${dateThai}</td>
                <td>${statusMap[b.status] || b.status}</td>
            </tr>
        `;
        listContainer.innerHTML += row;
    });
}

// -------------------------------------------------------------
// จัดการคิวการจองของลูกค้า (Bookings Management)
// -------------------------------------------------------------
async function loadBookings() {
    try {
        let bookings = [];
        try {
            const res = await fetch(`${API_BASE}/admin/bookings`, {
                headers: { 'Authorization': `Bearer ${appToken}` }
            });
            if (!res.ok) throw new Error('API Error');
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                bookings = await res.json();
                isOfflineMode = false;
            } else {
                throw new Error('Not JSON');
            }
        } catch (e) {
            console.warn('Bookings API unreachable, using local fallback:', e.message);
            isOfflineMode = true;
            if (allBookingsList.length === 0) {
                allBookingsList = [...fallbackBookings];
            }
            bookings = allBookingsList;
        }
        allBookingsList = Array.isArray(bookings) ? bookings : [];
        renderBookingsTable(allBookingsList);
    } catch (error) {
        showToast('ไม่สามารถดึงข้อมูลการจองได้', true);
    }
}

function renderBookingsTable(list) {
    const tableBody = document.getElementById('full-bookings-list');
    tableBody.innerHTML = '';

    if (list.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">ไม่พบรายการนัดหมายช่างภาพที่ตรงตามคิวรี</td></tr>';
        return;
    }

    list.forEach(b => {
        const dateThai = new Date(b.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        const priceThai = Number(b.total_price).toLocaleString('th-TH') + ' บ.';
        
        const statusMap = {
            pending: '<span class="badge-status badge-pending">รอการยืนยัน</span>',
            confirmed: '<span class="badge-status badge-confirmed">ยืนยันคิวแล้ว</span>',
            completed: '<span class="badge-status badge-completed">งานเสร็จสิ้น</span>',
            cancelled: '<span class="badge-status badge-cancelled">ยกเลิกแล้ว</span>'
        };

        const eventTypeMap = {
            wedding: 'งานแต่งงาน',
            ordination: 'งานอุปสมบท',
            graduation: 'งานรับปริญญา',
            other: 'งานบุคคล/อื่นๆ'
        };

        // สร้างปุ่มแอกชั่นตามสถานะปัจจุบัน
        let actionButtons = '';
        if (b.status === 'pending') {
            actionButtons += `
                <button onclick="updateBookingStatus('${b.id}', 'confirmed')" class="btn-action btn-action-green" title="ยืนยันการรับงาน/มัดจำ">
                    <i class="fa-solid fa-check"></i>
                </button>
            `;
        } else if (b.status === 'confirmed') {
            actionButtons += `
                <button onclick="updateBookingStatus('${b.id}', 'completed')" class="btn-action btn-action-blue" title="ปรับเป็นงานเสร็จสิ้น">
                    <i class="fa-solid fa-flag-checkered"></i>
                </button>
            `;
        }
        
        actionButtons += `
            <button onclick="editBookingData('${b.id}')" class="btn-action btn-action-blue" title="แก้ไขข้อมูลการจองคิว">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="deleteBookingData('${b.id}')" class="btn-action btn-action-red" title="ลบข้อมูลการจองคิวนี้">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        const row = `
            <tr>
                <td><b>${b.id}</b></td>
                <td>${b.customer_name}</td>
                <td>${b.customer_phone}</td>
                <td>${eventTypeMap[b.event_type] || b.event_type}</td>
                <td>${dateThai}</td>
                <td>${b.package_name}</td>
                <td>${priceThai}</td>
                <td>${statusMap[b.status] || b.status}</td>
                <td class="actions-cell">${actionButtons}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function filterBookingsTable() {
    const searchText = document.getElementById('booking-search').value.toLowerCase();
    const statusFilter = document.getElementById('booking-status-filter').value;

    const filtered = allBookingsList.filter(b => {
        const matchesSearch = b.customer_name.toLowerCase().includes(searchText) || 
                              b.id.toLowerCase().includes(searchText) || 
                              b.customer_phone.includes(searchText);
                              
        const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    renderBookingsTable(filtered);
}

async function updateBookingStatus(id, newStatus) {
    if (!confirm(`ยืนยันการเปลี่ยนสถานะการจอง ${id} เป็น "${newStatus}" หรือไม่?`)) return;

    if (isOfflineMode) {
        const index = allBookingsList.findIndex(b => b.id === id);
        if (index !== -1) {
            allBookingsList[index].status = newStatus;
            showToast('อัปเดตสถานะการนัดหมายสำเร็จ (โหมดจำลองออฟไลน์)');
            loadBookings();
        } else {
            showToast('ไม่พบรหัสการจองนี้', true);
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/bookings/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${appToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            showToast('อัปเดตสถานะการนัดหมายสำเร็จ');
            loadBookings();
        } else {
            const err = await res.json();
            showToast(err.message || 'ไม่สามารถอัปเดตสถานะได้', true);
        }
    } catch (error) {
        const index = allBookingsList.findIndex(b => b.id === id);
        if (index !== -1) {
            allBookingsList[index].status = newStatus;
            showToast('อัปเดตสถานะการนัดหมายสำเร็จ (โหมดจำลองออฟไลน์)');
            loadBookings();
        } else {
            showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', true);
        }
    }
}

async function deleteBookingData(id) {
    if (!confirm(`⚠ คุณต้องการลบข้อมูลการจองรหัส ${id} ออกจากระบบถาวรหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

    if (isOfflineMode) {
        allBookingsList = allBookingsList.filter(b => b.id !== id);
        showToast('ลบรายการจองเรียบร้อยแล้ว (โหมดจำลองออฟไลน์)');
        loadBookings();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${appToken}` }
        });

        if (res.ok) {
            showToast('ลบรายการจองเรียบร้อยแล้ว');
            loadBookings();
        } else {
            const err = await res.json();
            showToast(err.message || 'ไม่สามารถลบรายการได้', true);
        }
    } catch (error) {
        allBookingsList = allBookingsList.filter(b => b.id !== id);
        showToast('ลบรายการจองเรียบร้อยแล้ว (โหมดจำลองออฟไลน์)');
        loadBookings();
    }
}

function closeBookingModal() {
    document.getElementById('booking-modal').classList.remove('active');
}

async function editBookingData(id) {
    const booking = allBookingsList.find(b => b.id === id);
    if (!booking) {
        showToast('ไม่พบข้อมูลการจองคิวนี้', true);
        return;
    }

    document.getElementById('booking-id-field').value = booking.id;
    document.getElementById('book-customer-name').value = booking.customer_name || '';
    document.getElementById('book-customer-phone').value = booking.customer_phone || '';
    document.getElementById('book-customer-line').value = booking.customer_line_id || '';
    document.getElementById('book-event-type').value = booking.event_type || 'wedding';
    
    // Format event date (YYYY-MM-DD)
    if (booking.event_date) {
        document.getElementById('book-event-date').value = booking.event_date.substring(0, 10);
    } else {
        document.getElementById('book-event-date').value = '';
    }
    
    document.getElementById('book-status').value = booking.status || 'pending';
    document.getElementById('book-package-name').value = booking.package_name || '';
    document.getElementById('book-total-price').value = booking.total_price || 0;
    document.getElementById('book-details').value = booking.details || '';

    document.getElementById('booking-modal-title').textContent = `แก้ไขข้อมูลการจองคิว: ${booking.id}`;
    document.getElementById('booking-modal').classList.add('active');
}

async function saveBookingData(e) {
    e.preventDefault();
    const id = document.getElementById('booking-id-field').value;
    
    const payload = {
        customer_name: document.getElementById('book-customer-name').value,
        customer_phone: document.getElementById('book-customer-phone').value,
        customer_line_id: document.getElementById('book-customer-line').value,
        event_type: document.getElementById('book-event-type').value,
        event_date: document.getElementById('book-event-date').value,
        status: document.getElementById('book-status').value,
        package_name: document.getElementById('book-package-name').value,
        total_price: Number(document.getElementById('book-total-price').value),
        details: document.getElementById('book-details').value
    };

    if (isOfflineMode) {
        const index = allBookingsList.findIndex(b => b.id === id);
        if (index !== -1) {
            allBookingsList[index] = { ...allBookingsList[index], ...payload };
            showToast('บันทึกการแก้ไขข้อมูลสำเร็จ (โหมดจำลองออฟไลน์)');
        } else {
            showToast('ไม่พบข้อมูลการจองคิว', true);
        }
        closeBookingModal();
        loadBookings();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/bookings/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${appToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('บันทึกการแก้ไขข้อมูลสำเร็จ');
            closeBookingModal();
            loadBookings();
        } else {
            const err = await res.json();
            showToast(err.message || 'ไม่สามารถแก้ไขข้อมูลได้', true);
        }
    } catch (error) {
        console.error('Save booking error:', error);
        // Fallback to offline editing
        const index = allBookingsList.findIndex(b => b.id === id);
        if (index !== -1) {
            allBookingsList[index] = { ...allBookingsList[index], ...payload };
            showToast('บันทึกการแก้ไขข้อมูลสำเร็จ (โหมดจำลองออฟไลน์)');
        }
        closeBookingModal();
        loadBookings();
    }
}

// -------------------------------------------------------------
// จัดการแพ็กเกจและแคมเปญ (Packages Management)
// -------------------------------------------------------------
async function loadPackages() {
    try {
        let packages = [];
        try {
            const res = await fetch(`${API_BASE}/admin/packages`, {
                headers: { 'Authorization': `Bearer ${appToken}` }
            });
            if (!res.ok) throw new Error('API Error');
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                packages = await res.json();
                isOfflineMode = false;
            } else {
                throw new Error('Not JSON');
            }
        } catch (e) {
            console.warn('Packages API unreachable, using local fallback:', e.message);
            isOfflineMode = true;
            if (allPackagesList.length === 0) {
                allPackagesList = [...fallbackPackages];
            }
            packages = allPackagesList;
        }
        allPackagesList = Array.isArray(packages) ? packages : [];
        renderPackagesTable(allPackagesList);
    } catch (error) {
        showToast('ไม่สามารถดึงข้อมูลคลังแพ็กเกจได้', true);
    }
}

function renderPackagesTable(list) {
    const tableBody = document.getElementById('admin-packages-list');
    tableBody.innerHTML = '';

    if (list.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบข้อมูลรายการแพ็กเกจช่างภาพ</td></tr>';
        return;
    }

    list.forEach(p => {
        const priceThai = Number(p.price).toLocaleString('th-TH') + ' บาท';
        const typeBadge = p.is_seasonal 
            ? '<span class="badge-status badge-seasonal-yes">แพ็กเกจฤดูกาล (Seasonal)</span>'
            : '<span class="badge-status badge-seasonal-no">ราคาปกติ (Regular)</span>';
            
        const startDate = p.start_date ? new Date(p.start_date).toLocaleDateString('th-TH') : '-';
        const endDate = p.end_date ? new Date(p.end_date).toLocaleDateString('th-TH') : '-';

        const row = `
            <tr>
                <td><b>${p.name}</b></td>
                <td>${p.description}</td>
                <td>${priceThai}</td>
                <td>${typeBadge}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td class="actions-cell">
                    <button onclick="editPackageData('${p.id}')" class="btn-action btn-action-blue" title="แก้ไขราคา/รายละเอียด">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deletePackageData('${p.id}')" class="btn-action btn-action-red" title="ลบข้อมูลแพ็กเกจนี้">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function openPackageModal() {
    document.getElementById('package-form').reset();
    document.getElementById('package-id-field').value = '';
    document.getElementById('package-modal-title').textContent = 'เพิ่มแพ็กเกจการจองคิวใหม่';
    document.getElementById('seasonal-dates-container').classList.add('d-none');
    
    document.getElementById('package-modal').classList.add('active');
}

function closePackageModal() {
    document.getElementById('package-modal').classList.remove('active');
}

async function editPackageData(id) {
    if (isOfflineMode) {
        const p = allPackagesList.find(item => item.id === id);
        if (p) {
            document.getElementById('package-id-field').value = p.id;
            document.getElementById('pkg-name').value = p.name;
            document.getElementById('pkg-price').value = p.price;
            document.getElementById('pkg-description').value = p.description;
            document.getElementById('pkg-is-seasonal').checked = !!p.is_seasonal;
            
            const dateContainer = document.getElementById('seasonal-dates-container');
            if (p.is_seasonal) {
                dateContainer.classList.remove('d-none');
                document.getElementById('pkg-start-date').value = p.start_date ? p.start_date.substring(0, 10) : '';
                document.getElementById('pkg-end-date').value = p.end_date ? p.end_date.substring(0, 10) : '';
                document.getElementById('pkg-start-date').required = true;
                document.getElementById('pkg-end-date').required = true;
            } else {
                dateContainer.classList.add('d-none');
                document.getElementById('pkg-start-date').required = false;
                document.getElementById('pkg-end-date').required = false;
            }

            document.getElementById('package-modal-title').textContent = 'แก้ไขรายละเอียดแพ็กเกจ';
            document.getElementById('package-modal').classList.add('active');
        } else {
            showToast('ไม่พบข้อมูลแพ็กเกจนี้', true);
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/packages/${id}`, {
            headers: { 'Authorization': `Bearer ${appToken}` }
        });
        const p = await res.json();
        
        document.getElementById('package-id-field').value = p.id;
        document.getElementById('pkg-name').value = p.name;
        document.getElementById('pkg-price').value = p.price;
        document.getElementById('pkg-description').value = p.description;
        document.getElementById('pkg-is-seasonal').checked = !!p.is_seasonal;
        
        const dateContainer = document.getElementById('seasonal-dates-container');
        if (p.is_seasonal) {
            dateContainer.classList.remove('d-none');
            document.getElementById('pkg-start-date').value = p.start_date ? p.start_date.substring(0, 10) : '';
            document.getElementById('pkg-end-date').value = p.end_date ? p.end_date.substring(0, 10) : '';
            document.getElementById('pkg-start-date').required = true;
            document.getElementById('pkg-end-date').required = true;
        } else {
            dateContainer.classList.add('d-none');
            document.getElementById('pkg-start-date').required = false;
            document.getElementById('pkg-end-date').required = false;
        }

        document.getElementById('package-modal-title').textContent = 'แก้ไขรายละเอียดแพ็กเกจ';
        document.getElementById('package-modal').classList.add('active');
    } catch (error) {
        showToast('ไม่สามารถดึงข้อมูลแพ็กเกจได้', true);
    }
}

async function savePackageData(e) {
    e.preventDefault();
    const id = document.getElementById('package-id-field').value;
    const name = document.getElementById('pkg-name').value;
    const price = document.getElementById('pkg-price').value;
    const description = document.getElementById('pkg-description').value;
    const is_seasonal = document.getElementById('pkg-is-seasonal').checked;
    
    const payload = {
        name,
        price: Number(price),
        description,
        is_seasonal,
        start_date: is_seasonal ? document.getElementById('pkg-start-date').value : null,
        end_date: is_seasonal ? document.getElementById('pkg-end-date').value : null
    };

    if (isOfflineMode) {
        if (id) {
            const index = allPackagesList.findIndex(item => item.id === id);
            if (index !== -1) {
                allPackagesList[index] = { ...allPackagesList[index], ...payload };
                showToast('บันทึกข้อมูลแพ็กเกจสำเร็จ (โหมดจำลองออฟไลน์)');
            }
        } else {
            const newId = `pkg${Date.now()}`;
            allPackagesList.push({ id: newId, ...payload });
            showToast('เพิ่มแพ็กเกจใหม่สำเร็จ (โหมดจำลองออฟไลน์)');
        }
        closePackageModal();
        loadPackages();
        return;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/admin/packages/${id}` : `${API_BASE}/admin/packages`;

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${appToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('บันทึกข้อมูลแพ็กเกจลงระบบคลังสำเร็จ (ล้างหน่วยความจำแคชแล้ว)');
            closePackageModal();
            loadPackages();
        } else {
            const err = await res.json();
            showToast(err.message || 'ไม่สามารถบันทึกแพ็กเกจได้', true);
        }
    } catch (error) {
        if (id) {
            const index = allPackagesList.findIndex(item => item.id === id);
            if (index !== -1) {
                allPackagesList[index] = { ...allPackagesList[index], ...payload };
                showToast('บันทึกข้อมูลแพ็กเกจสำเร็จ (โหมดจำลองออฟไลน์)');
            }
        } else {
            const newId = `pkg${Date.now()}`;
            allPackagesList.push({ id: newId, ...payload });
            showToast('เพิ่มแพ็กเกจใหม่สำเร็จ (โหมดจำลองออฟไลน์)');
        }
        closePackageModal();
        loadPackages();
    }
}

async function deletePackageData(id) {
    if (!confirm('ยืนยันที่จะลบแพ็กเกจนี้ออกจากคลังหรือไม่? (หน้ารวมลูกค้าจะรีเฟรชหน่วยความจำแคชทันที)')) return;

    if (isOfflineMode) {
        allPackagesList = allPackagesList.filter(item => item.id !== id);
        showToast('ลบแพ็กเกจออกจากระบบสำเร็จ (โหมดจำลองออฟไลน์)');
        loadPackages();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/packages/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${appToken}` }
        });

        if (res.ok) {
            showToast('ลบแพ็กเกจออกจากระบบสำเร็จ');
            loadPackages();
        } else {
            const err = await res.json();
            showToast(err.message || 'ไม่สามารถลบข้อมูลแพ็กเกจได้', true);
        }
    } catch (error) {
        allPackagesList = allPackagesList.filter(item => item.id !== id);
        showToast('ลบแพ็กเกจออกจากระบบสำเร็จ (โหมดจำลองออฟไลน์)');
        loadPackages();
    }
}

// -------------------------------------------------------------
// จัดการอัปโหลดพอร์ตโฟลิโอ Signed URL (Storage Bypass Upload Flow)
// -------------------------------------------------------------
function handleFileSelect(file) {
    if (!file) return;
    
    // ตรวจสอบขนาดไม่ให้เกิน 20MB
    if (file.size > 20 * 1024 * 1024) {
        showToast('ไฟล์ภาพมีขนาดใหญ่เกินกว่า 20MB', true);
        clearFileSelection();
        return;
    }

    selectedImageFile = file;
    document.getElementById('preview-file-name').textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    document.getElementById('file-info-preview').classList.remove('d-none');
    document.getElementById('upload-dropzone').classList.add('d-none');
    
    // ตั้งชื่อหัวข้อรูปภาพเริ่มต้น
    document.getElementById('image-name').value = file.name.split('.')[0].replace(/[-_]/g, ' ');
    document.getElementById('btn-submit-image').disabled = false;
}

function clearFileSelection() {
    selectedImageFile = null;
    document.getElementById('image-file-input').value = '';
    document.getElementById('file-info-preview').classList.add('d-none');
    document.getElementById('upload-dropzone').classList.remove('d-none');
    document.getElementById('btn-submit-image').disabled = true;
}

async function handleImageUploadFlow(e) {
    e.preventDefault();
    if (!selectedImageFile) return;

    const imageName = document.getElementById('image-name').value;
    const category = document.getElementById('image-category').value;
    const description = document.getElementById('image-description').value;
    const submitBtn = document.getElementById('btn-submit-image');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลดภาพ...';

    if (isOfflineMode) {
        // Local simulate file upload using temporary Object URL
        const localImageUrl = URL.createObjectURL(selectedImageFile);
        const newImg = {
            id: `img-${Date.now()}`,
            name: imageName,
            category,
            url: localImageUrl,
            description
        };
        if (allPortfoliosList.length === 0) {
            allPortfoliosList = [...fallbackPortfolios];
        }
        allPortfoliosList.unshift(newImg);
        showToast('อัปเดตผลงานรูปใหม่จำลองสำเร็จ (โหมดจำลองออฟไลน์)');
        clearFileSelection();
        document.getElementById('image-description').value = '';
        loadPortfolio();
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-arrow-up"></i> เริ่มอัปโหลดภาพด้วย Signed URL';
        return;
    }

    try {
        const fileName = selectedImageFile.name;
        const contentType = selectedImageFile.type;

        // ขั้นตอนที่ 1: ร้องขอ Signed URL จากเซิร์ฟเวอร์ Express (Bypass express upload)
        const signedUrlRes = await fetch(
            `${API_BASE}/admin/images/signed-url?fileName=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(contentType)}`,
            { headers: { 'Authorization': `Bearer ${appToken}` } }
        );

        if (!signedUrlRes.ok) {
            throw new Error('ไม่สามารถรับ Signed URL คลังจัดเก็บได้');
        }

        const { uploadUrl, fileUrl } = await signedUrlRes.json();

        // ขั้นตอนที่ 2: อัปโหลดรูปภาพตรงไปที่ Storage ปลายทาง (เช่น Firebase Storage) โดยใช้ Signed URL
        // หากอยู่ในโหมด Mock/จำลอง เซิร์ฟเวอร์จะอัปโหลดไปยัง Mock Endpoint ชั่วคราว
        const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType
            },
            body: selectedImageFile
        });

        if (!uploadRes.ok) {
            throw new Error('การส่งรูปภาพตรงไปยังคลังจัดเก็บไฟล์ (Storage) ล้มเหลว');
        }

        // ขั้นตอนที่ 3: ส่งข้อมูลไปเซฟเป็น Metadata ในฐานข้อมูล Firestore
        const metadataRes = await fetch(`${API_BASE}/admin/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: imageName,
                category,
                url: fileUrl,
                description
            })
        });

        if (metadataRes.ok) {
            showToast('อัปโหลดผลงานพอร์ตโฟลิโอเข้าระบบและแปลงภาพสำเร็จ');
            clearFileSelection();
            document.getElementById('image-description').value = '';
            loadPortfolio(); // รีโหลดแกลเลอรีภาพเพื่อแสดงรูปภาพใหม่ทันที
        } else {
            const err = await metadataRes.json();
            throw new Error(err.message || 'ไม่สามารถเซฟข้อมูลภาพลงในฐานข้อมูลได้');
        }

    } catch (error) {
        // Fallback to local
        const localImageUrl = URL.createObjectURL(selectedImageFile);
        const newImg = {
            id: `img-${Date.now()}`,
            name: imageName,
            category,
            url: localImageUrl,
            description
        };
        if (allPortfoliosList.length === 0) {
            allPortfoliosList = [...fallbackPortfolios];
        }
        allPortfoliosList.unshift(newImg);
        showToast('อัปเดตผลงานรูปใหม่จำลองสำเร็จ (โหมดจำลองออฟไลน์)');
        clearFileSelection();
        document.getElementById('image-description').value = '';
        loadPortfolio();
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-arrow-up"></i> เริ่มอัปโหลดภาพด้วย Signed URL';
    }
}

// -------------------------------------------------------------
// คลังภาพผลงานแบ่งหน้า (Portfolio Gallery System)
// -------------------------------------------------------------
async function loadPortfolio(isBack = false) {
    const galleryGrid = document.getElementById('admin-gallery-grid');
    const filterCat = document.getElementById('gallery-category-filter').value;
    
    galleryGrid.innerHTML = '<div class="text-center w-100" style="grid-column: 1/-1; padding: 50px 0;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    let url = `${API_BASE}/images?limit=8`;
    if (filterCat !== 'all') {
        url += `&category=${filterCat}`;
    }
    if (galleryCursor) {
        url += `&cursor=${galleryCursor}`;
    }

    try {
        let data = [];
        let cursor = null;
        let hasMore = false;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('API Error');
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const resJson = await res.json();
                data = resJson.data;
                cursor = resJson.cursor;
                hasMore = resJson.hasMore;
                isOfflineMode = false;
            } else {
                throw new Error('Not JSON');
            }
        } catch (e) {
            console.warn('Portfolio API unreachable, using local fallback:', e.message);
            isOfflineMode = true;
            if (allPortfoliosList.length === 0) {
                allPortfoliosList = [...fallbackPortfolios];
            }
            
            let filtered = allPortfoliosList;
            if (filterCat !== 'all') {
                filtered = allPortfoliosList.filter(img => img.category === filterCat);
            }
            
            data = filtered;
            cursor = null;
            hasMore = false;
        }
        
        renderPortfolioGrid(data);

        // จัดการเปิด/ปิดปุ่มแบ่งหน้า (Pagination)
        const prevBtn = document.getElementById('btn-prev-page');
        const nextBtn = document.getElementById('btn-next-page');

        // หากมี cursors ตกค้างใน Stack แสดงว่ามีหน้าก่อนหน้าให้ย้อนกลับ
        prevBtn.disabled = prevCursorsStack.length === 0;

        if (hasMore && cursor) {
            nextBtn.disabled = false;
            nextBtn.setAttribute('data-cursor', cursor);
        } else {
            nextBtn.disabled = true;
            nextBtn.removeAttribute('data-cursor');
        }

        // คำนวณหน้าปัจจุบัน
        const pageNum = prevCursorsStack.length + 1;
        document.getElementById('page-indicator').textContent = `หน้าที่ ${pageNum}`;
    } catch (error) {
        galleryGrid.innerHTML = '<div class="text-center w-100" style="grid-column: 1/-1; color: #ef4444;">ไม่สามารถโหลดข้อมูลคลังภาพได้</div>';
    }
}

function renderPortfolioGrid(list) {
    const galleryGrid = document.getElementById('admin-gallery-grid');
    galleryGrid.innerHTML = '';

    if (!list || list.length === 0) {
        galleryGrid.innerHTML = '<div class="text-center w-100" style="grid-column: 1/-1; padding: 50px 0; color: #6b7280;">ไม่มีผลงานพอร์ตโฟลิโอในโหมดนี้</div>';
        return;
    }

    const eventTypeMap = {
        wedding: 'งานแต่งงาน',
        ordination: 'งานอุปสมบท',
        graduation: 'งานรับปริญญา',
        other: 'พอร์ตโฟลิโออื่นๆ'
    };

    list.forEach(img => {
        const card = `
            <div class="gallery-img-card">
                <div class="img-thumbnail-container">
                    <img src="${img.url}" alt="${img.name}" onerror="this.src='https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=500&q=80'">
                    <span class="category-tag">${eventTypeMap[img.category] || img.category}</span>
                    <button class="btn-edit-img" onclick="editPortfolioImage('${img.id}')" title="แก้ไขภาพนี้">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-delete-img" onclick="deletePortfolioImage('${img.id}')" title="ลบภาพนี้">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div class="img-meta-info">
                    <h4>${img.name}</h4>
                    <p>${img.description || 'ไม่มีคำอธิบายภาพ'}</p>
                </div>
            </div>
        `;
        galleryGrid.innerHTML += card;
    });
}

async function deletePortfolioImage(id) {
    if (!confirm('ยืนยันที่จะลบรูปภาพนี้ออกจากแกลเลอรีหรือไม่? (ลบเฉพาะ metadata ในระบบทดลอง)')) return;

    if (isOfflineMode) {
        allPortfoliosList = allPortfoliosList.filter(img => img.id !== id);
        showToast('ลบรูปภาพออกจากแกลเลอรีสำเร็จ (โหมดจำลองออฟไลน์)');
        loadPortfolio();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/images/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${appToken}` }
        });

        if (res.ok) {
            showToast('ลบรูปภาพออกจากแกลเลอรีสำเร็จ');
            loadPortfolio(); // โหลดรูปภาพหน้านั้นๆ ใหม่
        } else {
            const err = await res.json();
            showToast(err.message || 'ไม่สามารถลบรูปภาพได้', true);
        }
    } catch (error) {
        allPortfoliosList = allPortfoliosList.filter(img => img.id !== id);
        showToast('ลบรูปภาพออกจากแกลเลอรีสำเร็จ (โหมดจำลองออฟไลน์)');
        loadPortfolio();
    }
}

function closeImageModal() {
    document.getElementById('image-modal').classList.remove('active');
}

async function editPortfolioImage(id) {
    let img = null;
    if (Array.isArray(allPortfoliosList) && allPortfoliosList.length > 0) {
        img = allPortfoliosList.find(item => item.id === id);
    }
    
    if (!img) {
        img = fallbackPortfolios.find(item => item.id === id);
    }
    
    if (!img) {
        showToast('ไม่พบข้อมูลรูปภาพที่ต้องการแก้ไข', true);
        return;
    }

    document.getElementById('image-id-field').value = img.id;
    document.getElementById('edit-image-name').value = img.name || img.title || '';
    document.getElementById('edit-image-category').value = img.category || 'wedding';
    document.getElementById('edit-image-description').value = img.description || '';
    
    // Set preview image and clear input file selector
    const previewEl = document.getElementById('edit-image-preview');
    if (previewEl) {
        previewEl.src = img.url || img.image_url || '';
    }
    const fileInputEl = document.getElementById('edit-image-file-input');
    if (fileInputEl) {
        fileInputEl.value = '';
    }

    document.getElementById('image-modal').classList.add('active');
}

async function savePortfolioImageData(e) {
    e.preventDefault();
    const id = document.getElementById('image-id-field').value;
    const name = document.getElementById('edit-image-name').value;
    const category = document.getElementById('edit-image-category').value;
    const description = document.getElementById('edit-image-description').value;

    const fileInputEl = document.getElementById('edit-image-file-input');
    const newFile = fileInputEl ? fileInputEl.files[0] : null;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกข้อมูล...';

    const payload = {
        name,
        category,
        description
    };

    try {
        if (newFile) {
            // Check size max 20MB
            if (newFile.size > 20 * 1024 * 1024) {
                showToast('ไฟล์ภาพมีขนาดใหญ่เกินกว่า 20MB', true);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            if (isOfflineMode) {
                payload.url = URL.createObjectURL(newFile);
            } else {
                // Upload flow using signed URL
                const signedUrlRes = await fetch(
                    `${API_BASE}/admin/images/signed-url?fileName=${encodeURIComponent(newFile.name)}&contentType=${encodeURIComponent(newFile.type)}`,
                    { headers: { 'Authorization': `Bearer ${appToken}` } }
                );

                if (!signedUrlRes.ok) {
                    throw new Error('ไม่สามารถรับ Signed URL คลังจัดเก็บได้');
                }

                const { uploadUrl, fileUrl } = await signedUrlRes.json();

                // Put file to storage
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': newFile.type
                    },
                    body: newFile
                });

                if (!uploadRes.ok) {
                    throw new Error('การอัปโหลดไฟล์ใหม่ตรงไปยังคลังจัดเก็บ (Storage) ล้มเหลว');
                }

                payload.url = fileUrl;
            }
        }

        if (isOfflineMode) {
            const index = allPortfoliosList.findIndex(item => item.id === id);
            if (index !== -1) {
                allPortfoliosList[index] = { 
                    ...allPortfoliosList[index], 
                    name, 
                    title: name, 
                    category, 
                    description 
                };
                if (payload.url) {
                    allPortfoliosList[index].url = payload.url;
                    allPortfoliosList[index].image_url = payload.url;
                }
                showToast('แก้ไขข้อมูลภาพพอร์ตโฟลิโอสำเร็จ (โหมดจำลองออฟไลน์)');
            }
            closeImageModal();
            loadPortfolio();
            return;
        }

        const res = await fetch(`${API_BASE}/admin/images/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${appToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('แก้ไขข้อมูลและรูปภาพพอร์ตโฟลิโอสำเร็จ');
            closeImageModal();
            loadPortfolio();
        } else {
            const err = await res.json();
            showToast(err.message || 'ไม่สามารถแก้ไขข้อมูลรูปภาพได้', true);
        }
    } catch (error) {
        console.error('Save portfolio image error:', error);
        // Fallback
        const index = allPortfoliosList.findIndex(item => item.id === id);
        if (index !== -1) {
            allPortfoliosList[index] = { 
                ...allPortfoliosList[index], 
                name, 
                title: name, 
                category, 
                description 
            };
            if (payload.url) {
                allPortfoliosList[index].url = payload.url;
                allPortfoliosList[index].image_url = payload.url;
            }
            showToast('แก้ไขข้อมูลภาพพอร์ตโฟลิโอสำเร็จ (โหมดจำลองออฟไลน์)');
        }
        closeImageModal();
        loadPortfolio();
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}


// -------------------------------------------------------------
// ส่วนแจ้งเตือนแบบป็อปอัพ (Toast Notifications Helper)
// -------------------------------------------------------------
function showToast(message, isError = false) {
    const toast = document.getElementById('toast-notification');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-message');

    msg.textContent = message;
    
    if (isError) {
        toast.classList.add('error');
        icon.className = 'fa-solid fa-circle-xmark';
    } else {
        toast.classList.remove('error');
        icon.className = 'fa-solid fa-circle-check';
    }

    toast.classList.add('active');

    // ซ่อนข้อความหลังจากผ่านไป 4.5 วินาที
    setTimeout(() => {
        toast.classList.remove('active');
    }, 4500);
}

// -------------------------------------------------------------
// ระบบจัดการแจ้งเตือนแบบเรียลไทม์ (Real-Time Notification System)
// -------------------------------------------------------------

function checkNewBookings(incomingBookings) {
    if (!appToken) return; // ทำงานเฉพาะเมื่อแอดมินเข้าสู่ระบบแล้วเท่านั้น
    
    const seenBookings = JSON.parse(localStorage.getItem('shutterpixs_seen_bookings')) || [];
    const initialized = localStorage.getItem('shutterpixs_noti_init');
    
    const isFirstLoad = !initialized;
    const newBookingsFound = [];
    
    incomingBookings.forEach(booking => {
        const isSeen = seenBookings.includes(booking.id);
        if (!isSeen) {
            // หากเป็นการโหลดครั้งแรกของเบราว์เซอร์ ให้คัดกรองเฉพาะสถานะ pending เก็บไว้เป็นแจ้งเตือนใหม่
            // นอกเหนือจากนั้น (เช่น confirmed/completed/cancelled) ให้ทำเครื่องหมายว่าเห็นแล้วโดยอัตโนมัติ
            if (!isFirstLoad || booking.status === 'pending') {
                newBookingsFound.push(booking);
            } else {
                seenBookings.push(booking.id);
            }
        }
    });
    
    if (isFirstLoad) {
        localStorage.setItem('shutterpixs_noti_init', 'true');
        localStorage.setItem('shutterpixs_seen_bookings', JSON.stringify(seenBookings));
    }
    
    // หากตรวจสอบพบรายการจองใหม่และไม่ใช่การเข้าสู่ระบบครั้งแรกสุด ให้เล่นเสียงเตือนและแสดง Toast
    if (newBookingsFound.length > 0 && !isFirstLoad) {
        // เล่นเสียงแจ้งเตือนแบบสังเคราะห์ (Web Audio API Chime)
        playNotificationSound();
        
        // แสดงป๊อปอัพแจ้งเตือนรายการใหม่
        newBookingsFound.forEach((b, index) => {
            if (index < 3) { // ป้องกันหน้าต่างป๊อปอัพเด้งซ้อนรบกวนมากเกินไป
                const eventTypesThai = {
                    wedding: 'งานแต่งงาน',
                    ordination: 'งานอุปสมบท',
                    graduation: 'งานรับปริญญา',
                    other: 'งานบุคคล/อื่นๆ'
                };
                const typeText = eventTypesThai[b.event_type] || b.event_type;
                showToast(`🔔 มีการจองใหม่: คุณ ${b.customer_name} (${typeText})`);
            }
        });
    }
    
    // อัปเดตรายการในหน้าต่างแจ้งเตือน (Dropdown List)
    updateNotificationDropdown(incomingBookings, seenBookings);
}

function updateNotificationDropdown(incomingBookings, seenBookings) {
    const listContainer = document.getElementById('notification-items-list');
    const badge = document.getElementById('notification-badge');
    
    if (!listContainer || !badge) return;
    
    // คัดเลือกรายการที่ยังไม่ได้อ่าน (ไม่ได้อยู่ในรายการ seenBookings)
    const unreadBookings = incomingBookings.filter(b => !seenBookings.includes(b.id));
    
    // อัปเดตตัวเลขแจ้งเตือนสีแดง (Notification Badge)
    if (unreadBookings.length > 0) {
        badge.textContent = unreadBookings.length;
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
    
    // กรณีไม่มีการแจ้งเตือนตกค้าง
    if (unreadBookings.length === 0) {
        listContainer.innerHTML = `
            <div class="no-notifications">
                <i class="fa-solid fa-bell-slash"></i>
                <p>ไม่มีการแจ้งเตือนใหม่</p>
            </div>
        `;
        return;
    }
    
    const eventTypeMap = {
        wedding: 'งานแต่งงาน',
        ordination: 'งานอุปสมบท',
        graduation: 'งานรับปริญญา',
        other: 'งานอื่นๆ/Portrait'
    };
    
    const iconMap = {
        wedding: 'fa-heart',
        ordination: 'fa-dharmachakra',
        graduation: 'fa-graduation-cap',
        other: 'fa-camera'
    };
    
    listContainer.innerHTML = '';
    
    // แสดงรายการแจ้งเตือนล่าสุด
    unreadBookings.forEach(b => {
        const dateObj = new Date(b.created_at || Date.now());
        const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + 
                        ' ' + dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        
        const itemHtml = `
            <div class="notification-item unread" onclick="handleNotificationClick('${b.id}')">
                <div class="noti-icon ${b.event_type}">
                    <i class="fa-solid ${iconMap[b.event_type] || 'fa-bell'}"></i>
                </div>
                <div class="noti-content">
                    <h5 class="noti-title">คุณ ${b.customer_name}</h5>
                    <p class="noti-desc">จองคิว${eventTypeMap[b.event_type] || b.event_type} (${b.package_name})</p>
                    <span class="noti-time"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
                </div>
            </div>
        `;
        listContainer.innerHTML += itemHtml;
    });
}

function handleNotificationClick(id) {
    // 1. ทำเครื่องหมายรายการนี้ว่าอ่านแล้ว
    const seenBookings = JSON.parse(localStorage.getItem('shutterpixs_seen_bookings')) || [];
    if (!seenBookings.includes(id)) {
        seenBookings.push(id);
        localStorage.setItem('shutterpixs_seen_bookings', JSON.stringify(seenBookings));
    }
    
    // 2. รีเฟรชข้อมูลใน Dashboard และ Dropdown
    loadDashboardStats();
    
    // 3. สวิตช์ไปที่หน้าจัดการการจองคิว
    switchTab('bookings');
    
    // 4. พิมพ์รหัสการจองในช่องค้นหาเพื่อกรองข้อมูลและขยายรายละเอียดทันที
    const searchInput = document.getElementById('booking-search');
    const statusFilter = document.getElementById('booking-status-filter');
    
    if (searchInput && statusFilter) {
        searchInput.value = id;
        statusFilter.value = 'all'; // กรองสถานะทั้งหมดเพื่อความถูกต้อง
        filterBookingsTable();
    }
    
    // 5. ปิดหน้าต่าง Dropdown ลง
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.classList.remove('active');
}

function clearAllNotifications() {
    const seenBookings = JSON.parse(localStorage.getItem('shutterpixs_seen_bookings')) || [];
    
    // บันทึกรหัสการจองทั้งหมดลงรายการเห็นแล้วเพื่อเคลียร์กล่องแจ้งเตือน
    allBookingsList.forEach(b => {
        if (!seenBookings.includes(b.id)) {
            seenBookings.push(b.id);
        }
    });
    
    localStorage.setItem('shutterpixs_seen_bookings', JSON.stringify(seenBookings));
    loadDashboardStats();
    showToast('อ่านการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว');
}

function setupNotificationUI() {
    const bellBtn = document.getElementById('btn-notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    const clearBtn = document.getElementById('btn-clear-notifications');
    
    if (bellBtn && dropdown) {
        // กดกระดิ่งเพื่อเปิด/ปิดหน้าต่างแจ้งเตือน
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        
        // ปิดหน้าต่างเมื่อกดพื้นที่ข้างนอก
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearAllNotifications();
        });
    }
}

/**
 * เล่นเสียงแจ้งเตือนสไตล์พรีเมียม (Double Chime Bell) ด้วย Web Audio API สังเคราะห์ความถี่คลื่นเสียงขึ้นมาโดยตรง
 */
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // ตรวจสอบนโยบาย Autoplay ของเบราว์เซอร์ หากยังไม่มีการโต้ตอบจากผู้ใช้ ให้ยกเลิกการเล่นเสียงเพื่อป้องกันแจ้งเตือนสีแดงในคอนโซล
        if (audioCtx.state === 'suspended') {
            audioCtx.close();
            return;
        }
        
        // โน้ตตัวแรก (E5)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.35);
        
        // โน้ตตัวสอง (A5) เล่นตามมาหลังจากผ่านไป 130 มิลลิวินาที
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5
            gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.5);
        }, 130);
    } catch (e) {
        console.warn('Audio Context not allowed or supported by this browser:', e);
    }
}

// Expose handleNotificationClick to global window object
window.handleNotificationClick = handleNotificationClick;

// -------------------------------------------------------------
// ฟังก์ชันจัดการโหมดมืด/สว่าง (Theme Switcher Utilities)
// -------------------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('shutterpixs_theme');
    const toggleBtn = document.getElementById('btn-theme-toggle');
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else {
        // ค่าเริ่มต้นตามการตั้งค่าของระบบปฏิบัติการ (OS Theme preference)
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentTheme = systemPrefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateThemeIcon(currentTheme);
    }

    // ตรวจจับการเปลี่ยนแปลงธีมของระบบในแบบเรียลไทม์
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('shutterpixs_theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });
}

function updateThemeIcon(theme) {
    const toggleBtn = document.getElementById('btn-theme-toggle');
    if (!toggleBtn) return;
    const icon = toggleBtn.querySelector('i');
    if (!icon) return;
    
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
        toggleBtn.title = 'สลับโหมดเป็นสว่าง (Switch to Light Mode)';
    } else {
        icon.className = 'fa-solid fa-moon';
        toggleBtn.title = 'สลับโหมดเป็นมืด (Switch to Dark Mode)';
    }
}
