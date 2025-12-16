/**
 * Video Testimonials Slider – Infinite Loop with Navigation
 * Pure Vanilla JS – RTL Safe – Smooth Drag
 */

(function () {
  'use strict';

  const config = {
    autoplay: true,
    delay: 3000,
    transition: 500,
    breakpoints: {
      mobile: 640,
      tablet: 768,
      desktop: 1024,
      largeDesktop: 1400,
    },
  };

  let track, cards, pagination, slider;
  let current = 0;
  let perView = 4;
  let autoplayTimer = null;
  let totalSlides = 0;
  let originalCards = [];

  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;

  const isRTL = document.documentElement.dir === 'rtl';

  /* ================= INIT ================= */
  function init() {
    track = document.getElementById('videoTestimonialsTrack');
    slider = document.querySelector('.video-testimonials-slider');
    
    if (!track || !slider) {
      setTimeout(init, 100);
      return;
    }

    originalCards = [...track.children];
    
    if (originalCards.length === 0) {
      setTimeout(init, 100);
      return;
    }

    pagination = document.getElementById('videoTestimonialsPagination');
    totalSlides = originalCards.length;

    // Make sure all cards are visible - especially for RTL
    originalCards.forEach(card => {
      if (card) {
        card.style.display = 'block';
        card.style.opacity = '1';
        card.style.visibility = 'visible';
        card.style.minWidth = '280px';
        // Force visibility for RTL
        if (isRTL) {
          card.style.direction = 'rtl';
        }
      }
    });
    
    // Also ensure track is visible
    if (track) {
      track.style.display = 'flex';
      track.style.visibility = 'visible';
      track.style.opacity = '1';
    }

    // Wait a bit for DOM to settle before initializing
    setTimeout(() => {
      setPerView();
      cloneCards();
      createPagination();
      createNavButtons();
      
      // Start from first real card
      current = totalSlides;
      update(false);
      
      initDrag();
      initAutoplay();
      initVideoModal();
    }, 100);

    window.addEventListener('resize', handleResize);
  }

  function handleResize() {
    // Debounce resize for better performance
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(() => {
      setPerView();
      createPagination();
      update(false);
    }, 150);
  }

  /* ================= CLONE CARDS FOR INFINITE LOOP ================= */
  function cloneCards() {
    if (track.querySelector('.cloned')) return;
    if (originalCards.length === 0) return;
    
    // Clone first set for end
    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('cloned');
      track.appendChild(clone);
    });

    // Clone last set for beginning
    [...originalCards].reverse().forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('cloned');
      track.insertBefore(clone, track.firstChild);
    });

    // Update cards array
    cards = [...track.children];
    setPerView();
  }

  /* ================= RESPONSIVE ================= */
  function setPerView() {
    const w = window.innerWidth;

    if (w < config.breakpoints.mobile) {
      perView = 1;
    } else if (w < config.breakpoints.tablet) {
      perView = 1;
    } else if (w < config.breakpoints.desktop) {
      perView = 2;
    } else if (w < config.breakpoints.largeDesktop) {
      perView = 3;
    } else {
      perView = 4;
    }

    if (!slider || !cards || cards.length === 0) return;

    const sliderWidth = slider.offsetWidth || 1400;
    // Reduce gap for very small screens
    let gap = 24;
    if (w <= 480) {
      gap = 0; // No gap on very small screens
    } else if (w <= 640) {
      gap = 12; // Smaller gap on small mobile
    }

    // Calculate card width: subtract all gaps (one gap per card)
    const totalGaps = perView * gap;
    let cardWidth = (sliderWidth - totalGaps) / perView;
    
    // Ensure minimum card width for very small screens
    if (w <= 480) {
      cardWidth = Math.max(cardWidth, sliderWidth - 60); // Account for nav buttons
    }

    cards.forEach((card, index) => {
      if (!card) return;
      
      // Ensure card is visible first
      card.style.display = 'block';
      card.style.opacity = '1';
      card.style.visibility = 'visible';
      card.style.flexShrink = '0';
      
      const w = window.innerWidth;
      
      // For very small screens, use 100% width
      if (w <= 480) {
        card.style.width = '100%';
        card.style.minWidth = '100%';
        card.style.maxWidth = '100%';
        card.style.marginRight = '0';
        card.style.marginLeft = '0';
      } else {
        // Set width for larger screens
        card.style.width = `${cardWidth}px`;
        card.style.minWidth = w <= 640 ? '100%' : '280px';
        
        // Fixed gap between ALL cards - including first and last
        if (isRTL) {
          card.style.marginRight = '0';
          card.style.marginLeft = gap > 0 ? `${gap}px` : '0';
          card.style.direction = 'rtl';
        } else {
          card.style.marginRight = gap > 0 ? `${gap}px` : '0';
          card.style.marginLeft = '0';
        }
      }
    });
  }

  /* ================= NAVIGATION BUTTONS ================= */
  function createNavButtons() {
    const wrapper = document.querySelector('.video-testimonials-slider-wrapper');
    if (!wrapper || wrapper.querySelector('.slider-nav-btn')) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-nav-btn slider-nav-prev';
    prevBtn.setAttribute('aria-label', 'السابق');
    prevBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    prevBtn.onclick = () => {
      prev();
      resetAutoplay();
    };

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-nav-btn slider-nav-next';
    nextBtn.setAttribute('aria-label', 'التالي');
    nextBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    nextBtn.onclick = () => {
      next();
      resetAutoplay();
    };

    wrapper.appendChild(prevBtn);
    wrapper.appendChild(nextBtn);
  }

  /* ================= PAGINATION ================= */
  function createPagination() {
    if (!pagination) return;
    pagination.innerHTML = '';

    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.className = 'pagination-dot';
      dot.setAttribute('aria-label', `الذهاب إلى الشريحة ${i + 1}`);

      dot.onclick = () => {
        goToSlide(i);
        resetAutoplay();
      };

      pagination.appendChild(dot);
    }
    
    updatePagination();
  }

  function updatePagination() {
    if (!pagination) return;
    const realIndex = getRealIndex(current);
    const dots = pagination.children;
    
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', i === realIndex);
    }
  }

  function getRealIndex(index) {
    let realIdx = (index - totalSlides) % totalSlides;
    if (realIdx < 0) realIdx += totalSlides;
    return realIdx;
  }

  function goToSlide(index) {
    current = index + totalSlides;
    update(true);
  }

  /* ================= SLIDER ================= */
  function update(animate = true) {
    if (!cards || cards.length === 0) return;

    const w = window.innerWidth;
    const cardWidth = cards[0] ? cards[0].offsetWidth : 0;
    // Adjust gap based on screen size
    let gap = 24;
    if (w <= 480) {
      gap = 0;
    } else if (w <= 640) {
      gap = 12;
    }
    
    // Calculate offset: card width + gap for each step
    const offset = (cardWidth + gap) * current;
    const value = isRTL ? offset : -offset;

    track.style.transition = animate
      ? `transform ${config.transition}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      : 'none';

    track.style.transform = `translateX(${value}px)`;
    updatePagination();
  }

  /* ================= INFINITE LOOP ================= */
  function checkLoop() {
    const maxIndex = cards.length - totalSlides;
    
    if (current >= maxIndex) {
      setTimeout(() => {
        current = totalSlides;
        update(false);
      }, config.transition);
    } else if (current < totalSlides) {
      setTimeout(() => {
        current = maxIndex - 1;
        update(false);
      }, config.transition);
    }
  }

  /* ================= AUTOPLAY ================= */
  function initAutoplay() {
    if (!config.autoplay) return;
    autoplayTimer = setInterval(next, config.delay);

    if (slider) {
      slider.addEventListener('mouseenter', stopAutoplay);
      slider.addEventListener('mouseleave', resetAutoplay);
    }
  }

  function resetAutoplay() {
    stopAutoplay();
    if (config.autoplay) {
      autoplayTimer = setInterval(next, config.delay);
    }
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function next() {
    current++;
    update(true);
    checkLoop();
  }

  function prev() {
    current--;
    update(true);
    checkLoop();
  }

  /* ================= DRAG ================= */
  function initDrag() {
    if (!track) return;

    track.addEventListener('mousedown', startDrag);
    track.addEventListener('mousemove', drag);
    track.addEventListener('mouseup', endDrag);
    track.addEventListener('mouseleave', endDrag);

    track.addEventListener('touchstart', startDrag, { passive: true });
    track.addEventListener('touchmove', drag, { passive: true });
    track.addEventListener('touchend', endDrag);

    track.addEventListener('dragstart', (e) => e.preventDefault());
  }

  function startDrag(e) {
    isDragging = true;
    startX = getX(e);
    prevTranslate = getTranslateX();
    track.style.transition = 'none';
    track.style.cursor = 'grabbing';
    stopAutoplay();
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const x = getX(e);
    const deltaX = x - startX;
    currentTranslate = prevTranslate + deltaX;
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    track.style.cursor = 'grab';

    const moved = currentTranslate - prevTranslate;
    const cardWidth = cards[0].offsetWidth;
    const threshold = cardWidth / 3;

    if (Math.abs(moved) > threshold) {
      if (moved < 0) {
        isRTL ? prev() : next();
      } else {
        isRTL ? next() : prev();
      }
    } else {
      update(true);
    }

    resetAutoplay();
  }

  function getX(e) {
    return e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
  }

  function getTranslateX() {
    const style = window.getComputedStyle(track);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m41;
  }

  /* ================= VIDEO MODAL ================= */
  function initVideoModal() {
    const modal = document.getElementById('videoTestimonialModal');
    const video = document.getElementById('videoTestimonialModalVideo');
    const close = document.getElementById('videoTestimonialModalClose');

    if (!modal || !video || !close || !track) return;

    // Event delegation for cloned cards
    track.addEventListener('click', (e) => {
      const btn = e.target.closest('.video-testimonial-play-btn');
      if (!btn) return;
      
      e.stopPropagation();
      const videoUrl = btn.dataset.videoUrl;
      
      if (videoUrl) {
        video.src = videoUrl;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        video.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      }
    });

    function closeModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      video.pause();
      video.src = '';
      video.currentTime = 0;
    }

    close.addEventListener('click', closeModal);
    
    const overlay = modal.querySelector('.video-testimonial-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', closeModal);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  /* ================= START ================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();