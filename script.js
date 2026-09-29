// Casseus Health & Wellness - Interactive Booking System
(function () {
  'use strict';

  // ========== Storage Keys ==========
  const BOOKINGS_KEY = 'casseus_bookings';
  const PACKAGES_KEY = 'casseus_packages';
  const WAIVERS_KEY = 'casseus_waivers';

  // Backend API (same origin when served by Node; override with window.CASSEUS_API_BASE)
  const API_BASE = (typeof window !== 'undefined' && window.CASSEUS_API_BASE) || '';

  async function apiFetch(path, options) {
    const url = (API_BASE || '') + path;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
      ...options,
    });
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function apiHealth() {
    try {
      return await apiFetch('/api/health');
    } catch {
      return null;
    }
  }

  async function apiSubmitSurvey(survey) {
    return apiFetch('/api/surveys', { method: 'POST', body: JSON.stringify(survey) });
  }

  async function apiNotify(type, title, fields, replyTo) {
    return apiFetch('/api/notify', {
      method: 'POST',
      body: JSON.stringify({ type, title, fields, replyTo }),
    });
  }

  async function apiWeeklyReport(payload) {
    return apiFetch('/api/weekly-report', { method: 'POST', body: JSON.stringify(payload) });
  }

  // ========== Affiliate attribution (30-day window) ==========
  (function captureAffiliateRef() {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        localStorage.setItem('casseus_affiliate_ref', ref.trim());
        localStorage.setItem('casseus_affiliate_ref_time', Date.now().toString());
      }
    } catch (e) { /* ignore */ }
  })();

  function getActiveAffiliateRef() {
    const ref = localStorage.getItem('casseus_affiliate_ref');
    const t = parseInt(localStorage.getItem('casseus_affiliate_ref_time') || '0', 10);
    if (!ref || !t) return null;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - t > thirtyDays) return null;
    return ref;
  }

  function logAffiliateConversion(type, amount, detail) {
    const ref = getActiveAffiliateRef();
    if (!ref) return;
    const logs = JSON.parse(localStorage.getItem('casseus_affiliate_conversions') || '[]');
    logs.push({
      affiliateCode: ref,
      type,
      amount,
      detail,
      at: new Date().toISOString()
    });
    localStorage.setItem('casseus_affiliate_conversions', JSON.stringify(logs));
  }

  // ========== Package Data ==========
  const PACKAGES = {
    // 30-min stretch
    's30-1': { name: '30-Min Stretch - 1x/Week', price: 280, sessions: 4, type: 'stretch30', freq: 1 },
    's30-2': { name: '30-Min Stretch - 2x/Week', price: 520, sessions: 8, type: 'stretch30', freq: 2 },
    's30-3': { name: '30-Min Stretch - 3x/Week', price: 715, sessions: 13, type: 'stretch30', freq: 3 },
    's30-4': { name: '30-Min Stretch - 4x/Week', price: 865, sessions: 17, type: 'stretch30', freq: 4 },
    's30-5': { name: '30-Min Stretch - 5x/Week', price: 975, sessions: 21, type: 'stretch30', freq: 5 },
    's30-6': { name: '30-Min Stretch - 6x/Week', price: 1040, sessions: 26, type: 'stretch30', freq: 6 },
    // 60-min stretch
    's60-1': { name: '60-Min Stretch - 1x/Week', price: 475, sessions: 4, type: 'stretch60', freq: 1 },
    's60-2': { name: '60-Min Stretch - 2x/Week', price: 865, sessions: 8, type: 'stretch60', freq: 2 },
    's60-3': { name: '60-Min Stretch - 3x/Week', price: 1235, sessions: 13, type: 'stretch60', freq: 3 },
    's60-4': { name: '60-Min Stretch - 4x/Week', price: 1560, sessions: 17, type: 'stretch60', freq: 4 },
    's60-5': { name: '60-Min Stretch - 5x/Week', price: 1840, sessions: 21, type: 'stretch60', freq: 5 },
    's60-6': { name: '60-Min Stretch - 6x/Week', price: 2080, sessions: 26, type: 'stretch60', freq: 6 },
    // 30-min PT
    'pt30-1': { name: '30-Min PT - 1x/Week', price: 300, sessions: 4, type: 'pt30', freq: 1 },
    'pt30-2': { name: '30-Min PT - 2x/Week', price: 560, sessions: 8, type: 'pt30', freq: 2 },
    'pt30-3': { name: '30-Min PT - 3x/Week', price: 780, sessions: 13, type: 'pt30', freq: 3 },
    'pt30-4': { name: '30-Min PT - 4x/Week', price: 950, sessions: 17, type: 'pt30', freq: 4 },
    // 60-min PT
    'pt60-1': { name: '60-Min PT - 1x/Week', price: 475, sessions: 4, type: 'pt60', freq: 1 },
    'pt60-2': { name: '60-Min PT - 2x/Week', price: 865, sessions: 8, type: 'pt60', freq: 2 },
    'pt60-3': { name: '60-Min PT - 3x/Week', price: 1235, sessions: 13, type: 'pt60', freq: 3 },
    'pt60-4': { name: '60-Min PT - 4x/Week', price: 1560, sessions: 17, type: 'pt60', freq: 4 },
  };

  const SINGLE_PRICES = {
    free15: 0,
    stretch30: 65,
    stretch60: 110,
    pt30: 75,
    pt60: 120,
  };

  const SERVICE_LABELS = {
    free15: 'FREE 15-Min Assisted Mobility Stretch',
    stretch30: '30-Min Assisted Stretch',
    stretch60: '60-Min Full-Body Stretch',
    pt30: '30-Min Personal Training',
    pt60: '60-Min Personal Training',
  };

  // ========== Time Slots ==========
  const TIME_SLOTS = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  // ========== Helpers ==========
  let bookingsCache = null;

  function getBookings() {
    if (Array.isArray(bookingsCache)) return bookingsCache;
    try {
      return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveBookings(bookings) {
    bookingsCache = bookings;
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }

  async function syncBookingsFromServer() {
    try {
      const data = await apiFetch('/api/bookings');
      if (data && Array.isArray(data.bookings)) {
        const local = getBookings();
        const byKey = new Map();
        local.forEach((b) => byKey.set(b.date + '|' + b.time, b));
        data.bookings.forEach((b) => {
          const k = b.date + '|' + b.time;
          if (!byKey.has(k)) byKey.set(k, b);
        });
        saveBookings(Array.from(byKey.values()));
        if (typeof updateTimeSlots === 'function') updateTimeSlots();
        if (typeof renderBookings === 'function') renderBookings();
      }
    } catch (_) { /* offline: localStorage only */ }
  }

  async function persistBookingToServer(booking) {
    try {
      return await apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(booking) });
    } catch (err) {
      if (err && err.status === 409) throw err;
      return null;
    }
  }

  function getPurchasedPackages() {
    try {
      return JSON.parse(localStorage.getItem(PACKAGES_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function savePurchasedPackages(pkgs) {
    localStorage.setItem(PACKAGES_KEY, JSON.stringify(pkgs));
    apiFetch('/api/packages', { method: 'POST', body: JSON.stringify({ packages: pkgs.slice(-3) }) }).catch(function () {});
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isSlotBooked(date, time) {
    const bookings = getBookings();
    return bookings.some(b => b.date === date && b.time === time);
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  function formatTime(t) {
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  function formatDate(d) {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ========== DOM Elements ==========
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');
  const header = document.getElementById('header');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const buyBtns = document.querySelectorAll('.buy-btn');
  const bookingForm = document.getElementById('bookingForm');
  const serviceType = document.getElementById('serviceType');
  const packageSelect = document.getElementById('packageSelect');
  const packageGroup = document.getElementById('packageGroup');
  const locationSelect = document.getElementById('location');
  const travelSummary = document.getElementById('travelSummary');
  const sessionDate = document.getElementById('sessionDate');
  const sessionTime = document.getElementById('sessionTime');
  const paymentSection = document.getElementById('paymentSection');
  const bookingsList = document.getElementById('bookingsList');
  const paymentModal = document.getElementById('paymentModal');
  const modalClose = document.getElementById('modalClose');
  const modalDetails = document.getElementById('modalDetails');
  const confirmPayment = document.getElementById('confirmPayment');
  const waiverModal = document.getElementById('waiverModal');
  const waiverClose = document.getElementById('waiverClose');
  const signWaiverBtn = document.getElementById('signWaiverBtn');
  const waiverAgree = document.getElementById('waiverAgree');
  const waiverName = document.getElementById('waiverName');
  const waiverDate = document.getElementById('waiverDate');
  const waiverStatus = document.getElementById('waiverStatus');
  const intakeModal = document.getElementById('intakeModal');
  const intakeClose = document.getElementById('intakeClose');
  const intakeForm = document.getElementById('intakeForm');
  const intakeStatus = document.getElementById('intakeStatus');

  let selectedPackageId = null;
  let currentWaiverSignature = null;
  let currentIntakeData = null;
  let currentRefundPolicySignature = null;

  // ========== Waiver & Intake Helpers ==========
  function getWaivers() {
    try {
      return JSON.parse(localStorage.getItem(WAIVERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveWaiver(signature) {
    const waivers = getWaivers();
    waivers.push(signature);
    localStorage.setItem(WAIVERS_KEY, JSON.stringify(waivers));
  }

  function getIntakes() {
    try {
      return JSON.parse(localStorage.getItem('casseus_intakes') || '[]');
    } catch {
      return [];
    }
  }

  function saveIntake(data) {
    const intakes = getIntakes();
    intakes.push(data);
    localStorage.setItem('casseus_intakes', JSON.stringify(intakes));
  }

  // ========== Digital Signature Pad ==========
  function createSignaturePad(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let hasInk = false;
    let lastX = 0;
    let lastY = 0;

    function ratio() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(300, Math.floor(rect.width));
      const h = 160;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0a2540';
    }

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    }

    function start(e) {
      e.preventDefault();
      drawing = true;
      const p = pos(e);
      lastX = p.x;
      lastY = p.y;
    }

    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x;
      lastY = p.y;
      hasInk = true;
      canvas.classList.add('signed');
    }

    function end(e) {
      if (e) e.preventDefault();
      drawing = false;
    }

    function clear() {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width + 50, 200);
      hasInk = false;
      canvas.classList.remove('signed');
      ratio();
    }

    function isEmpty() {
      return !hasInk;
    }

    function toDataURL() {
      return hasInk ? canvas.toDataURL('image/png') : null;
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });

    ratio();
    return { clear, isEmpty, toDataURL, ratio };
  }

  const waiverPad = createSignaturePad(document.getElementById('waiverSignaturePad'));
  const refundPad = createSignaturePad(document.getElementById('refundSignaturePad'));

  const clearWaiverSignature = document.getElementById('clearWaiverSignature');
  if (clearWaiverSignature && waiverPad) {
    clearWaiverSignature.addEventListener('click', () => waiverPad.clear());
  }
  const clearRefundSignature = document.getElementById('clearRefundSignature');
  if (clearRefundSignature && refundPad) {
    clearRefundSignature.addEventListener('click', () => refundPad.clear());
  }

  function openWaiverModal() {
    waiverAgree.checked = false;
    const esign = document.getElementById('waiverEsignConsent');
    if (esign) esign.checked = false;
    waiverName.value = '';
    waiverDate.value = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    currentWaiverSignature = null;
    currentIntakeData = null;
    currentRefundPolicySignature = null;
    if (waiverPad) {
      setTimeout(() => { waiverPad.ratio(); waiverPad.clear(); }, 50);
    }
    waiverModal.classList.add('open');
  }

  function openIntakeModal() {
    intakeForm.reset();
    // Pre-fill name from waiver signature
    if (currentWaiverSignature && currentWaiverSignature.name) {
      document.getElementById('intakeFullName').value = currentWaiverSignature.name;
    }
    intakeModal.classList.add('open');
  }

  function openPaymentModal() {
    const pkg = PACKAGES[selectedPackageId];
    modalDetails.innerHTML = `
      <p><strong>Package:</strong> ${pkg.name}</p>
      <p><strong>Monthly Investment:</strong> $${pkg.price.toLocaleString()}</p>
      <p><strong>Approx. Sessions:</strong> ${pkg.sessions}/month</p>
      <p><strong>Includes:</strong> Specialized stretch bench setup, intake evaluation, 1-on-1 master trainer care.</p>
      <p style="margin-top:12px;font-size:0.9rem;color:#64748b;">Travel fees: Tampa/Bradenton $0 · Sarasota $25 (waived on 4+ session packages)</p>
      <p style="margin-top:8px;font-size:0.85rem;color:#64748b;" id="stripePayNote"><em>You will be redirected to Stripe Checkout to pay securely. If Stripe is not configured, demo mode is used.</em></p>
    `;
    waiverStatus.innerHTML = `<i class="fas fa-check-circle"></i> Liability Waiver signed by <strong>${currentWaiverSignature.name}</strong>`;
    intakeStatus.innerHTML = `<i class="fas fa-check-circle"></i> Intake form completed by <strong>${currentIntakeData.fullName}</strong>`;
    if (refundPolicyStatus) {
      refundPolicyStatus.innerHTML = currentRefundPolicySignature
        ? `<i class="fas fa-check-circle"></i> Return & Refund Policy signed by <strong>${currentRefundPolicySignature.name}</strong>`
        : `<i class="fas fa-exclamation-circle" style="color:#c62828;"></i> Return & Refund Policy not signed`;
    }
    const recCheck = document.getElementById('packageRecurring');
    if (recCheck) recCheck.checked = false;
    paymentModal.classList.add('open');
  }

  // ========== Nav ==========
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => nav.classList.remove('open'));
  });

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  });

  // ========== Tabs ==========
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // ========== Buy Package Buttons → open Waiver first ==========
  buyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPackageId = btn.dataset.id;
      const pkg = PACKAGES[selectedPackageId];
      if (!pkg) return;
      openWaiverModal();
    });
  });

  // Close waiver modal
  waiverClose.addEventListener('click', () => {
    waiverModal.classList.remove('open');
    selectedPackageId = null;
  });
  waiverModal.addEventListener('click', (e) => {
    if (e.target === waiverModal) {
      waiverModal.classList.remove('open');
      selectedPackageId = null;
    }
  });

  // Sign waiver → then open Intake Form
  signWaiverBtn.addEventListener('click', () => {
    if (!waiverAgree.checked) {
      showToast('You must check the box to agree to the waiver.', 'error');
      return;
    }
    const esign = document.getElementById('waiverEsignConsent');
    if (esign && !esign.checked) {
      showToast('You must consent to electronic signature.', 'error');
      return;
    }
    const name = waiverName.value.trim();
    if (!name || name.length < 2) {
      showToast('Please type your full legal name.', 'error');
      return;
    }
    if (!waiverPad || waiverPad.isEmpty()) {
      showToast('Please draw your digital signature in the box.', 'error');
      return;
    }

    currentWaiverSignature = {
      name: name,
      date: new Date().toISOString(),
      agreed: true,
      esignConsent: true,
      packageId: selectedPackageId,
      version: 'LW-2026-01',
      signatureImage: waiverPad.toDataURL(),
      userAgent: navigator.userAgent,
    };

    waiverModal.classList.remove('open');
    openIntakeModal();
  });

  // Close intake modal
  intakeClose.addEventListener('click', () => {
    intakeModal.classList.remove('open');
    selectedPackageId = null;
    currentWaiverSignature = null;
    currentIntakeData = null;
  });
  intakeModal.addEventListener('click', (e) => {
    if (e.target === intakeModal) {
      intakeModal.classList.remove('open');
      selectedPackageId = null;
      currentWaiverSignature = null;
      currentIntakeData = null;
    }
  });

  // Submit intake → then open Payment modal
  intakeForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!document.getElementById('intakeAccurate').checked) {
      showToast('Please confirm that the information is accurate.', 'error');
      return;
    }

    const conditions = Array.from(document.querySelectorAll('input[name="conditions"]:checked')).map(c => c.value);
    const goals = Array.from(document.querySelectorAll('input[name="goals"]:checked')).map(g => g.value);

    if (goals.length === 0) {
      showToast('Please select at least one primary goal.', 'error');
      return;
    }

    const sessionType = document.getElementById('intakeSessionType').value;
    const sessionArea = document.getElementById('intakeSessionArea').value;
    const sessionAddress = document.getElementById('intakeSessionAddress').value.trim();

    if (!sessionType || !sessionArea || !sessionAddress) {
      showToast('Please complete where the session will be held.', 'error');
      return;
    }

    currentIntakeData = {
      fullName: document.getElementById('intakeFullName').value.trim(),
      dob: document.getElementById('intakeDob').value,
      phone: document.getElementById('intakePhone').value.trim(),
      email: document.getElementById('intakeEmail').value.trim(),
      emergency: document.getElementById('intakeEmergency').value.trim(),
      conditions: conditions,
      injuries: document.getElementById('intakeInjuries').value.trim(),
      medications: document.getElementById('intakeMedications').value.trim(),
      pain: document.getElementById('intakePain').value.trim(),
      activityLevel: document.getElementById('intakeActivity').value,
      occupation: document.getElementById('intakeOccupation').value.trim(),
      goals: goals,
      goalsDetail: document.getElementById('intakeGoalsDetail').value.trim(),
      sessionLocationType: sessionType,
      sessionArea: sessionArea,
      sessionAddress: sessionAddress,
      sessionLocationNotes: document.getElementById('intakeSessionNotes').value.trim(),
      limitations: document.getElementById('intakeLimitations').value.trim(),
      other: document.getElementById('intakeOther').value.trim(),
      submittedAt: new Date().toISOString(),
      packageId: selectedPackageId,
    };

    intakeModal.classList.remove('open');
    openRefundPolicyModal();
  });

  // ========== Return & Refund Policy (required) ==========
  const refundPolicyModal = document.getElementById('refundPolicyModal');
  const refundPolicyClose = document.getElementById('refundPolicyClose');
  const signRefundPolicyBtn = document.getElementById('signRefundPolicyBtn');
  const refundPolicyStatus = document.getElementById('refundPolicyStatus');

  function openRefundPolicyModal() {
    const dateEl = document.getElementById('refundSignDate');
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    const agree = document.getElementById('refundAgree');
    const esign = document.getElementById('refundEsignConsent');
    const nameEl = document.getElementById('refundSignName');
    if (agree) agree.checked = false;
    if (esign) esign.checked = false;
    if (nameEl) nameEl.value = (currentIntakeData && currentIntakeData.fullName) || (currentWaiverSignature && currentWaiverSignature.name) || '';
    if (refundPad) {
      setTimeout(() => { refundPad.ratio(); refundPad.clear(); }, 50);
    }
    refundPolicyModal.classList.add('open');
  }

  if (refundPolicyClose) {
    refundPolicyClose.addEventListener('click', () => refundPolicyModal.classList.remove('open'));
  }
  if (refundPolicyModal) {
    refundPolicyModal.addEventListener('click', (e) => {
      if (e.target === refundPolicyModal) refundPolicyModal.classList.remove('open');
    });
  }

  if (signRefundPolicyBtn) {
    signRefundPolicyBtn.addEventListener('click', () => {
      const agree = document.getElementById('refundAgree');
      const name = document.getElementById('refundSignName').value.trim();
      const date = document.getElementById('refundSignDate').value;
      if (!agree || !agree.checked) {
        showToast('You must agree to the Return & Refund Policy to continue.', 'error');
        return;
      }
      const esignConsent = document.getElementById('refundEsignConsent');
      if (esignConsent && !esignConsent.checked) {
        showToast('You must consent to electronic signature.', 'error');
        return;
      }
      if (!name || !date) {
        showToast('Please type your full legal name and date.', 'error');
        return;
      }
      if (!refundPad || refundPad.isEmpty()) {
        showToast('Please draw your digital signature in the box.', 'error');
        return;
      }
      currentRefundPolicySignature = {
        name,
        date,
        signedAt: new Date().toISOString(),
        policyVersion: '2026-01',
        esignConsent: true,
        signatureImage: refundPad.toDataURL(),
        userAgent: navigator.userAgent,
      };
      const policies = JSON.parse(localStorage.getItem('casseus_refund_policies') || '[]');
      policies.push({
        ...currentRefundPolicySignature,
        clientEmail: currentIntakeData ? currentIntakeData.email : '',
        packageId: selectedPackageId,
      });
      localStorage.setItem('casseus_refund_policies', JSON.stringify(policies));
      refundPolicyModal.classList.remove('open');
      openPaymentModal();
    });
  }

  modalClose.addEventListener('click', () => {
    paymentModal.classList.remove('open');
    selectedPackageId = null;
    currentWaiverSignature = null;
    currentIntakeData = null;
    currentRefundPolicySignature = null;
  });
  paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) {
      paymentModal.classList.remove('open');
      selectedPackageId = null;
      currentWaiverSignature = null;
      currentIntakeData = null;
    }
  });

  function generateReceipt(pkg, intake, waiver, isRecurring) {
    const receiptId = 'CHW-' + Date.now().toString(36).toUpperCase();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const firstName = (intake.fullName || waiver.name || 'Valued Client').split(' ')[0];
    const recurringRow = isRecurring
      ? '<tr><td>Billing</td><td><strong>Recurring monthly</strong> — cancel anytime</td></tr>'
      : '<tr><td>Billing</td><td>One-time purchase</td></tr>';

    return `
      <div class="receipt-doc">
        <div class="receipt-header">
          <h2>CASSEUS HEALTH & WELLNESS</h2>
          <div class="receipt-sub">Mobile Personal Training · Tampa · Bradenton · Sarasota</div>
          <div class="receipt-sub">240-571-7253 · casseus137@gmail.com</div>
        </div>

        <div class="receipt-section">
          <h4>Official Receipt</h4>
          <table class="receipt-table">
            <tr><td>Receipt #</td><td>${receiptId}</td></tr>
            <tr><td>Date</td><td>${dateStr} at ${timeStr}</td></tr>
            <tr><td>Client</td><td>${intake.fullName}</td></tr>
            <tr><td>Email</td><td>${intake.email}</td></tr>
            <tr><td>Phone</td><td>${intake.phone}</td></tr>
          </table>
        </div>

        <div class="receipt-section">
          <h4>Purchase Details</h4>
          <table class="receipt-table">
            <tr><td>Package</td><td>${pkg.name}</td></tr>
            <tr><td>Sessions Included</td><td>~${pkg.sessions} sessions / month</td></tr>
            <tr><td>Service Type</td><td>${pkg.type.includes('stretch') ? 'Assisted Stretching' : 'Personal Training'}</td></tr>
            ${recurringRow}
            <tr><td>Waiver Signed</td><td>Yes — ${waiver.name} (v${waiver.version || 'LW-2026-01'})</td></tr>
            <tr><td>Intake Completed</td><td>Yes — ${intake.fullName}</td></tr>
            <tr><td>Return &amp; Refund Policy</td><td>Yes — signed before purchase</td></tr>
          </table>
          ${waiver.signatureImage ? `<div style="margin-top:12px;"><div style="font-size:0.8rem;color:#64748b;margin-bottom:4px;">Digital signature on file:</div><img src="${waiver.signatureImage}" alt="Client signature" style="max-width:240px;height:auto;border:1px solid #e2e8f0;border-radius:6px;background:#fff;"></div>` : ''}
          <div class="receipt-total">
            <span>Total Paid${isRecurring ? ' (this month)' : ''}</span>
            <span>$${pkg.price.toLocaleString()}.00</span>
          </div>
        </div>

        <div class="receipt-section">
          <h4>Thank You Letter</h4>
          <div class="thank-you-letter">
            <p>Dear ${firstName},</p>
            <p>Thank you for choosing <strong>Casseus Health & Wellness</strong>. It is an honor to be trusted with your mobility, recovery, and fitness journey.</p>
            <p>Your package — <strong>${pkg.name}</strong> — is now active. You have approximately <strong>${pkg.sessions} sessions</strong> available this month. We’ve received your signed Liability Waiver & Safety Disclosure and your completed Client Intake Form. This information allows us to build a program that is safe, personalized, and focused on the results that matter most to you.</p>
            <p>Here’s what happens next:</p>
            <p>1. Use the booking section on our website to reserve your preferred weekly time slots (Sunday–Friday, 7:00 AM – 7:00 PM).<br>
            2. We’ll come to your location in Tampa, Bradenton, or Sarasota with everything needed — including our specialized stretch bench when applicable.<br>
            3. Each session is 1-on-1. You’ll receive focused attention so you can move better, feel stronger, and never plateau.</p>
            <p>If you have any questions before your first session, text or call <strong>240-571-7253</strong> or email <strong>casseus137@gmail.com</strong>. We’re here for you.</p>
            <p>Welcome to the Casseus family. Your wellness, your mobility, your results — start now.</p>
            <p class="sign-off">
              With gratitude,<br>
              Will Casseus<br>
              Owner & Mobile Personal Trainer<br>
              Casseus Health & Wellness<br>
              NASM Certified Master Personal Trainer
            </p>
          </div>
        </div>

        <p class="receipt-footer-note">
          A copy of this receipt and thank-you letter has been prepared for your records.
          In production this document is also emailed to ${intake.email}.
          Travel fees (if applicable) are assessed per session according to location policy.
        </p>
      </div>
    `;
  }

  const receiptModal = document.getElementById('receiptModal');
  const receiptClose = document.getElementById('receiptClose');
  const receiptContent = document.getElementById('receiptContent');
  const printReceiptBtn = document.getElementById('printReceiptBtn');
  const closeReceiptBtn = document.getElementById('closeReceiptBtn');

  function activatePurchasedPackage(pkgId, extras) {
    const pkg = PACKAGES[pkgId];
    if (!pkg) return;
    const purchased = getPurchasedPackages();
    const affRef = (extras && extras.affiliateRef) || getActiveAffiliateRef();
    const isRecurring = !!(extras && extras.recurring);
    purchased.push({
      id: pkgId,
      name: pkg.name,
      price: pkg.price,
      sessionsRemaining: pkg.sessions,
      purchasedAt: new Date().toISOString(),
      waiverSignedBy: currentWaiverSignature && currentWaiverSignature.name,
      waiverSignedAt: currentWaiverSignature && currentWaiverSignature.date,
      intakeCompletedBy: currentIntakeData && currentIntakeData.fullName,
      intakeCompletedAt: currentIntakeData && currentIntakeData.submittedAt,
      refundPolicySignedBy: currentRefundPolicySignature && currentRefundPolicySignature.name,
      refundPolicySignedAt: currentRefundPolicySignature && currentRefundPolicySignature.signedAt,
      clientEmail: (currentIntakeData && currentIntakeData.email) || (extras && extras.email) || '',
      affiliateRef: affRef || null,
      recurring: isRecurring,
      recurringInterval: isRecurring ? 'monthly' : null,
      stripeSessionId: extras && extras.stripeSessionId,
      paidVia: extras && extras.paidVia,
    });
    savePurchasedPackages(purchased);
    if (affRef) logAffiliateConversion('package', pkg.price, pkg.name);
    if (currentWaiverSignature) saveWaiver(currentWaiverSignature);
    if (currentIntakeData) saveIntake(currentIntakeData);
    const intake = currentIntakeData || { fullName: extras && extras.name || 'Client', email: extras && extras.email || '', phone: extras && extras.phone || '' };
    const waiver = currentWaiverSignature || { name: intake.fullName, version: 'LW-2026-01' };
    receiptContent.innerHTML = generateReceipt(pkg, intake, waiver, isRecurring);
    paymentModal.classList.remove('open');
    receiptModal.classList.add('open');
    showToast('Package activated! Receipt prepared.');
    if (serviceType) {
      serviceType.value = pkg.type;
      updatePackageOptions();
      packageSelect.value = pkgId;
      packageGroup.style.display = 'block';
      updatePaymentVisibility();
    }
    selectedPackageId = null;
    currentWaiverSignature = null;
    currentIntakeData = null;
    currentRefundPolicySignature = null;
  }

  confirmPayment.addEventListener('click', async () => {
    if (!selectedPackageId) return;
    if (!currentWaiverSignature || !currentWaiverSignature.agreed) {
      showToast('You must sign the Liability Waiver before purchasing.', 'error');
      paymentModal.classList.remove('open');
      openWaiverModal();
      return;
    }
    if (!currentIntakeData) {
      showToast('You must complete the Intake Form before purchasing.', 'error');
      paymentModal.classList.remove('open');
      openIntakeModal();
      return;
    }
    if (!currentRefundPolicySignature) {
      showToast('You must sign the Return & Refund Policy before purchasing.', 'error');
      paymentModal.classList.remove('open');
      openRefundPolicyModal();
      return;
    }

    const pkg = PACKAGES[selectedPackageId];
    const affRef = getActiveAffiliateRef();
    const isRecurring = !!(document.getElementById('packageRecurring') && document.getElementById('packageRecurring').checked);

    confirmPayment.disabled = true;
    confirmPayment.textContent = 'Connecting to Stripe…';
    try {
      const pending = {
        packageId: selectedPackageId,
        name: currentIntakeData.fullName,
        email: currentIntakeData.email,
        phone: currentIntakeData.phone,
        recurring: isRecurring,
        affiliateRef: affRef || null,
        at: Date.now(),
      };
      sessionStorage.setItem('casseus_pending_checkout', JSON.stringify(pending));
      const session = await apiFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'package',
          packageId: selectedPackageId,
          recurring: isRecurring,
          email: currentIntakeData.email,
          name: currentIntakeData.fullName,
          phone: currentIntakeData.phone,
          affiliateRef: affRef || '',
        }),
      });
      if (session && session.url) {
        window.location.href = session.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      // Stripe not configured or API unreachable — keep demo activation
      console.warn('Stripe checkout unavailable, using demo payment:', err.message);
      showToast('Stripe not connected — activating in demo mode (no real charge).', 'error');
      activatePurchasedPackage(selectedPackageId, { recurring: isRecurring, affiliateRef: affRef, paidVia: 'demo' });
    } finally {
      confirmPayment.disabled = false;
      confirmPayment.textContent = 'Pay securely with Stripe';
    }
  });

  (async function handleStripeReturn() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('stripe') === 'cancel') {
        showToast('Checkout canceled. No charge was made.', 'error');
        return;
      }
      if (params.get('stripe') !== 'success') return;
      const sessionId = params.get('session_id');
      if (!sessionId) return;
      const result = await apiFetch('/api/stripe/session?session_id=' + encodeURIComponent(sessionId));
      if (!result || !result.paid) {
        showToast('Payment not confirmed yet. If you were charged, contact casseus137@gmail.com.', 'error');
        return;
      }
      let pending = {};
      try { pending = JSON.parse(sessionStorage.getItem('casseus_pending_checkout') || '{}'); } catch (_) {}
      const pkgId = result.packageId || pending.packageId;
      if (!pkgId || !PACKAGES[pkgId]) {
        showToast('Payment received. We will confirm your package by email.', 'success');
        return;
      }
      activatePurchasedPackage(pkgId, {
        recurring: result.mode === 'subscription' || pending.recurring,
        email: result.customer_email || pending.email,
        name: pending.name,
        phone: pending.phone,
        affiliateRef: pending.affiliateRef,
        stripeSessionId: sessionId,
        paidVia: 'stripe',
      });
      sessionStorage.removeItem('casseus_pending_checkout');
      history.replaceState({}, '', window.location.pathname);
    } catch (e) {
      /* ignore if API offline */
    }
  })();

  receiptClose.addEventListener('click', () => {
    receiptModal.classList.remove('open');
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  });
  closeReceiptBtn.addEventListener('click', () => {
    receiptModal.classList.remove('open');
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  });
  receiptModal.addEventListener('click', (e) => {
    if (e.target === receiptModal) {
      receiptModal.classList.remove('open');
      document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    }
  });
  printReceiptBtn.addEventListener('click', () => {
    window.print();
  });

  // ========== Admin-Only Weekly Report ==========
  // Password-protected. Customers never see this link or report.
  // Access methods: 1) Add #admin to the URL   2) Press Ctrl+Shift+A
  const ADMIN_PASSWORD = 'CasseusAdmin2026';
  const REPORT_EMAIL = 'casseus137@gmail.com';

  const adminLoginModal = document.getElementById('adminLoginModal');
  const adminLoginClose = document.getElementById('adminLoginClose');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const adminPasswordInput = document.getElementById('adminPassword');
  const weeklyReportModal = document.getElementById('weeklyReportModal');
  const weeklyReportClose = document.getElementById('weeklyReportClose');
  const reportWeek = document.getElementById('reportWeek');
  const generateReportBtn = document.getElementById('generateReportBtn');
  const weeklyReportContent = document.getElementById('weeklyReportContent');
  const printWeeklyReportBtn = document.getElementById('printWeeklyReportBtn');
  const emailWeeklyReportBtn = document.getElementById('emailWeeklyReportBtn');
  const closeWeeklyReportBtn = document.getElementById('closeWeeklyReportBtn');

  let adminAuthenticated = sessionStorage.getItem('casseus_admin') === '1';

  function getWeekStart(d) {
    const date = new Date(d);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getWeekEnd(weekStart) {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  const thisWeekStart = getWeekStart(new Date());
  reportWeek.value = thisWeekStart.toISOString().split('T')[0];

  function openAdminLogin() {
    adminPasswordInput.value = '';
    adminLoginModal.classList.add('open');
    setTimeout(() => adminPasswordInput.focus(), 100);
  }

  // Access via #admin in the URL (not visible to normal customers)
  if (window.location.hash === '#admin') {
    openAdminLogin();
  }

  // Access via Ctrl+Shift+A keyboard shortcut (hidden from customers)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      openAdminLogin();
    }
  });

  adminLoginClose.addEventListener('click', () => adminLoginModal.classList.remove('open'));
  adminLoginModal.addEventListener('click', (e) => {
    if (e.target === adminLoginModal) adminLoginModal.classList.remove('open');
  });

  adminLoginBtn.addEventListener('click', tryAdminLogin);
  adminPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryAdminLogin();
  });

  function tryAdminLogin() {
    if (adminPasswordInput.value === ADMIN_PASSWORD) {
      adminAuthenticated = true;
      sessionStorage.setItem('casseus_admin', '1');
      adminLoginModal.classList.remove('open');
      weeklyReportModal.classList.add('open');
      generateWeeklyReport();
      showToast('Admin access granted. Reports are private — only emailed to ' + REPORT_EMAIL);
    } else {
      showToast('Incorrect password. Admin area is restricted.', 'error');
      adminPasswordInput.value = '';
      adminPasswordInput.focus();
    }
  }

  weeklyReportClose.addEventListener('click', () => weeklyReportModal.classList.remove('open'));
  closeWeeklyReportBtn.addEventListener('click', () => weeklyReportModal.classList.remove('open'));
  weeklyReportModal.addEventListener('click', (e) => {
    if (e.target === weeklyReportModal) weeklyReportModal.classList.remove('open');
  });

  generateReportBtn.addEventListener('click', generateWeeklyReport);
  printWeeklyReportBtn.addEventListener('click', () => window.print());

  emailWeeklyReportBtn.addEventListener('click', async () => {
    if (!adminAuthenticated) {
      showToast('Admin access required.', 'error');
      return;
    }
    const content = weeklyReportContent.innerText || '';
    if (!content || content.includes('Select a week')) {
      showToast('Please generate the report first.', 'error');
      return;
    }

    emailWeeklyReportBtn.disabled = true;
    emailWeeklyReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    const html = weeklyReportContent.innerHTML || '';
    try {
      const result = await apiWeeklyReport({
        week: reportWeek.value,
        subject: `Weekly Report — ${reportWeek.value} — Casseus Health & Wellness`,
        text: content,
        html: `<div style="font-family:system-ui,sans-serif;color:#0a2540;">${html}</div>`,
      });
      const sentLog = JSON.parse(localStorage.getItem('casseus_report_emails') || '[]');
      sentLog.push({
        to: REPORT_EMAIL,
        week: reportWeek.value,
        sentAt: new Date().toISOString(),
        preview: content.substring(0, 200),
        viaBackend: true,
        simulated: !!result.emailSimulated,
      });
      localStorage.setItem('casseus_report_emails', JSON.stringify(sentLog));
      showToast(result.emailSimulated
        ? `Report saved; email simulated (set SMTP in backend/.env). To: ${REPORT_EMAIL}`
        : `Weekly report emailed to ${REPORT_EMAIL} only (not to customers)`);
    } catch (_) {
      const sentLog = JSON.parse(localStorage.getItem('casseus_report_emails') || '[]');
      sentLog.push({
        to: REPORT_EMAIL,
        week: reportWeek.value,
        sentAt: new Date().toISOString(),
        preview: content.substring(0, 200),
        offline: true,
      });
      localStorage.setItem('casseus_report_emails', JSON.stringify(sentLog));
      showToast('Backend offline — report logged locally. Start backend to email.', 'error');
    }

    emailWeeklyReportBtn.disabled = false;
    emailWeeklyReportBtn.innerHTML = '<i class="fas fa-envelope"></i> Email Report to casseus137@gmail.com';
  });

  function generateWeeklyReport() {
    const weekStartStr = reportWeek.value;
    if (!weekStartStr) {
      weeklyReportContent.innerHTML = '<p class="empty-state">Please select a week start date.</p>';
      return;
    }

    const weekStart = getWeekStart(new Date(weekStartStr + 'T00:00:00'));
    const weekEnd = getWeekEnd(weekStart);
    const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' – '
      + weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const purchases = getPurchasedPackages().filter(p => {
      const d = new Date(p.purchasedAt);
      return d >= weekStart && d <= weekEnd;
    });

    const waivers = getWaivers().filter(w => {
      const d = new Date(w.date);
      return d >= weekStart && d <= weekEnd;
    });

    const intakes = getIntakes().filter(i => {
      const d = new Date(i.submittedAt);
      return d >= weekStart && d <= weekEnd;
    });

    let totalRevenue = 0;
    purchases.forEach(p => { totalRevenue += p.price || 0; });

    let rows = '';
    if (purchases.length === 0) {
      rows = '<tr><td colspan="7" style="text-align:center;color:#64748b;">No package purchases this week.</td></tr>';
    } else {
      purchases.forEach((p, idx) => {
        const date = new Date(p.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const waiverBadge = p.waiverSignedBy
          ? `<span class="badge-signed">Signed — ${p.waiverSignedBy}</span>`
          : `<span class="badge-missing">Missing</span>`;
        const intakeBadge = p.intakeCompletedBy
          ? `<span class="badge-signed">Completed — ${p.intakeCompletedBy}</span>`
          : `<span class="badge-missing">Missing</span>`;
        rows += `
          <tr>
            <td>${idx + 1}</td>
            <td>${date}</td>
            <td>${p.intakeCompletedBy || p.waiverSignedBy || '—'}</td>
            <td>${p.name}</td>
            <td>$${(p.price || 0).toLocaleString()}</td>
            <td>${waiverBadge}</td>
            <td>${intakeBadge}</td>
          </tr>
        `;
      });
    }

    weeklyReportContent.innerHTML = `
      <div class="report-summary">
        <strong>Week of ${weekLabel}</strong><br>
        Packages sold: <strong>${purchases.length}</strong> &nbsp;|&nbsp;
        Total revenue: <strong>$${totalRevenue.toLocaleString()}</strong> &nbsp;|&nbsp;
        Waivers signed: <strong>${waivers.length}</strong> &nbsp;|&nbsp;
        Intakes completed: <strong>${intakes.length}</strong>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Client</th>
            <th>Package</th>
            <th>Amount</th>
            <th>Liability Waiver & Disclosure</th>
            <th>Intake Form</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p class="receipt-footer-note">
        ADMIN ONLY — Report generated ${new Date().toLocaleString('en-US')}.
        This report is never shown to customers. Click "Email Report" to send only to ${REPORT_EMAIL}.
        In production this report is automatically emailed to ${REPORT_EMAIL} every Monday morning.
      </p>
    `;
  }

  // ========== Booking Form Logic ==========
  // Book from today up to 1 month (30 days) out
  const todayDate = new Date();
  const today = todayDate.toISOString().split('T')[0];
  const maxBookDate = new Date(todayDate);
  maxBookDate.setDate(maxBookDate.getDate() + 30);
  const maxBook = maxBookDate.toISOString().split('T')[0];
  sessionDate.min = today;
  sessionDate.max = maxBook;
  sessionDate.value = today;

  function updatePackageOptions() {
    const type = serviceType.value;
    packageSelect.innerHTML = '<option value="">Single Session (pay per visit)</option>';
    const purchased = getPurchasedPackages();
    Object.entries(PACKAGES).forEach(([id, pkg]) => {
      if (pkg.type === type) {
        const owned = purchased.find(p => p.id === id && p.sessionsRemaining > 0);
        const label = owned
          ? `${pkg.name} (You own – ${owned.sessionsRemaining} left)`
          : `${pkg.name} – $${pkg.price}/mo`;
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = label;
        if (owned) opt.selected = true;
        packageSelect.appendChild(opt);
      }
    });
    packageGroup.style.display = (type && type !== 'free15') ? 'block' : 'none';
  }

  function updateTimeSlots() {
    const date = sessionDate.value;
    sessionTime.innerHTML = '<option value="">Select time...</option>';
    if (!date) return;

    const day = new Date(date + 'T00:00:00').getDay();
    // Saturday (6) closed — Sunday through Friday available
    if (day === 6) {
      sessionTime.innerHTML = '<option value="">Closed on Saturdays</option>';
      return;
    }

    TIME_SLOTS.forEach(t => {
      const booked = isSlotBooked(date, t);
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = formatTime(t) + (booked ? ' — UNAVAILABLE' : '');
      opt.disabled = booked;
      if (booked) opt.style.color = '#ef4444';
      sessionTime.appendChild(opt);
    });
  }

  // Hub: Bradenton area — approx coordinates for mileage estimate
  const HUB = { lat: 27.4989, lng: -82.5748, label: 'Bradenton' };
  const CITY_COORDS = {
    tampa: { lat: 27.9506, lng: -82.4572, miles: 45 },
    bradenton: { lat: 27.4989, lng: -82.5748, miles: 0 },
    sarasota: { lat: 27.3364, lng: -82.5307, miles: 15 },
  };
  // Common ZIP centroids (approx) for local estimate
  const ZIP_MILES = {
    '33602': 48, '33606': 46, '33609': 44, '33611': 42, '33612': 50,
    '34205': 2, '34207': 4, '34208': 3, '34209': 5, '34210': 6,
    '34221': 12, '34231': 14, '34232': 16, '34233': 18, '34234': 15,
    '34235': 17, '34236': 16, '34237': 15, '34238': 20, '34239': 17,
    '34243': 8, '34201': 10, '34202': 18, '34203': 14, '34211': 20,
  };

  function haversineMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function estimateMileageFromInputs() {
    const loc = locationSelect.value;
    const addressEl = document.getElementById('address');
    const zipEl = document.getElementById('clientZip');
    const address = (addressEl && addressEl.value || '').toLowerCase();
    const zip = (zipEl && zipEl.value || '').replace(/\D/g, '').substring(0, 5);

    let miles = null;
    let source = '';

    if (zip && ZIP_MILES[zip] != null) {
      miles = ZIP_MILES[zip];
      source = 'ZIP ' + zip;
    } else if (loc && CITY_COORDS[loc]) {
      miles = CITY_COORDS[loc].miles;
      source = loc.charAt(0).toUpperCase() + loc.slice(1);
    }

    // Keyword boost from address text
    if (address.includes('sarasota') && (miles == null || miles < 10)) {
      miles = 15;
      source = 'address (Sarasota)';
    } else if (address.includes('tampa') && (miles == null || miles < 30)) {
      miles = 45;
      source = 'address (Tampa)';
    } else if ((address.includes('bradenton') || address.includes('palmetto')) && miles == null) {
      miles = 5;
      source = 'address (Bradenton area)';
    }

    if (miles == null) miles = 0;
    return { miles: Math.round(miles), source };
  }

  function calcTravelFee(loc, pkg, miles) {
    // Base policy + light mileage add-on beyond 25 miles from hub
    let fee = 0;
    let detail = '';
    if (loc === 'tampa' || loc === 'bradenton') {
      fee = 0;
      detail = 'Zone fee $0';
    } else if (loc === 'sarasota') {
      if (pkg && pkg.freq >= 4) {
        fee = 0;
        detail = 'Sarasota $25 waived (4+ session package)';
      } else {
        fee = 25;
        detail = 'Sarasota zone surcharge $25';
      }
    }
    const extraMiles = Math.max(0, (miles || 0) - 25);
    const mileageAdd = extraMiles > 0 ? Math.ceil(extraMiles / 5) * 5 : 0; // $5 per 5 miles beyond 25
    if (mileageAdd > 0 && fee === 0 && loc !== 'sarasota') {
      // optional: only add long-distance surcharge outside free zones if very far
    }
    if (loc === 'tampa' && miles > 50) {
      fee += 10;
      detail += detail ? ' + long-distance $10' : 'Long-distance $10';
    }
    return { fee, detail, miles: miles || 0 };
  }

  function updateTravelSummary() {
    const loc = locationSelect.value;
    const pkgId = packageSelect.value;
    const pkg = PACKAGES[pkgId];
    const { miles, source } = estimateMileageFromInputs();
    const result = calcTravelFee(loc, pkg, miles);

    if (!loc && !document.getElementById('address')?.value) {
      travelSummary.classList.remove('visible');
      return;
    }

    let text = '';
    if (loc || miles > 0) {
      text = '<strong>Travel estimate</strong><br>';
      if (miles > 0) {
        text += 'Approx. distance from hub (Bradenton): <strong>' + miles + ' mi</strong>';
        if (source) text += ' <span style="color:#64748b;font-size:0.85rem;">(' + source + ')</span>';
        text += '<br>';
      }
      text += 'Travel fee: <strong style="color:' + (result.fee === 0 ? '#4caf50' : '#ef4444') + '">$' + result.fee + '</strong>';
      if (result.detail) text += ' — ' + result.detail;
      text += '<br><span style="font-size:0.8rem;color:#64748b;">Fee updates as soon as you enter area, address, or ZIP.</span>';
    }

    travelSummary.innerHTML = text;
    travelSummary.classList.add('visible');
    travelSummary.dataset.fee = result.fee;
    travelSummary.dataset.miles = result.miles;
  }

  function updatePaymentVisibility() {
    const type = serviceType.value;
    const pkgId = packageSelect.value;
    const purchased = getPurchasedPackages();
    const ownsPackage = pkgId && purchased.some(p => p.id === pkgId && p.sessionsRemaining > 0);

    if (type === 'free15' || ownsPackage) {
      paymentSection.style.display = 'none';
    } else {
      paymentSection.style.display = 'block';
    }
  }

  serviceType.addEventListener('change', () => {
    updatePackageOptions();
    updatePaymentVisibility();
    updateTravelSummary();
  });

  packageSelect.addEventListener('change', () => {
    updatePaymentVisibility();
    updateTravelSummary();
  });

  locationSelect.addEventListener('change', updateTravelSummary);
  sessionDate.addEventListener('change', updateTimeSlots);

  const addressInput = document.getElementById('address');
  const clientZip = document.getElementById('clientZip');
  if (addressInput) {
    addressInput.addEventListener('input', updateTravelSummary);
    addressInput.addEventListener('blur', updateTravelSummary);
  }
  if (clientZip) {
    clientZip.addEventListener('input', updateTravelSummary);
    clientZip.addEventListener('blur', updateTravelSummary);
  }

  // Claim free stretch → preselect booking
  document.getElementById('claimFreeStretchBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    serviceType.value = 'free15';
    serviceType.dispatchEvent(new Event('change'));
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
    showToast('Free 15-min stretch selected — pick a date & time below.');
  });

  // QR code for free stretch
  (function initFreeStretchQr() {
    const img = document.getElementById('freeStretchQr');
    const urlEl = document.getElementById('freeStretchQrUrl');
    if (!img) return;
    const base = window.location.href.split('#')[0].split('?')[0];
    const target = base + '?service=free15#booking';
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(target);
    if (urlEl) urlEl.textContent = target;
    const params = new URLSearchParams(window.location.search);
    if (params.get('service') === 'free15') {
      serviceType.value = 'free15';
      serviceType.dispatchEvent(new Event('change'));
    }
  })();

  // Corporate form + travel estimate
  const corpTravelEstimate = document.getElementById('corpTravelEstimate');
  function updateCorpTravel() {
    if (!corpTravelEstimate) return;
    const addr = (document.getElementById('corpAddress')?.value || '').toLowerCase();
    let miles = 10, zone = 'Bradenton area', feeNote = 'Confirm travel on your custom quote.';
    if (addr.includes('sarasota')) { miles = 15; zone = 'Sarasota'; feeNote = 'Sarasota site fee may apply — confirmed on quote.'; }
    else if (addr.includes('tampa')) { miles = 45; zone = 'Tampa'; feeNote = '~45 mi from hub.'; }
    else if (addr.includes('bradenton') || addr.includes('palmetto')) { miles = 5; zone = 'Bradenton / nearby'; }
    if (!addr.trim()) { corpTravelEstimate.classList.remove('visible'); return; }
    corpTravelEstimate.innerHTML = '<strong>Travel estimate:</strong> ~' + miles + ' mi (' + zone + '). ' + feeNote;
    corpTravelEstimate.classList.add('visible');
  }
  document.getElementById('corpAddress')?.addEventListener('input', updateCorpTravel);
  document.getElementById('corporateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const headcount = document.getElementById('corpHeadcount').value;
    if (!headcount) { showToast('Select number of participants (5+).', 'error'); return; }
    const req = {
      org: document.getElementById('corpOrg').value.trim(),
      contact: document.getElementById('corpContact').value.trim(),
      email: document.getElementById('corpEmail').value.trim(),
      phone: document.getElementById('corpPhone').value.trim(),
      headcount,
      service: document.getElementById('corpService').value,
      address: document.getElementById('corpAddress').value.trim(),
      notes: document.getElementById('corpNotes').value.trim(),
      submittedAt: new Date().toISOString(),
    };
    const list = JSON.parse(localStorage.getItem('casseus_corporate_requests') || '[]');
    list.push(req);
    localStorage.setItem('casseus_corporate_requests', JSON.stringify(list));

    try {
      await apiNotify('corporate_request', 'Corporate Service Request', {
        Organization: req.org,
        Contact: req.contact,
        Email: req.email,
        Phone: req.phone,
        'Headcount': req.headcount,
        Service: req.service,
        Address: req.address,
        Notes: req.notes || '(none)',
      }, req.email);
      showToast('Corporate request submitted and emailed to casseus137@gmail.com.');
    } catch (_) {
      showToast('Corporate request saved. Start the backend to email casseus137@gmail.com.');
    }

    document.getElementById('corporateForm').reset();
    corpTravelEstimate?.classList.remove('visible');
  });

  // Package renewal scanner
  function scanPackagesForRenewal() {
    const pkgs = getPurchasedPackages();
    const now = Date.now();
    const offers = [];
    pkgs.forEach(p => {
      const purchased = new Date(p.purchasedAt || 0).getTime();
      const daysOld = (now - purchased) / (1000 * 60 * 60 * 24);
      const lowSessions = (p.sessionsRemaining || 0) <= 2 && (p.sessionsRemaining || 0) > 0;
      const monthEnd = daysOld >= 25;
      if (lowSessions || monthEnd) {
        const base = PACKAGES[p.id];
        const discountPct = 15;
        offers.push({
          name: p.name,
          sessionsRemaining: p.sessionsRemaining,
          discountPct,
          renewedPrice: base ? Math.round(base.price * 0.85) : null,
          reason: lowSessions ? 'Package almost used up' : 'Monthly renewal window',
        });
      }
    });
    return offers;
  }
  function showRenewalUI() {
    const offers = scanPackagesForRenewal();
    const banner = document.getElementById('renewalOfferBanner');
    if (banner && offers.length > 0) {
      const o = offers[0];
      banner.style.display = 'block';
      banner.innerHTML = '<i class="fas fa-tag"></i> <strong>Renewal offer:</strong> ' + o.reason + ' on <em>' + o.name + '</em>. Renew with <strong>' + o.discountPct + '% off</strong>' + (o.renewedPrice != null ? ' ($' + o.renewedPrice + '/mo)' : '') + '. <a href="#pricing" style="color:var(--teal-dark);font-weight:700;">See packages</a>';
    }
    if (offers.length > 0 && !sessionStorage.getItem('casseus_renewal_shown')) {
      sessionStorage.setItem('casseus_renewal_shown', '1');
      const content = document.getElementById('renewalContent');
      if (content) {
        content.innerHTML = offers.map(o => '<p><strong>' + o.name + '</strong> — ' + o.reason + '.<br>Loyalty discount: <strong style="color:var(--teal-dark);">' + o.discountPct + '% off</strong>' + (o.renewedPrice != null ? ' → $' + o.renewedPrice : '') + '.</p>').join('');
        setTimeout(() => document.getElementById('renewalModal')?.classList.add('open'), 1200);
      }
    }
  }
  showRenewalUI();
  document.getElementById('renewalClose')?.addEventListener('click', () => document.getElementById('renewalModal')?.classList.remove('open'));
  document.getElementById('renewalDismissBtn')?.addEventListener('click', () => document.getElementById('renewalModal')?.classList.remove('open'));
  document.getElementById('renewalAcceptBtn')?.addEventListener('click', () => {
    document.getElementById('renewalModal')?.classList.remove('open');
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Quarterly survey
  function shouldShowSurvey() {
    const last = localStorage.getItem('casseus_last_survey');
    if (!last) return true;
    return (Date.now() - new Date(last).getTime()) / 86400000 >= 90;
  }
  function openSurveyIfDue() {
    if (!shouldShowSurvey() || sessionStorage.getItem('casseus_survey_prompted')) return;
    if (getPurchasedPackages().length === 0 && getBookings().length === 0) return;
    sessionStorage.setItem('casseus_survey_prompted', '1');
    setTimeout(() => document.getElementById('surveyModal')?.classList.add('open'), 2500);
  }
  openSurveyIfDue();
  let surveyStars = 0;
  document.querySelectorAll('#starRating button').forEach(btn => {
    btn.addEventListener('click', () => {
      surveyStars = parseInt(btn.dataset.r, 10);
      document.getElementById('surveyRating').value = surveyStars;
      document.querySelectorAll('#starRating button').forEach(b => b.classList.toggle('active', parseInt(b.dataset.r, 10) <= surveyStars));
    });
  });
  document.getElementById('surveyClose')?.addEventListener('click', () => document.getElementById('surveyModal')?.classList.remove('open'));
  document.getElementById('surveyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!surveyStars) { showToast('Please select a star rating.', 'error'); return; }
    const survey = {
      name: document.getElementById('surveyName').value.trim(),
      email: document.getElementById('surveyEmail').value.trim(),
      rating: surveyStars,
      comment: document.getElementById('surveyComment').value.trim(),
      submittedAt: new Date().toISOString(),
    };
    // Always keep a local copy
    const surveys = JSON.parse(localStorage.getItem('casseus_surveys') || '[]');
    surveys.push(survey);
    localStorage.setItem('casseus_surveys', JSON.stringify(surveys));
    localStorage.setItem('casseus_last_survey', survey.submittedAt);

    let emailed = false;
    let simulated = true;
    try {
      const result = await apiSubmitSurvey(survey);
      emailed = true;
      simulated = !!result.emailSimulated;
    } catch (_) {
      // Backend offline — local only
      const emails = JSON.parse(localStorage.getItem('casseus_survey_emails') || '[]');
      emails.push({ to: 'casseus137@gmail.com', survey, sentAt: new Date().toISOString(), offline: true });
      localStorage.setItem('casseus_survey_emails', JSON.stringify(emails));
    }

    document.getElementById('surveyModal')?.classList.remove('open');
    document.getElementById('surveyForm')?.reset();
    surveyStars = 0;
    document.querySelectorAll('#starRating button').forEach(b => b.classList.remove('active'));
    if (emailed && !simulated) {
      showToast('Survey submitted. Email report sent to casseus137@gmail.com.');
    } else if (emailed && simulated) {
      showToast('Survey saved on server (email simulated — configure SMTP in backend/.env).');
    } else {
      showToast('Survey saved locally. Start the backend to email casseus137@gmail.com.');
    }
  });

  // Business insights
  function buildBusinessInsights() {
    const bookings = getBookings();
    const packages = getPurchasedPackages();
    const questions = JSON.parse(localStorage.getItem('casseus_questions') || '[]');
    const corp = JSON.parse(localStorage.getItem('casseus_corporate_requests') || '[]');
    const surveys = JSON.parse(localStorage.getItem('casseus_surveys') || '[]');
    const recs = [];
    if (!bookings.length) recs.push('No bookings yet — promote the free 15-min stretch QR on Instagram and at local offices.');
    else {
      if (bookings.some(b => (b.service || '').toLowerCase().includes('free')) && !packages.length)
        recs.push('Free-session leads without packages — follow up within 48 hours with a starter offer.');
      if (bookings.filter(b => (b.location || '').toLowerCase().includes('sarasota')).length >= 3)
        recs.push('Strong Sarasota demand — consider a fixed weekly route day.');
    }
    if (packages.some(p => (p.sessionsRemaining || 0) <= 2))
      recs.push('Some packages are nearly empty — push the 15% renewal offer.');
    if (!corp.length) recs.push('No corporate requests yet — pitch Corporate Stretch to offices of 5+.');
    else recs.push(corp.length + ' corporate request(s) waiting — prioritize largest headcount.');
    if (questions.length > 3) recs.push(questions.length + ' Help-form questions open — reply within 24 hours.');
    if (surveys.length) {
      const avg = surveys.reduce((s, x) => s + (x.rating || 0), 0) / surveys.length;
      recs.push('Survey average: ' + avg.toFixed(1) + '/5 (' + surveys.length + ' responses).');
    } else recs.push('No surveys yet — prompts appear every 90 days for active clients.');
    recs.push('Share free-stretch QR at gyms, chiropractic offices, and corporate break rooms.');
    recs.push('Post one mobility tip weekly on Instagram to feed referrals and affiliates.');
    return {
      stats: { bookings: bookings.length, packages: packages.length, corporate: corp.length, questions: questions.length, surveys: surveys.length },
      recs,
    };
  }
  function openInsights() {
    const data = buildBusinessInsights();
    const el = document.getElementById('insightsContent');
    if (!el) return;
    el.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:20px;">' +
      Object.entries(data.stats).map(([k, v]) =>
        '<div style="background:var(--off-white);padding:14px;border-radius:10px;text-align:center;"><div style="font-size:1.4rem;font-weight:800;color:var(--navy);">' + v + '</div><div style="font-size:0.8rem;color:#64748b;text-transform:capitalize;">' + k + '</div></div>'
      ).join('') + '</div><h4>Recommendations</h4><ul style="line-height:1.7;">' +
      data.recs.map(r => '<li>' + r + '</li>').join('') + '</ul>';
    document.getElementById('insightsModal')?.classList.add('open');
  }
  document.getElementById('insightsClose')?.addEventListener('click', () => document.getElementById('insightsModal')?.classList.remove('open'));
  document.getElementById('insightsCloseBtn')?.addEventListener('click', () => document.getElementById('insightsModal')?.classList.remove('open'));
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault();
      if (sessionStorage.getItem('casseus_admin') === '1') openInsights();
      else showToast('Admin login required first (#admin or Ctrl+Shift+A).', 'error');
    }
  });

  // Booking assistant tips
  function updateBookingAssistant() {
    const tip = document.getElementById('bookingAssistantTip');
    if (!tip) return;
    const type = serviceType.value;
    let msg = '';
    if (type === 'free15') msg = 'Assistant: Free intro selected. Choose any open Sunday–Friday slot. Afterward we’ll recommend the best package for your goals.';
    else if (type === 'stretch30' || type === 'stretch60') msg = 'Assistant: Packages save more at 2x+/week. Enter address/ZIP for instant travel fee. Teams of 5+ → Corporate section.';
    else if (type === 'pt30' || type === 'pt60') msg = 'Assistant: Lock a weekly slot with a monthly package under Pricing, then book remaining sessions here.';
    if (msg) { tip.style.display = 'block'; tip.innerHTML = '<i class="fas fa-robot"></i> ' + msg; }
    else tip.style.display = 'none';
  }
  serviceType.addEventListener('change', updateBookingAssistant);

  // Initial
  updateTimeSlots();

  // ========== Submit Booking ==========
  bookingForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const type = serviceType.value;
    const date = sessionDate.value;
    const time = sessionTime.value;
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const location = locationSelect.value;
    const address = document.getElementById('address').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const pkgId = packageSelect.value;

    if (!type || !date || !time || !name || !phone || !email || !location || !address) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (isSlotBooked(date, time)) {
      showToast('Sorry, that time slot was just booked. Please choose another.', 'error');
      updateTimeSlots();
      return;
    }

    // Calculate amount
    let amount = 0;
    let packageUsed = null;
    const purchased = getPurchasedPackages();

    if (type === 'free15') {
      amount = 0;
    } else if (pkgId) {
      const owned = purchased.find(p => p.id === pkgId && p.sessionsRemaining > 0);
      if (owned) {
        packageUsed = pkgId;
        amount = 0; // covered by package
      } else {
        amount = SINGLE_PRICES[type] || 0;
      }
    } else {
      amount = SINGLE_PRICES[type] || 0;
    }

    // Travel fee
    const travelFee = parseInt(travelSummary.dataset.fee || '0', 10);
    const total = amount + travelFee;

    // Paid singles: send to Stripe Checkout when configured
    if (total > 0) {
      const payBtn = document.getElementById('submitBooking');
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = 'Connecting to Stripe…';
      }
      try {
        const session = await apiFetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({
            kind: 'session',
            serviceType: type,
            location,
            date,
            time,
            email,
            name,
            phone,
            address,
            notes,
          }),
        });
        if (session && session.url) {
          sessionStorage.setItem('casseus_pending_booking', JSON.stringify({
            service: SERVICE_LABELS[type] || type, type, date, time, name, phone, email,
            location, address, notes, amount: total, travelFee, packageUsed,
          }));
          window.location.href = session.url;
          return;
        }
      } catch (err) {
        showToast('Stripe not connected — session will be booked and you can pay by arrangement.', 'error');
      } finally {
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = 'Confirm & Book Session';
        }
      }
    }

    // Create booking
    const booking = {
      id: 'BK' + Date.now(),
      service: SERVICE_LABELS[type] || type,
      type,
      date,
      time,
      name,
      phone,
      email,
      location,
      address,
      notes,
      amount: total,
      travelFee,
      packageUsed,
      createdAt: new Date().toISOString(),
    };

    try {
      await persistBookingToServer(booking);
    } catch (err) {
      if (err && err.status === 409) {
        showToast('That time slot was just booked. Please choose another.', 'error');
        await syncBookingsFromServer();
        updateTimeSlots();
        return;
      }
    }

    // Save booking locally as well
    const bookings = getBookings();
    if (!bookings.some((b) => b.date === date && b.time === time)) bookings.push(booking);
    saveBookings(bookings);

    // Decrement package sessions if used
    if (packageUsed) {
      const pkgs = getPurchasedPackages();
      const idx = pkgs.findIndex(p => p.id === packageUsed && p.sessionsRemaining > 0);
      if (idx >= 0) {
        pkgs[idx].sessionsRemaining -= 1;
        savePurchasedPackages(pkgs);
      }
    }

    // Refresh UI
    updateTimeSlots();
    renderBookings();
    bookingForm.reset();
    sessionDate.value = today;
    packageGroup.style.display = 'none';
    paymentSection.style.display = 'block';
    travelSummary.classList.remove('visible');
    const tip = document.getElementById('bookingAssistantTip');
    if (tip) tip.style.display = 'none';
    const renewBan = document.getElementById('renewalOfferBanner');
    if (renewBan) { /* keep visible if still relevant */ }

    showToast(`Booked! ${SERVICE_LABELS[type]} on ${formatDate(date)} at ${formatTime(time)}. Confirmation sent to ${email}.`);
  });

  // ========== Render Bookings ==========
  function renderBookings() {
    const bookings = getBookings().sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    if (bookings.length === 0) {
      bookingsList.innerHTML = '<p class="empty-state">No bookings yet. Select a time to get started.</p>';
      return;
    }

    bookingsList.innerHTML = bookings.map(b => `
      <div class="booking-item">
        <strong>${escapeHtml(b.service)}</strong>
        <div class="meta">${formatDate(b.date)} · ${formatTime(b.time)}</div>
        <div class="meta">${escapeHtml(b.name)} · ${escapeHtml(b.location)}</div>
        ${b.amount > 0 ? `<div class="meta">Paid: $${Number(b.amount)}</div>` : '<div class="meta" style="color:#4caf50">Covered / Free</div>'}
      </div>
    `).join('');
  }

  // Initial render
  renderBookings();

  // Card number formatting
  const cardNumber = document.getElementById('cardNumber');
  if (cardNumber) {
    cardNumber.addEventListener('input', function () { // leftover formatter if field exists
      let v = this.value.replace(/\D/g, '').substring(0, 16);
      this.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    });
  }

  // Expiry formatting
  const cardExpiry = document.getElementById('cardExpiry');
  if (cardExpiry) {
    cardExpiry.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
      this.value = v;
    });
  }

  // ========== Ask a Question Form ==========
  const questionForm = document.getElementById('questionForm');
  if (questionForm) {
    questionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('qName').value.trim();
      const email = document.getElementById('qEmail').value.trim();
      const phone = document.getElementById('qPhone').value.trim();
      const topic = document.getElementById('qTopic').value;
      const message = document.getElementById('qMessage').value.trim();

      if (!name || !email || !topic || !message) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }

      const questions = JSON.parse(localStorage.getItem('casseus_questions') || '[]');
      questions.push({
        name,
        email,
        phone,
        topic,
        message,
        submittedAt: new Date().toISOString(),
      });
      localStorage.setItem('casseus_questions', JSON.stringify(questions));

      try {
        await apiNotify('customer_question', 'Website Question: ' + topic, {
          Name: name,
          Email: email,
          Phone: phone || '(none)',
          Topic: topic,
          Message: message,
        }, email);
        showToast(`Thanks ${name.split(' ')[0]}! Your question was emailed to our team. We’ll reply to ${email}.`);
      } catch (_) {
        showToast(`Thanks ${name.split(' ')[0]}! Question saved. Start the backend to email the team.`);
      }

      questionForm.reset();
    });
  }

  // ========== Referral Program ==========
  function generateReferralCode(name, email) {
    const base = (name || email || 'FRIEND').replace(/[^a-zA-Z]/g, '').substring(0, 6).toUpperCase() || 'CASSEU';
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return base + suffix;
  }

  const refYourEmail = document.getElementById('refYourEmail');
  const refYourName = document.getElementById('refYourName');
  const refCodeInput = document.getElementById('refCode');
  const referralCodeDisplay = document.getElementById('referralCodeDisplay');
  const copyRefCode = document.getElementById('copyRefCode');

  const existingCode = localStorage.getItem('casseus_my_ref_code');
  if (existingCode) {
    if (refCodeInput) refCodeInput.value = existingCode;
    if (referralCodeDisplay) referralCodeDisplay.textContent = existingCode;
  }

  if (refYourEmail) {
    refYourEmail.addEventListener('blur', () => {
      if (!localStorage.getItem('casseus_my_ref_code') && (refYourName.value || refYourEmail.value)) {
        const code = generateReferralCode(refYourName.value, refYourEmail.value);
        localStorage.setItem('casseus_my_ref_code', code);
        if (refCodeInput) refCodeInput.value = code;
        if (referralCodeDisplay) referralCodeDisplay.textContent = code;
      }
    });
  }

  if (copyRefCode) {
    copyRefCode.addEventListener('click', () => {
      const code = (referralCodeDisplay && referralCodeDisplay.textContent !== '————')
        ? referralCodeDisplay.textContent
        : (refCodeInput && refCodeInput.value);
      if (!code || code === '————') {
        showToast('Enter your name or email first to generate a code.', 'error');
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => showToast('Referral code copied: ' + code));
      } else {
        showToast('Your code is: ' + code);
      }
    });
  }

  const referralForm = document.getElementById('referralForm');
  if (referralForm) {
    referralForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const yourName = document.getElementById('refYourName').value.trim();
      const yourEmail = document.getElementById('refYourEmail').value.trim();
      const yourPhone = document.getElementById('refYourPhone').value.trim();
      const friendName = document.getElementById('refFriendName').value.trim();
      const friendEmail = document.getElementById('refFriendEmail').value.trim();
      const friendPhone = document.getElementById('refFriendPhone').value.trim();
      const message = document.getElementById('refMessage').value.trim();

      if (!yourName || !yourEmail || !friendName || !friendEmail) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }

      let code = localStorage.getItem('casseus_my_ref_code');
      if (!code) {
        code = generateReferralCode(yourName, yourEmail);
        localStorage.setItem('casseus_my_ref_code', code);
      }
      if (refCodeInput) refCodeInput.value = code;
      if (referralCodeDisplay) referralCodeDisplay.textContent = code;

      const referrals = JSON.parse(localStorage.getItem('casseus_referrals') || '[]');
      referrals.push({
        referrerName: yourName,
        referrerEmail: yourEmail,
        referrerPhone: yourPhone,
        referralCode: code,
        friendName,
        friendEmail,
        friendPhone,
        message,
        status: 'pending',
        reward: { referrer: '$25 credit', friend: '10% off first package' },
        submittedAt: new Date().toISOString(),
      });
      localStorage.setItem('casseus_referrals', JSON.stringify(referrals));

      referralForm.reset();
      if (refCodeInput) refCodeInput.value = code;
      showToast(`Referral sent! Your code is ${code}. You’ll get $25 credit when ${friendName.split(' ')[0]} completes their first paid session.`);
    });
  }

  // ========== Live Chat Widget ==========
  const CHAT_KEY = 'casseus_chat_messages';
  const chatWidget = document.getElementById('chatWidget');
  const chatToggle = document.getElementById('chatToggle');
  const chatPanel = document.getElementById('chatPanel');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMinimize = document.getElementById('chatMinimize');
  const chatIconOpen = document.getElementById('chatIconOpen');
  const chatIconClose = document.getElementById('chatIconClose');
  const chatQuickReplies = document.getElementById('chatQuickReplies');

  const AUTO_REPLIES = {
    'free 15': "Great choice! Our free 15-minute assisted mobility stretch is a perfect intro. You can book it under Book Now → select \"FREE 15-Min Assisted Mobility Stretch\". We come to you in Tampa, Bradenton & Sarasota!",
    'pricing': "We offer monthly packages for 30-min and 60-min assisted stretching and personal training, with savings when you train more often. Check the Pricing section on this page for full details, or ask about a specific package!",
    'travel': "We serve Tampa, Bradenton & Sarasota, FL. Travel is FREE in Tampa & Bradenton. Sarasota is a $25 surcharge (waived on 4+ session monthly packages).",
    'stretch': "Assisted stretching (PNF) uses our specialized stretch bench so we can safely lengthen muscles beyond what you can do alone — great for back pain, posture, mobility, and recovery. Want to try a free 15-min session?",
    'book': "You can book right on this website under Book Now. Choose your service, date, and time. Booked slots become unavailable instantly. Need help picking a package? Just ask!",
    'default': "Thanks for your message! A team member will follow up soon. For a faster response, call or text us at 240-571-7253 or email casseus137@gmail.com. You can also book a session or free stretch directly on this site."
  };

  function getChatHistory() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveChatMessage(role, text) {
    const history = getChatHistory();
    history.push({ role, text, time: new Date().toISOString() });
    localStorage.setItem(CHAT_KEY, JSON.stringify(history));
  }

  function formatChatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function appendBubble(role, text, timeIso) {
    const div = document.createElement('div');
    div.className = 'chat-bubble ' + role;
    div.innerHTML = `<p>${text}</p><span class="chat-time">${timeIso ? formatChatTime(timeIso) : 'Just now'}</span>`;
    // Remove quick replies once user starts chatting
    if (chatQuickReplies) chatQuickReplies.style.display = 'none';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    let el = document.getElementById('chatTyping');
    if (!el && chatMessages) {
      el = document.createElement('div');
      el.className = 'chat-typing';
      el.id = 'chatTyping';
      el.innerHTML = '<span></span><span></span><span></span>';
      chatMessages.appendChild(el);
    } else if (el) {
      el.style.display = 'flex';
      el.innerHTML = '<span></span><span></span><span></span>';
      if (chatMessages && el.parentNode !== chatMessages) chatMessages.appendChild(el);
    }
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.style.display = 'none';
  }

  function getAutoReply(userText) {
    const t = userText.toLowerCase();
    if (t.includes('free') || t.includes('15') || t.includes('qr')) return AUTO_REPLIES['free 15'] + ' You can also scan the QR code on the Free Stretch section or open Book Now with the free option pre-selected.';
    if (t.includes('corporate') || t.includes('office') || t.includes('company') || t.includes('team') || t.includes('employees')) {
      return 'For teams of 5+, see our Corporate section: group stretch from $425/session (5–9 people) and corporate PT from $75/person. Register your organization on the site and we’ll confirm travel + pricing. Or call 240-571-7253.';
    }
    if (t.includes('price') || t.includes('cost') || t.includes('package') || t.includes('how much') || t.includes('renew')) {
      return AUTO_REPLIES['pricing'] + ' Active clients near the end of a package get a 15% loyalty renewal offer automatically.';
    }
    if (t.includes('travel') || t.includes('area') || t.includes('tampa') || t.includes('bradenton') || t.includes('sarasota') || t.includes('location') || t.includes('mileage') || t.includes('fee')) {
      return AUTO_REPLIES['travel'] + ' Enter your full address or ZIP on the booking form — travel fee and approximate mileage calculate instantly.';
    }
    if (t.includes('stretch') || t.includes('pnf') || t.includes('mobility') || t.includes('flexibility')) return AUTO_REPLIES['stretch'];
    if (t.includes('book') || t.includes('schedule') || t.includes('appointment') || t.includes('available') || t.includes('help me')) {
      return 'I can help you book: 1) Open Book Now, 2) Choose Free 15-min or a paid service, 3) Enter name, phone, email, area, address/ZIP (fee calculates automatically), 4) Pick a Sunday–Friday time. Booked slots lock immediately. Need a package first? Check Pricing. Corporate team? Use the Corporate form.';
    }
    if (t.includes('survey') || t.includes('feedback') || t.includes('rate')) {
      return 'Every 3 months we invite clients to rate our services. Your feedback is sent to casseus137@gmail.com so we can improve.';
    }
    return AUTO_REPLIES['default'];
  }

  function sendUserMessage(text) {
    if (!text.trim()) return;
    appendBubble('user', text);
    saveChatMessage('user', text);

    showTyping();
    setTimeout(() => {
      hideTyping();
      const reply = getAutoReply(text);
      appendBubble('bot', reply);
      saveChatMessage('bot', reply);
    }, 900 + Math.random() * 600);
  }

  function toggleChat(open) {
    if (open === undefined) {
      chatWidget.classList.toggle('open');
    } else if (open) {
      chatWidget.classList.add('open');
    } else {
      chatWidget.classList.remove('open');
    }
    const isOpen = chatWidget.classList.contains('open');
    chatIconOpen.style.display = isOpen ? 'none' : 'inline';
    chatIconClose.style.display = isOpen ? 'inline' : 'none';
    if (isOpen) {
      chatInput.focus();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  if (chatToggle) {
    chatToggle.addEventListener('click', () => toggleChat());
  }
  if (chatMinimize) {
    chatMinimize.addEventListener('click', () => toggleChat(false));
  }

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      sendUserMessage(text);
    });
  }

  if (chatQuickReplies) {
    chatQuickReplies.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        sendUserMessage(btn.dataset.msg || btn.textContent);
      });
    });
  }

  // Restore previous chat history (optional — keeps conversation if they return)
  const history = getChatHistory();
  if (history.length > 0 && chatMessages) {
    // Keep the welcome bubble, then append history
    history.forEach(m => {
      if (m.role === 'user' || m.role === 'bot') {
        appendBubble(m.role, m.text, m.time);
      }
    });
  }


  syncBookingsFromServer();

  // ========== Lazy loading (native + IntersectionObserver fallback) ==========
  (function initLazyLoading() {
    const supportsNativeLazy = 'loading' in HTMLImageElement.prototype;

    function loadLazyImage(img) {
      if (!img || img.dataset.lazyLoaded === '1') return;
      const dataSrc = img.getAttribute('data-src');
      const dataSrcset = img.getAttribute('data-srcset');
      if (dataSrc) {
        img.src = dataSrc;
        img.removeAttribute('data-src');
      }
      if (dataSrcset) {
        img.srcset = dataSrcset;
        img.removeAttribute('data-srcset');
      }
      img.dataset.lazyLoaded = '1';
      img.classList.add('lazy-loaded');
      img.classList.remove('lazy-pending');
    }

    // Images that use data-src (explicit progressive pattern)
    const dataSrcImgs = document.querySelectorAll('img[data-src]');
    // For browsers without native lazy: also handle loading="lazy" by deferring via IO
    let imgsToObserve = [];

    if (supportsNativeLazy) {
      // Native handles loading="lazy"; still observe data-src images
      imgsToObserve = Array.from(dataSrcImgs);
    } else {
      // Fallback: convert loading="lazy" imgs to data-src and observe all
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        if (img.getAttribute('data-src')) return;
        const current = img.getAttribute('src');
        if (!current || current.startsWith('data:')) return;
        img.setAttribute('data-src', current);
        img.removeAttribute('src');
        img.classList.add('lazy-pending');
        // tiny transparent placeholder keeps layout if width/height set
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
      });
      imgsToObserve = Array.from(document.querySelectorAll('img[data-src]'));
    }

    if (!imgsToObserve.length) return;

    function reveal(img) {
      loadLazyImage(img);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            obs.unobserve(entry.target);
          });
        },
        { root: null, rootMargin: '200px 0px', threshold: 0.01 }
      );
      imgsToObserve.forEach((img) => io.observe(img));
    } else {
      // Very old browsers: load everything
      imgsToObserve.forEach(reveal);
    }
  })();


})();
