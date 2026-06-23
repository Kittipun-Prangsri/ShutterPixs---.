document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    // Navigation Nodes
    const navbar = document.querySelector('.navbar');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Portfolio Nodes
    const tabButtons = document.querySelectorAll('.tab-btn');
    const portfolioGrid = document.getElementById('portfolio-grid');
    
    // Booking Form & Estimator Nodes
    const bookingForm = document.getElementById('booking-form');
    const customerNameInput = document.getElementById('customer_name');
    const customerPhoneInput = document.getElementById('customer_phone');
    const customerLineInput = document.getElementById('customer_line_id');
    const eventDateInput = document.getElementById('event_date');
    const eventTypeSelect = document.getElementById('event_type');
    const packageSelect = document.getElementById('package_select');
    const addonCheckboxes = document.querySelectorAll('.addon-checkbox');
    
    // Estimator Summary Labels
    const summaryEventType = document.getElementById('summary-event-type');
    const summaryPackage = document.getElementById('summary-package');
    const summaryPackagePrice = document.getElementById('summary-package-price');
    const summaryAddonsList = document.getElementById('summary-addons-list');
    const summaryTotalPrice = document.getElementById('summary-total-price');
    
    // Select Package Buttons (inside package cards)
    const selectPkgButtons = document.querySelectorAll('.select-pkg-btn');
    
    // Modal Nodes
    const bookingModal = document.getElementById('booking-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const bookingTicketContent = document.getElementById('booking-ticket-content');
    const copyTicketBtn = document.getElementById('copy-ticket-btn');
    const modalLineBtn = document.getElementById('modal-line-btn');
    
    // Footer Links Filter
    const footerFilterLinks = document.querySelectorAll('.filter-link');

    // Theme Switcher Toggle Click Event
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

    // -------------------------------------------------------------
    // 1. Mobile Menu Toggle
    // -------------------------------------------------------------
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
            const icon = mobileToggle.querySelector('i');
            if (navMenu.classList.contains('open')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });
    }

    // Close menu when clicking links
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            const icon = mobileToggle.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-bars';
            
            // Set active nav link style
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Change nav style on scroll + show/hide scroll FAB
    const scrollNavFab = document.getElementById('scroll-nav-fab');
    const btnScrollTop = document.getElementById('btn-scroll-top');
    const btnScrollFooter = document.getElementById('btn-scroll-footer');
    const pageFooter = document.querySelector('footer');

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;

        // Navbar compact style
        if (scrolled > 50) {
            navbar.style.padding = '0.5rem 0';
            navbar.classList.add('scrolled');
        } else {
            navbar.style.padding = '0';
            navbar.classList.remove('scrolled');
        }

        // Show FAB after user scrolls 200px
        if (scrollNavFab) {
            if (scrolled > 200) {
                scrollNavFab.classList.add('visible');
            } else {
                scrollNavFab.classList.remove('visible');
            }
        }
    });

    // Scroll to top
    if (btnScrollTop) {
        btnScrollTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Scroll to footer
    if (btnScrollFooter && pageFooter) {
        btnScrollFooter.addEventListener('click', () => {
            pageFooter.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Set today as minimum date for booking
    if (eventDateInput) {
        const today = new Date().toISOString().split('T')[0];
        eventDateInput.min = today;
    }

    // -------------------------------------------------------------
    // 2. Fetch & Render Portfolios
    // -------------------------------------------------------------
    let allPortfolios = [];

    const fallbackPortfolios = [
      { id: "p1", title: "Eternal Love at The Glasshouse", category: "wedding", image_url: "assets/images/wedding_1.jpg", description: "Modern romantic garden wedding photoshoot featuring natural light and candid moments." },
      { id: "p2", title: "Traditional Thai Blessed Union", category: "wedding", image_url: "assets/images/wedding_2.jpg", description: "Elegant traditional Thai wedding ceremony capturing the exquisite details of Thai attire and sacred water pouring ritual." },
      { id: "p3", title: "Pristine Ordination Ceremony", category: "ordination", image_url: "assets/images/ordination_1.jpg", description: "Shaving ritual and serene ordination ceremony at the historic Wat Phra Kaew, capturing local cultural legacy." },
      { id: "p4", title: "Path to Enlightenment", category: "ordination", image_url: "assets/images/ordination_2.jpg", description: "The sacred moments of a monk walking around the chapel, surrounded by joyful family and friends." },
      { id: "p5", title: "Proud Achievements at Chulalongkorn", category: "graduation", image_url: "assets/images/graduation_1.jpg", description: "Joyful graduation outdoor portrait photoshoot with iconic campus backdrops and premium color grading." },
      { id: "p6", title: "Milestone Reached!", category: "graduation", image_url: "assets/images/graduation_2.jpg", description: "Group graduation photography capturing genuine smiles, mortarboard tosses, and bright memories with close friends." },
      { id: "p7", title: "Minimalist Studio Portraiture", category: "other", image_url: "assets/images/other_1.jpg", description: "High-end studio profile shoots highlighting personal branding, professional lighting, and editorial styles." },
      { id: "p8", title: "Sunset Beach Couple Session", category: "other", image_url: "assets/images/other_2.jpg", description: "Cinematic pre-wedding style couple photoshoot during the golden hour on the white sands of Phuket." }
    ];

    async function loadPortfolios() {
        try {
            const response = await fetch('/api/portfolios');
            if (!response.ok) throw new Error('Failed to fetch portfolios');
            
            // Check if response is JSON (Firebase returns HTML if API is missing)
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                allPortfolios = await response.json();
            } else {
                throw new Error('Received HTML instead of JSON (API not deployed)');
            }
        } catch (error) {
            console.warn('API unreachable, falling back to static portfolios:', error.message);
            allPortfolios = fallbackPortfolios;
        }
        renderPortfolios('all');
    }

    const typeTranslations = {
        wedding: 'งานแต่งงาน',
        ordination: 'งานอุปสมบท',
        graduation: 'งานรับปริญญา',
        other: 'อื่นๆ / Portrait'
    };

    function renderPortfolios(filter) {
        if (!portfolioGrid) return;
        
        const filtered = filter === 'all' 
            ? allPortfolios 
            : allPortfolios.filter(item => item.category === filter);
            
        if (filtered.length === 0) {
            portfolioGrid.innerHTML = '<div class="loading-spinner">ไม่มีผลงานจัดแสดงในหมวดหมู่นี้</div>';
            return;
        }

        portfolioGrid.innerHTML = filtered.map(item => `
            <div class="portfolio-card glass-card" data-category="${item.category}">
                <img src="${item.image_url}" alt="${item.title}" class="portfolio-img" loading="lazy">
                <div class="portfolio-overlay">
                    <span class="portfolio-category">${typeTranslations[item.category] || item.category}</span>
                    <h3 class="portfolio-title">${item.title}</h3>
                    <p class="portfolio-desc">${item.description || ''}</p>
                </div>
            </div>
        `).join('');
    }

    // Tab filtering clicks
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filterValue = btn.getAttribute('data-filter');
            renderPortfolios(filterValue);
        });
    });

    // Footer filter navigation links
    footerFilterLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const filterValue = link.getAttribute('data-filter');
            const targetTab = Array.from(tabButtons).find(btn => btn.getAttribute('data-filter') === filterValue);
            
            if (targetTab) {
                targetTab.click();
                // scroll to portfolio section
                const portfolioSec = document.getElementById('portfolio');
                if (portfolioSec) {
                    portfolioSec.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // -------------------------------------------------------------
    // 3. Interactive Pricing Estimator & Calculator
    // -------------------------------------------------------------
    const packagePrices = {
        Bronze: 4900,
        Silver: 8900,
        Gold: 14900,
        Custom: 0
    };

    const packageNames = {
        Bronze: 'Bronze Package',
        Silver: 'Silver Package (ยอดนิยม)',
        Gold: 'Gold Package',
        Custom: 'จ้างเหมาพิเศษ / อื่นๆ'
    };

    const eventNames = {
        wedding: 'งานแต่งงาน (Wedding)',
        ordination: 'งานอุปสมบท (Ordination)',
        graduation: 'งานรับปริญญา (Graduation)',
        other: 'งานอื่นๆ / Portrait'
    };

    function calculateEstimate() {
        if (!summaryTotalPrice) return;

        const eventVal = eventTypeSelect.value;
        const packageVal = packageSelect.value;
        
        // 1. Base Package Price
        const basePrice = packagePrices[packageVal] || 0;
        let total = basePrice;
        
        // Update summary texts
        summaryEventType.textContent = eventNames[eventVal] || 'ยังไม่ได้เลือก';
        summaryPackage.textContent = packageNames[packageVal] || 'ยังไม่ได้เลือก';
        summaryPackagePrice.textContent = basePrice > 0 ? `฿${basePrice.toLocaleString('th-TH')}` : '฿0';
        
        // 2. Addons calculation
        let addonsHtml = '';
        summaryAddonsList.innerHTML = '';
        
        addonCheckboxes.forEach(cb => {
            if (cb.checked) {
                const price = Number(cb.getAttribute('data-price'));
                const label = cb.closest('.addon-item').querySelector('strong').textContent;
                total += price;
                
                addonsHtml += `
                    <div class="summary-line" style="font-size: 0.85rem; padding-left: 0.5rem; margin-top: 0.2rem;">
                        <span>+ ${label}:</span>
                        <strong>฿${price.toLocaleString('th-TH')}</strong>
                    </div>
                `;
            }
        });
        
        if (addonsHtml) {
            summaryAddonsList.innerHTML = addonsHtml;
        } else {
            summaryAddonsList.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">ไม่มีบริการเสริมพิเศษ</span>';
        }
        
        // 3. Total Price Output
        summaryTotalPrice.textContent = `฿${total.toLocaleString('th-TH')}`;
        return total;
    }

    // Add listeners for dynamic changes
    if (eventTypeSelect) eventTypeSelect.addEventListener('change', calculateEstimate);
    if (packageSelect) packageSelect.addEventListener('change', calculateEstimate);
    addonCheckboxes.forEach(cb => cb.addEventListener('change', calculateEstimate));

    // Handle Quick Pkg selects
    selectPkgButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const pkgName = btn.getAttribute('data-package');
            if (packageSelect) {
                packageSelect.value = pkgName;
                calculateEstimate();
                
                // Scroll to planner section
                const plannerSec = document.getElementById('planner');
                if (plannerSec) {
                    plannerSec.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // -------------------------------------------------------------
    // 4. Form Submission & Ticket Generation
    // -------------------------------------------------------------
    let currentTicketText = '';
    let lineOALink = 'https://line.me/R/ti/p/@shutterpixs'; // Default fallback

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submit-booking-btn');
            const originalBtnContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังจดบันทึกข้อมูล...';

            const totalCalculated = calculateEstimate();

            // Prepare booking details
            const bookingData = {
                customer_name: customerNameInput.value,
                customer_phone: customerPhoneInput.value,
                customer_line_id: customerLineInput.value || null,
                event_type: eventTypeSelect.value,
                event_date: eventDateInput.value,
                package_name: packageNames[packageSelect.value] || packageSelect.value,
                total_price: totalCalculated,
                details: document.getElementById('details').value || ''
            };

            try {
                // Post to Express backend APIs
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bookingData)
                });

                if (!response.ok) throw new Error('Network response error');
                
                const savedBooking = await response.json();
                
                // Format Thai date for the ticket
                const rawDate = new Date(savedBooking.event_date);
                const formattedDate = rawDate.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Generate booking text representation for Line OA sharing
                currentTicketText = `📸 *SHUTTERPIXS BOOKING CARD* 📸
------------------------------------
🎫 รหัสการจอง: *${savedBooking.id}*
👤 ชื่อลูกค้า: ${savedBooking.customer_name}
📞 เบอร์ติดต่อ: ${savedBooking.customer_phone}
💬 Line ID: ${savedBooking.customer_line_id || '-'}
🗓 วันที่จัดงาน: ${formattedDate}
✨ ประเภทงาน: ${eventNames[savedBooking.event_type] || savedBooking.event_type}
📦 แพ็กเกจ: ${savedBooking.package_name}
💰 ราคารวม: ฿${savedBooking.total_price.toLocaleString('th-TH')}
------------------------------------
⚠️ *กรุณาส่งข้อความนี้เข้าแชท Line OA เพื่อยืนยันล็อคคิวทันทีครับ!*`;

                // Render Ticket inside Modal HTML
                bookingTicketContent.innerHTML = `
                    <div class="ticket-header">
                        <span class="ticket-brand"><i class="fa-solid fa-camera-retro"></i> SHUTTERPIXS</span>
                        <span class="ticket-id" id="ticket-id-str">${savedBooking.id}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">ชื่อผู้จอง:</span>
                        <span class="ticket-val">${savedBooking.customer_name}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">เบอร์โทรศัพท์:</span>
                        <span class="ticket-val">${savedBooking.customer_phone}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">วันจัดงาน:</span>
                        <span class="ticket-val highlight">${formattedDate}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">ประเภทคิว:</span>
                        <span class="ticket-val">${eventNames[savedBooking.event_type] || savedBooking.event_type}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">บริการแพ็กเกจ:</span>
                        <span class="ticket-val">${savedBooking.package_name}</span>
                    </div>
                    <div class="ticket-row" style="margin-top: 0.8rem; border-top: 1px solid var(--border-color); padding-top: 0.8rem;">
                        <span class="ticket-label" style="font-weight: 700;">ราคาสุทธิประเมิน:</span>
                        <span class="ticket-val price-val">฿${savedBooking.total_price.toLocaleString('th-TH')}</span>
                    </div>
                    <div class="ticket-footer-text">
                        ระบบบันทึกเข้ารหัสคิวแล้วเรียบร้อย
                    </div>
                `;

                // Set line OA link button
                // On mobile, if we can send text directly to Line link, we can format: https://line.me/R/oaMessage/{id}/?{text}
                // However, copying to clipboard first and instructing the user is the most reliable strategy.
                modalLineBtn.href = lineOALink;
                
                // Show booking modal
                bookingModal.classList.add('open');
                
                // Reset Form
                bookingForm.reset();
                calculateEstimate();
                
            } catch (err) {
                console.warn('Backend API unreachable. Simulating booking creation:', err.message);
                
                // Simulate a successful booking locally
                const dateObj = new Date();
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dateStr = String(dateObj.getDate()).padStart(2, '0');
                const randNum = String(Math.floor(100 + Math.random() * 900));
                bookingData.id = `SP-${year}${month}${dateStr}-${randNum}`;
                bookingData.status = 'pending';
                bookingData.created_at = dateObj.toISOString();
                
                const savedBooking = bookingData;
                
                // Format Thai date for the ticket
                const rawDate = new Date(savedBooking.event_date);
                const formattedDate = rawDate.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Generate booking text representation for Line OA sharing
                currentTicketText = `📸 *SHUTTERPIXS BOOKING CARD* 📸
------------------------------------
🎫 รหัสการจอง: *${savedBooking.id}*
👤 ชื่อลูกค้า: ${savedBooking.customer_name}
📞 เบอร์ติดต่อ: ${savedBooking.customer_phone}
💬 Line ID: ${savedBooking.customer_line_id || '-'}
🗓 วันที่จัดงาน: ${formattedDate}
✨ ประเภทงาน: ${eventNames[savedBooking.event_type] || savedBooking.event_type}
📦 แพ็กเกจ: ${savedBooking.package_name}
💰 ราคารวม: ฿${savedBooking.total_price.toLocaleString('th-TH')}
------------------------------------
⚠️ *กรุณาส่งข้อความนี้เข้าแชท Line OA เพื่อยืนยันล็อคคิวทันทีครับ!*`;

                // Render Ticket inside Modal HTML
                bookingTicketContent.innerHTML = `
                    <div class="ticket-header">
                        <span class="ticket-brand"><i class="fa-solid fa-camera-retro"></i> SHUTTERPIXS</span>
                        <span class="ticket-id" id="ticket-id-str">${savedBooking.id}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">ชื่อผู้จอง:</span>
                        <span class="ticket-val">${savedBooking.customer_name}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">เบอร์โทรศัพท์:</span>
                        <span class="ticket-val">${savedBooking.customer_phone}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">วันจัดงาน:</span>
                        <span class="ticket-val highlight">${formattedDate}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">ประเภทคิว:</span>
                        <span class="ticket-val">${eventNames[savedBooking.event_type] || savedBooking.event_type}</span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">บริการแพ็กเกจ:</span>
                        <span class="ticket-val">${savedBooking.package_name}</span>
                    </div>
                    <div class="ticket-row" style="margin-top: 0.8rem; border-top: 1px solid var(--border-color); padding-top: 0.8rem;">
                        <span class="ticket-label" style="font-weight: 700;">ราคาสุทธิประเมิน:</span>
                        <span class="ticket-val price-val">฿${savedBooking.total_price.toLocaleString('th-TH')}</span>
                    </div>
                    <div class="ticket-footer-text">
                        ประเมินราคาเบื้องต้นเรียบร้อย (ระบบออฟไลน์)
                    </div>
                `;

                modalLineBtn.href = lineOALink;
                bookingModal.classList.add('open');
                bookingForm.reset();
                calculateEstimate();
                
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }

    // Modal Close
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            bookingModal.classList.remove('open');
        });
    }

    // Close modal when clicking outside card
    if (bookingModal) {
        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) {
                bookingModal.classList.remove('open');
            }
        });
    }

    // Copy ticket details to clipboard
    if (copyTicketBtn) {
        copyTicketBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(currentTicketText).then(() => {
                const originalText = copyTicketBtn.innerHTML;
                copyTicketBtn.innerHTML = '<i class="fa-solid fa-check"></i> คัดลอกสำเร็จ!';
                copyTicketBtn.style.borderColor = 'var(--success)';
                copyTicketBtn.style.color = 'var(--success)';
                
                setTimeout(() => {
                    copyTicketBtn.innerHTML = originalText;
                    copyTicketBtn.style.borderColor = '';
                    copyTicketBtn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Could not copy text: ', err);
                alert('ไม่สามารถคัดลอกได้อัตโนมัติ กรุณาจดเลขจองคิวไว้เพื่อแจ้งแอดมิน');
            });
        });
    }

    // -------------------------------------------------------------
    // 5. Theme Switcher Utilities (โหมดมืด/สว่าง)
    // -------------------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('shutterpixs_theme');
        
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

    // -------------------------------------------------------------
    // Initial Load execution
    // -------------------------------------------------------------
    loadPortfolios();
});
