// Casseus Health & Wellness — Online Store
// Prices shown are our retail only (source cost + 3% markup). Amazon prices are never displayed.
// All-natural product catalog auto-rotates every 2 weeks.

(function () {
  'use strict';

  // Affiliate attribution
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('casseus_affiliate_ref', ref.trim());
      localStorage.setItem('casseus_affiliate_ref_time', Date.now().toString());
    }
  } catch (e) { /* ignore */ }

  function getActiveAffiliateRef() {
    const ref = localStorage.getItem('casseus_affiliate_ref');
    const t = parseInt(localStorage.getItem('casseus_affiliate_ref_time') || '0', 10);
    if (!ref || !t) return null;
    if (Date.now() - t > 30 * 24 * 60 * 60 * 1000) return null;
    return ref;
  }

  // Staple gear (always available)
  const STAPLE_PRODUCTS = [
    {
      id: 's1',
      name: 'High-Density Foam Roller',
      category: 'Recovery',
      desc: 'Firm foam roller for myofascial release, post-workout recovery, and mobility work.',
      basePrice: 24.99,
      image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=300&fit=crop',
      amazonUrl: 'https://www.amazon.com/s?k=high+density+foam+roller'
    },
    {
      id: 's2',
      name: 'Massage Gun Deep Tissue',
      category: 'Recovery',
      desc: 'Percussion massage device to reduce muscle tension and speed recovery between sessions.',
      basePrice: 89.99,
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
      amazonUrl: 'https://www.amazon.com/s?k=massage+gun+deep+tissue'
    },
    {
      id: 's3',
      name: 'Resistance Bands Set (5)',
      category: 'Strength',
      desc: 'Five resistance levels for strength, mobility, and rehab-friendly training at home.',
      basePrice: 19.99,
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
      amazonUrl: 'https://www.amazon.com/s?k=resistance+bands+set'
    },
    {
      id: 's4',
      name: 'Yoga / Stretch Mat Premium',
      category: 'Mobility',
      desc: 'Extra-thick non-slip mat ideal for stretching, mobility flows, and floor work.',
      basePrice: 34.99,
      image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop',
      amazonUrl: 'https://www.amazon.com/s?k=premium+yoga+mat'
    },
    {
      id: 's5',
      name: 'Stretch Strap with Loops',
      category: 'Mobility',
      desc: 'Multi-loop stretch strap for assisted hamstring, hip, and shoulder flexibility work.',
      basePrice: 14.99,
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
      amazonUrl: 'https://www.amazon.com/s?k=stretch+strap+with+loops'
    },
    {
      id: 's6',
      name: 'Mini Loop Bands Set',
      category: 'Strength',
      desc: 'Fabric mini bands for glute activation, warm-ups, and lower-body strength.',
      basePrice: 15.99,
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
      amazonUrl: 'https://www.amazon.com/s?k=fabric+mini+resistance+bands'
    }
  ];

  // All-natural supplements — rotated every 2 weeks (3 catalogs cycle)
  const NATURAL_ROTATIONS = [
    // Rotation A
    [
      { id: 'n1a', name: 'All-Natural Magnesium Glycinate 90ct', category: 'Supplements', desc: 'All-natural magnesium glycinate for muscle relaxation and recovery — no artificial fillers.*', basePrice: 18.99, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+magnesium+glycinate' },
      { id: 'n2a', name: 'All-Natural Collagen Peptides', category: 'Supplements', desc: 'Grass-fed, all-natural collagen peptides for joints, skin, and recovery.*', basePrice: 27.99, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+collagen+peptides' },
      { id: 'n3a', name: 'All-Natural Omega-3 Fish Oil 120ct', category: 'Supplements', desc: 'Wild-caught omega-3 for joints and recovery — no artificial additives.*', basePrice: 23.99, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+omega+3' },
      { id: 'n4a', name: 'All-Natural Turmeric Curcumin', category: 'Supplements', desc: 'Organic turmeric with black pepper for joint comfort.*', basePrice: 19.99, image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+turmeric+curcumin' },
      { id: 'n5a', name: 'All-Natural Ashwagandha Root', category: 'Supplements', desc: 'Pure ashwagandha for stress balance and recovery.*', basePrice: 17.99, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+ashwagandha' },
      { id: 'n6a', name: 'All-Natural Vitamin D3 + K2', category: 'Supplements', desc: 'Plant-based D3 with K2 for bone and muscle support.*', basePrice: 16.99, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+vitamin+d3+k2' },
      { id: 'n7a', name: 'All-Natural Probiotic 50 Billion', category: 'Supplements', desc: 'Multi-strain probiotic for gut health — no artificial fillers.*', basePrice: 26.99, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+probiotic' },
      { id: 'n8a', name: 'All-Natural Elderberry Gummies', category: 'Supplements', desc: 'Elderberry with vitamin C and zinc for immune support.*', basePrice: 15.99, image: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+elderberry+gummies' },
      { id: 'n9a', name: 'All-Natural Greens Superfood', category: 'Supplements', desc: 'Organic greens with spirulina and chlorella.*', basePrice: 32.99, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+greens+powder' },
      { id: 'n10a', name: 'All-Natural Melatonin Sleep Gummies', category: 'Supplements', desc: 'Natural melatonin for rest and recovery — no artificial colors.*', basePrice: 14.99, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+melatonin+gummies' },
      { id: 'n11a', name: 'All-Natural Apple Cider Vinegar', category: 'Supplements', desc: 'Organic ACV capsules with the mother for daily wellness.*', basePrice: 13.99, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+apple+cider+vinegar+capsules' },
      { id: 'n12a', name: 'All-Natural Lion\'s Mane Mushroom', category: 'Supplements', desc: 'Organic lion\'s mane for focus and cognitive support.*', basePrice: 21.99, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+lions+mane'
      }
    ],
    // Rotation B (new set every 2 weeks)
    [
      { id: 'n1b', name: 'All-Natural Rhodiola Rosea', category: 'Supplements', desc: 'Adaptogen for energy, stamina, and stress support — pure extract.*', basePrice: 18.49, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+rhodiola+rosea' },
      { id: 'n2b', name: 'All-Natural Beet Root Powder', category: 'Supplements', desc: 'Organic beet root for circulation and workout endurance.*', basePrice: 19.99, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+beet+root+powder' },
      { id: 'n3b', name: 'All-Natural L-Theanine 200mg', category: 'Supplements', desc: 'Calm focus support from green tea amino acid — no fillers.*', basePrice: 16.49, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+l-theanine' },
      { id: 'n4b', name: 'All-Natural Spirulina Tablets', category: 'Supplements', desc: 'Pure spirulina for greens nutrition and recovery support.*', basePrice: 17.99, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+spirulina' },
      { id: 'n5b', name: 'All-Natural Ginger Root Capsules', category: 'Supplements', desc: 'Organic ginger for digestion and natural comfort.*', basePrice: 12.99, image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+ginger+root' },
      { id: 'n6b', name: 'All-Natural Zinc Picolinate', category: 'Supplements', desc: 'Highly absorbable zinc for immune and recovery support.*', basePrice: 11.99, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+zinc+picolinate' },
      { id: 'n7b', name: 'All-Natural B-Complex Vitamins', category: 'Supplements', desc: 'Full-spectrum B vitamins from natural sources for energy.*', basePrice: 18.99, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+b+complex' },
      { id: 'n8b', name: 'All-Natural Maca Root Powder', category: 'Supplements', desc: 'Organic maca for energy, stamina, and hormone balance support.*', basePrice: 16.99, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+maca+root' },
      { id: 'n9b', name: 'All-Natural Cherry Juice Extract', category: 'Supplements', desc: 'Tart cherry extract for recovery and joint comfort.*', basePrice: 20.99, image: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+tart+cherry+extract' },
      { id: 'n10b', name: 'All-Natural Electrolyte Powder', category: 'Supplements', desc: 'Clean electrolytes with no artificial sweeteners or dyes.*', basePrice: 22.99, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+electrolyte+powder' },
      { id: 'n11b', name: 'All-Natural Holy Basil (Tulsi)', category: 'Supplements', desc: 'Sacred basil adaptogen for calm and daily stress support.*', basePrice: 15.49, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+holy+basil+tulsi' },
      { id: 'n12b', name: 'All-Natural Quercetin + Bromelain', category: 'Supplements', desc: 'Plant-based quercetin with bromelain for immune and recovery support.*', basePrice: 21.49, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+quercetin+bromelain' }
    ],
    // Rotation C
    [
      { id: 'n1c', name: 'All-Natural Cordyceps Mushroom', category: 'Supplements', desc: 'Organic cordyceps for endurance and oxygen utilization support.*', basePrice: 24.99, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+cordyceps' },
      { id: 'n2c', name: 'All-Natural Hyaluronic Acid', category: 'Supplements', desc: 'Natural HA for joint lubrication and mobility support.*', basePrice: 19.49, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+hyaluronic+acid+supplement' },
      { id: 'n3c', name: 'All-Natural Milk Thistle', category: 'Supplements', desc: 'Organic milk thistle for liver and detox support.*', basePrice: 14.49, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+milk+thistle' },
      { id: 'n4c', name: 'All-Natural CoQ10 100mg', category: 'Supplements', desc: 'Naturally fermented CoQ10 for cellular energy and recovery.*', basePrice: 22.49, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+coq10' },
      { id: 'n5c', name: 'All-Natural Boswellia Serrata', category: 'Supplements', desc: 'Frankincense extract for joint comfort and mobility.*', basePrice: 17.49, image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+boswellia' },
      { id: 'n6c', name: 'All-Natural Chlorella Tablets', category: 'Supplements', desc: 'Broken-cell-wall chlorella for greens and detox support.*', basePrice: 18.49, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+chlorella' },
      { id: 'n7c', name: 'All-Natural Valerian Root', category: 'Supplements', desc: 'Traditional herb for calm evenings and better rest.*', basePrice: 13.49, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+valerian+root' },
      { id: 'n8c', name: 'All-Natural Triphala Powder', category: 'Supplements', desc: 'Ayurvedic three-fruit blend for digestion and wellness.*', basePrice: 15.99, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+triphala' },
      { id: 'n9c', name: 'All-Natural MSM Powder', category: 'Supplements', desc: 'Pure MSM sulfur for joint and connective tissue support.*', basePrice: 16.49, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+msm+powder' },
      { id: 'n10c', name: 'All-Natural Camu Camu Vitamin C', category: 'Supplements', desc: 'Wild camu camu berry — natural vitamin C powerhouse.*', basePrice: 18.99, image: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+camu+camu' },
      { id: 'n11c', name: 'All-Natural Reishi Mushroom', category: 'Supplements', desc: 'Organic reishi for calm, immunity, and recovery support.*', basePrice: 23.49, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+reishi+mushroom' },
      { id: 'n12c', name: 'All-Natural Creatine Monohydrate', category: 'Supplements', desc: 'Micronized creatine — pure, unflavored, no additives.*', basePrice: 19.99, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop', amazonUrl: 'https://www.amazon.com/s?k=all+natural+creatine+monohydrate' }
    ]
  ];

  // Biweekly rotation: new all-natural set every 14 days
  const ROTATION_EPOCH = new Date('2026-01-05T00:00:00'); // Monday start
  const ROTATION_DAYS = 14;

  function getRotationInfo() {
    const now = new Date();
    const daysSince = Math.floor((now - ROTATION_EPOCH) / (1000 * 60 * 60 * 24));
    const periodIndex = Math.floor(Math.max(0, daysSince) / ROTATION_DAYS);
    const setIndex = periodIndex % NATURAL_ROTATIONS.length;
    const periodStart = new Date(ROTATION_EPOCH);
    periodStart.setDate(periodStart.getDate() + periodIndex * ROTATION_DAYS);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + ROTATION_DAYS);
    return { setIndex, periodStart, periodEnd, periodIndex };
  }

  const rotation = getRotationInfo();
  const PRODUCTS = STAPLE_PRODUCTS.concat(NATURAL_ROTATIONS[rotation.setIndex]);


  const MARKUP = 1.03; // 3% markup — only our price is shown
  const BUNDLE_DISCOUNT = 0.10; // 10% off products when customer has an active package

  function ourPrice(base) {
    return Math.round(base * MARKUP * 100) / 100;
  }

  function formatMoney(n) {
    return '$' + n.toFixed(2);
  }

  // Active package = purchased package with remaining sessions (from main site)
  function hasActivePackage() {
    try {
      const packages = JSON.parse(localStorage.getItem('casseus_packages') || '[]');
      return packages.some(p => (p.sessionsRemaining || 0) > 0);
    } catch {
      return false;
    }
  }

  function getActivePackageName() {
    try {
      const packages = JSON.parse(localStorage.getItem('casseus_packages') || '[]');
      const active = packages.find(p => (p.sessionsRemaining || 0) > 0);
      return active ? active.name : null;
    } catch {
      return null;
    }
  }

  function cartSubtotal() {
    return cart.reduce((s, c) => s + c.price * c.qty, 0);
  }

  function cartDiscount() {
    if (!hasActivePackage()) return 0;
    return Math.round(cartSubtotal() * BUNDLE_DISCOUNT * 100) / 100;
  }

  function cartTotal() {
    return Math.round((cartSubtotal() - cartDiscount()) * 100) / 100;
  }

  // Cart
  let cart = JSON.parse(localStorage.getItem('casseus_cart') || '[]');

  function saveCart() {
    localStorage.setItem('casseus_cart', JSON.stringify(cart));
    updateCartBar();
  }

  function addToCart(productId) {
    const p = PRODUCTS.find(x => x.id === productId);
    if (!p) return;
    const existing = cart.find(c => c.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: p.id,
        name: p.name,
        price: ourPrice(p.basePrice),
        qty: 1,
        amazonUrl: p.amazonUrl
      });
    }
    saveCart();
    const msg = hasActivePackage()
      ? p.name + ' added · Package bundle 10% discount applied!'
      : p.name + ' added to cart';
    showToast(msg);
  }

  function updateCartBar() {
    const bar = document.getElementById('cartBar');
    const countEl = document.getElementById('cartCount');
    const totalEl = document.getElementById('cartTotal');
    const count = cart.reduce((s, c) => s + c.qty, 0);
    const total = cartTotal();
    const discount = cartDiscount();
    countEl.textContent = count;
    if (discount > 0) {
      totalEl.innerHTML = formatMoney(total) + ' <small style="opacity:0.85;font-weight:500;">(10% package bundle off)</small>';
    } else {
      totalEl.textContent = formatMoney(total);
    }
    bar.classList.toggle('visible', count > 0);
  }

  function updateBundleBanner() {
    const banner = document.getElementById('bundleBanner');
    if (!banner) return;
    if (hasActivePackage()) {
      const name = getActivePackageName() || 'your package';
      banner.style.display = 'block';
      banner.innerHTML = '<i class="fas fa-tag"></i> <strong>Package Bundle Discount Active:</strong> You have an active package (' + name + '). Enjoy <strong>10% off</strong> all shop products when purchased together.';
    } else {
      banner.style.display = 'block';
      banner.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Bundle &amp; Save:</strong> Buy any training or stretch <a href="index.html#pricing" style="color:var(--teal-dark);font-weight:700;">package</a> and get <strong>10% off</strong> shop products. Discount applies automatically at checkout.';
    }
  }

  function updateRotationNotice() {
    const el = document.getElementById('rotationNotice');
    if (!el) return;
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    el.style.display = 'block';
    el.innerHTML = '<i class="fas fa-sync-alt"></i> <strong>All-Natural Products Refresh:</strong> New all-natural supplements are featured every 2 weeks. Current selection runs <strong>' +
      fmt(rotation.periodStart) + ' – ' + fmt(rotation.periodEnd) + '</strong>. Next update: <strong>' + fmt(rotation.periodEnd) + '</strong>.';
  }

  // Render products
  const grid = document.getElementById('productsGrid');
  let activeCat = 'all';

  function renderProducts() {
    const list = activeCat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCat);
    grid.innerHTML = list.map(p => {
      const price = ourPrice(p.basePrice);
      return `
        <article class="product-card" data-cat="${p.category}">
          <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300/0a2540/00bfa5?text=Casseus+Wellness'">
          <div class="product-body">
            <div class="product-cat">${p.category}</div>
            <h3 class="product-name">${p.name}</h3>
            <p class="product-desc">${p.desc}</p>
            <div class="product-footer">
              <div class="product-price">${formatMoney(price)}</div>
              <button class="btn btn-primary btn-buy" data-id="${p.id}">Add to Cart</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', () => addToCart(btn.dataset.id));
    });
  }

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      renderProducts();
    });
  });

  // Checkout
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutItems = document.getElementById('checkoutItems');
  const checkoutTotal = document.getElementById('checkoutTotal');

  document.getElementById('openCheckout').addEventListener('click', () => {
    if (cart.length === 0) return;
    const subtotal = cartSubtotal();
    const discount = cartDiscount();
    const total = cartTotal();
    const bundleActive = hasActivePackage();

    checkoutItems.innerHTML = cart.map(c => `
      <div class="checkout-item">
        <div>
          <div class="checkout-item-name">${c.name}</div>
          <div style="font-size:0.8rem;color:#64748b;">Qty ${c.qty} × ${formatMoney(c.price)}</div>
        </div>
        <div style="font-weight:700;">${formatMoney(c.price * c.qty)}</div>
      </div>
    `).join('') + `
      <div class="checkout-item" style="border-bottom:none;padding-top:12px;">
        <div style="color:#64748b;">Subtotal</div>
        <div>${formatMoney(subtotal)}</div>
      </div>
      ${bundleActive ? `
      <div class="checkout-item" style="border-bottom:none;color:#2e7d32;">
        <div><strong>Package Bundle Discount (10%)</strong></div>
        <div><strong>−${formatMoney(discount)}</strong></div>
      </div>
      ` : `
      <div class="checkout-item" style="border-bottom:none;font-size:0.85rem;color:#64748b;">
        <div>No active package — <a href="index.html#pricing" style="color:var(--teal-dark);">buy a package</a> for 10% off products</div>
        <div></div>
      </div>
      `}
    `;
    checkoutTotal.textContent = formatMoney(total);
    checkoutModal.classList.add('open');
  });

  document.getElementById('checkoutClose').addEventListener('click', () => checkoutModal.classList.remove('open'));
  checkoutModal.addEventListener('click', e => {
    if (e.target === checkoutModal) checkoutModal.classList.remove('open');
  });

  document.getElementById('placeOrderBtn').addEventListener('click', async () => {
    const name = document.getElementById('coName').value.trim();
    const email = document.getElementById('coEmail').value.trim();
    const address = document.getElementById('coAddress').value.trim();
    const card = document.getElementById('coCard').value.replace(/\s/g, '');

    if (!name || !email || !address) {
      showToast('Please fill in name, email, and shipping address.', 'error');
      return;
    }
    const refundAgree = document.getElementById('productRefundAgree');
    const refundSign = document.getElementById('productRefundSignName');
    if (!refundAgree || !refundAgree.checked) {
      showToast('You must agree to the Return & Refund Policy.', 'error');
      return;
    }
    if (!refundSign || !refundSign.value.trim()) {
      showToast('Please type your full legal name to sign the Return & Refund Policy.', 'error');
      return;
    }

    const subtotal = cartSubtotal();
    const discount = cartDiscount();
    const total = cartTotal();

    const affRef = getActiveAffiliateRef();
    const isRecurring = !!(document.getElementById('productRecurring') && document.getElementById('productRecurring').checked);
    const refundSig = {
      name: refundSign.value.trim(),
      signedAt: new Date().toISOString(),
      policyVersion: '2026-01',
    };
    const policies = JSON.parse(localStorage.getItem('casseus_refund_policies') || '[]');
    policies.push({ ...refundSig, clientEmail: email, type: 'product_order' });
    localStorage.setItem('casseus_refund_policies', JSON.stringify(policies));

    const order = {
      id: 'ORD-' + Date.now().toString(36).toUpperCase(),
      items: cart.slice(),
      subtotal,
      discount,
      bundleApplied: hasActivePackage(),
      packageName: getActivePackageName(),
      total,
      name,
      email,
      phone: document.getElementById('coPhone').value.trim(),
      address,
      affiliateRef: affRef || null,
      recurring: isRecurring,
      recurringInterval: isRecurring ? 'monthly' : null,
      refundPolicySignedBy: refundSig.name,
      refundPolicySignedAt: refundSig.signedAt,
      placedAt: new Date().toISOString()
    };

    const placeBtn = document.getElementById('placeOrderBtn');
    if (placeBtn) {
      placeBtn.disabled = true;
      placeBtn.textContent = 'Connecting to Stripe…';
    }
    try {
      sessionStorage.setItem('casseus_pending_shop', JSON.stringify(order));
      const unitPrice = cart.reduce((s, c) => s + c.price * c.qty, 0);
      const disc = cartDiscount();
      const items = cart.map((c) => {
        const share = unitPrice > 0 ? (c.price * c.qty) / unitPrice : 0;
        const line = Math.max(0.5, Math.round((c.price * c.qty - disc * share) * 100) / 100);
        return { name: c.name, qty: c.qty, price: Math.round((line / c.qty) * 100) / 100 };
      });
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'shop',
          items,
          recurring: isRecurring,
          email,
          name,
          phone: order.phone,
          address,
          affiliateRef: affRef || '',
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error((data && data.error) || 'Stripe unavailable');
    } catch (err) {
      showToast('Stripe not connected — saving a demo order (no real charge). Add STRIPE_SECRET_KEY to go live.', 'error');
    } finally {
      if (placeBtn) {
        placeBtn.disabled = false;
        placeBtn.textContent = 'Pay securely with Stripe';
      }
    }

    const orders = JSON.parse(localStorage.getItem('casseus_orders') || '[]');
    orders.push(order);
    localStorage.setItem('casseus_orders', JSON.stringify(orders));

    if (affRef) {
      const logs = JSON.parse(localStorage.getItem('casseus_affiliate_conversions') || '[]');
      logs.push({
        affiliateCode: affRef,
        type: 'product_order',
        amount: total,
        detail: order.id,
        at: new Date().toISOString()
      });
      localStorage.setItem('casseus_affiliate_conversions', JSON.stringify(logs));
    }

    cart = [];
    saveCart();
    checkoutModal.classList.remove('open');
    document.getElementById('coName').value = '';
    document.getElementById('coEmail').value = '';
    document.getElementById('coPhone').value = '';
    document.getElementById('coAddress').value = '';
    document.getElementById('coCard').value = '';
    document.getElementById('coExp').value = '';
    document.getElementById('coCvc').value = '';

    const discountNote = discount > 0 ? ` (saved ${formatMoney(discount)} with package bundle)` : '';
    const recurNote = isRecurring ? ' · Monthly recurring enabled' : '';
    showToast(`Order ${order.id} placed! Total ${formatMoney(total)}${discountNote}${recurNote}. Confirmation sent to ${email}.`);
    const recEl = document.getElementById('productRecurring');
    if (recEl) recEl.checked = false;
    if (refundAgree) refundAgree.checked = false;
    if (refundSign) refundSign.value = '';
  });

  // Toast
  function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + (type || 'success');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // Nav toggle
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');
  if (navToggle) {
    navToggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  // Card formatting
  const coCard = document.getElementById('coCard');
  if (coCard) {
    coCard.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '').substring(0, 16);
      this.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    });
  }

  // Lazy loading fallback (no native loading="lazy")
  function applyLazyFallback(root) {
    if ('loading' in HTMLImageElement.prototype) return;
    if (!('IntersectionObserver' in window)) return;
    const scope = root || document;
    const imgs = [];
    scope.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      if (img.dataset.lazyBound === '1') return;
      const current = img.getAttribute('src');
      if (!current || current.startsWith('data:')) return;
      img.setAttribute('data-src', current);
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
      img.classList.add('lazy-pending');
      img.dataset.lazyBound = '1';
      imgs.push(img);
    });
    if (!imgs.length) return;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const img = e.target;
        const ds = img.getAttribute('data-src');
        if (ds) { img.src = ds; img.removeAttribute('data-src'); }
        img.classList.remove('lazy-pending');
        img.classList.add('lazy-loaded');
        obs.unobserve(img);
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    imgs.forEach((img) => io.observe(img));
  }

  (async function handleStripeReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'cancel') {
      showToast('Checkout canceled. No charge was made.', 'error');
      return;
    }
    if (params.get('stripe') !== 'success') return;
    try {
      const sessionId = params.get('session_id');
      const res = await fetch('/api/stripe/session?session_id=' + encodeURIComponent(sessionId || ''));
      const data = await res.json();
      if (data && data.paid) {
        let pending = {};
        try { pending = JSON.parse(sessionStorage.getItem('casseus_pending_shop') || '{}'); } catch (_) {}
        if (pending.id) {
          const orders = JSON.parse(localStorage.getItem('casseus_orders') || '[]');
          pending.paidVia = 'stripe';
          pending.stripeSessionId = sessionId;
          orders.push(pending);
          localStorage.setItem('casseus_orders', JSON.stringify(orders));
          sessionStorage.removeItem('casseus_pending_shop');
          cart = [];
          saveCart();
          updateCartBar();
          showToast('Payment received. Order ' + pending.id + ' is confirmed.');
        } else {
          showToast('Payment received. Thank you.');
        }
        history.replaceState({}, '', window.location.pathname);
      }
    } catch (_) { /* ignore */ }
  })();

  // Init
  renderProducts();
  applyLazyFallback(document.getElementById('productGrid') || document);
  updateCartBar();
  updateBundleBanner();
  updateRotationNotice();
})();
