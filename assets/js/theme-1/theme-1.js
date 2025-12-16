(function() {
  'use strict';

  // ============================================
  // Load Language File
  // ============================================
  function loadLanguageFile(filePath) {
    const themeSection = document.querySelector('.theme-1');
    if (!themeSection) {
      console.error('Theme section not found');
      return;
    }

    // Get the base path (current directory where the HTML files are)
    const currentPath = window.location.pathname;
    let fullPath = '';
    
    // If filePath is absolute (starts with /), use it directly
    if (filePath.startsWith('/')) {
      fullPath = filePath;
    } else {
      // Relative path - calculate base path from current location
      let basePath = '';
      
      // Get the directory path from current location
      // Remove filename and get directory path
      const pathParts = currentPath.split('/').filter(part => part);
      const fileName = pathParts[pathParts.length - 1];
      
      // If we have a filename, remove it to get the directory
      if (fileName && fileName.includes('.html')) {
        pathParts.pop();
      }
      
      // Build base path - if we're in root, basePath is empty, otherwise add trailing slash
      if (pathParts.length > 0) {
        basePath = '/' + pathParts.join('/') + '/';
      } else {
        // Files are in root directory
        basePath = '';
      }
      
      // Combine base path with file path
      fullPath = basePath + filePath;
    }

    // Show loading state
    themeSection.style.opacity = '0.5';
    themeSection.style.pointerEvents = 'none';

    // Fetch the HTML file
    fetch(fullPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        // Create a DOMParser to properly parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract the section content - try multiple selectors
        let newSection = doc.querySelector('.theme-1');
        
        // If not found, try to find section tag
        if (!newSection) {
          newSection = doc.querySelector('section.theme-1');
        }
        
        // If still not found, try body content
        if (!newSection) {
          const body = doc.querySelector('body');
          if (body) {
            newSection = body.querySelector('.theme-1') || body.querySelector('section');
          }
        }
        
        if (!newSection) {
          console.error('Could not find .theme-1 in loaded file');
          themeSection.style.opacity = '1';
          themeSection.style.pointerEvents = 'auto';
          return;
        }

        // Replace the current section with the new one
        themeSection.outerHTML = newSection.outerHTML;

        // Re-initialize all features after content replacement
        setTimeout(() => {
          init();
        }, 100);
      })
      .catch(error => {
        console.error('Error loading language file:', error);
        console.log('Trying fallback navigation to:', fullPath);
        // Fallback: try direct navigation
        window.location.href = fullPath;
      });
  }

  // ============================================
  // Mobile Menu Toggle
  // ============================================
  function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.getElementById('mainNav');
    
    if (!mobileMenuToggle || !mainNav) return;

    // Toggle menu on button click
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
    });

    // Close menu when clicking on a link
    const navLinks = mainNav.querySelectorAll('a:not(.lang-menu a)');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuToggle.classList.remove('active');
        mainNav.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mainNav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
        mobileMenuToggle.classList.remove('active');
        mainNav.classList.remove('active');
      }
    });
  }

  // ============================================
  // Language Dropdown
  // ============================================
  function initLanguageDropdown() {
    const langToggle = document.getElementById('langToggle');
    const langMenu = document.getElementById('langMenu');
    const langCurrent = document.getElementById('langCurrent');
    const langDropdown = document.querySelector('.lang-dropdown');

    if (!langToggle || !langMenu || !langCurrent || !langDropdown) return;

    // Get current language from localStorage or detect from current file
    let currentLang = localStorage.getItem('selectedLanguage');
    let currentLangName = localStorage.getItem('selectedLanguageName');
    
    // If no saved language, detect from current file path
    if (!currentLang) {
      const currentPath = window.location.pathname;
      if (currentPath.includes('index-en.html')) {
        currentLang = 'en';
        currentLangName = 'English';
      } else {
        currentLang = 'ar';
        currentLangName = 'العربية';
      }
      // Save detected language
      localStorage.setItem('selectedLanguage', currentLang);
      localStorage.setItem('selectedLanguageName', currentLangName);
    }
    
    // Update current language display
    langCurrent.textContent = currentLangName;

    // Set page direction
    if (currentLang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }

    // Toggle dropdown on button click
    langToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('active');
    });

    // Handle language selection
    const langOptions = langMenu.querySelectorAll('a');
    langOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        
        const selectedLang = option.getAttribute('data-lang');
        const selectedLangName = option.getAttribute('data-lang-name');
        const filePath = option.getAttribute('href');
        
        // Don't reload if same language
        if (selectedLang === currentLang) {
          langDropdown.classList.remove('active');
          return;
        }
        
        // Update current language display
        langCurrent.textContent = selectedLangName;
        
        // Save to localStorage
        localStorage.setItem('selectedLanguage', selectedLang);
        localStorage.setItem('selectedLanguageName', selectedLangName);
        
        // Update current language variable
        currentLang = selectedLang;
        
        // Close dropdown
        langDropdown.classList.remove('active');
        
        // Update active state in menu
        langOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        // Load the appropriate language file using href from the link
        if (filePath) {
          loadLanguageFile(filePath);
        } else {
          // Fallback: determine file path based on language
          const fallbackPath = selectedLang === 'ar' 
            ? 'index.html'
            : 'index-en.html';
          loadLanguageFile(fallbackPath);
        }
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!langDropdown.contains(e.target)) {
        langDropdown.classList.remove('active');
      }
    });

    // Set active language on load
    langOptions.forEach(option => {
      if (option.getAttribute('data-lang') === currentLang) {
        option.classList.add('active');
      }
    });
  }

  // ============================================
  // Main Video Modal (Hero + Latest Courses + Checkout)
  // ============================================
  function initVideoPlayer() {
    const videoModal = document.getElementById('videoModal');
    const videoModalClose = document.getElementById('videoModalClose');
    const modalVideo = document.getElementById('modalVideo'); // HTML5 <video>

    if (!videoModal || !videoModalClose || !modalVideo) return;

    // Collect all triggers that should open the main video modal
    const triggers = [
      document.getElementById('playBtn'),
      ...document.querySelectorAll('.latest-courses-section .lc-play-btn'),
      ...document.querySelectorAll('.checkout-play-btn')
    ].filter(Boolean);

    if (!triggers.length) return;

    let lastFocusedElement = null;

    function openModal(videoUrl, trigger) {
      if (!videoUrl) {
        console.error('Video URL not found in data-video-url attribute');
        return;
      }

      lastFocusedElement = trigger || document.activeElement;

      // Set video source
      modalVideo.src = videoUrl;

      // Show modal
      videoModal.classList.add('active');
      videoModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // Prevent body scroll

      // Move focus to close button for accessibility
      videoModalClose.focus();

      // Play video
      modalVideo.play().catch(err => {
        console.log('Video autoplay prevented:', err);
      });
    }

    function closeModal() {
      videoModal.classList.remove('active');
      videoModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = ''; // Restore body scroll
      modalVideo.pause();
      modalVideo.currentTime = 0;

      // Restore focus to the element that opened the modal
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    }

    // Wire up all open triggers
    triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const videoUrl = trigger.getAttribute('data-video-url');
        openModal(videoUrl, trigger);
      });
    });

    // Close on close button click
    videoModalClose.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });

    // Close on overlay click
    const overlay = videoModal.querySelector('.video-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && videoModal.classList.contains('active')) {
        closeModal();
      }
    });

    // Optional: close modal when video ends
    modalVideo.addEventListener('ended', () => {
      // closeModal();
    });
  }

  // ============================================
  // Course Modules Accordion
  // ============================================
  function initCourseModules() {
    const moduleCards = document.querySelectorAll('.module-card');
    const moduleHeaders = document.querySelectorAll('.module-header');
    const moduleToggles = document.querySelectorAll('.module-toggle');

    if (!moduleCards.length) return;

    // Handle module toggle
    moduleHeaders.forEach((header, index) => {
      header.addEventListener('click', () => {
        const card = moduleCards[index];
        const isActive = card.classList.contains('active');
        const toggleIcon = card.querySelector('.toggle-icon');

        // Toggle active state
        if (isActive) {
          card.classList.remove('active');
          if (toggleIcon) toggleIcon.textContent = '+';
        } else {
          // Close other modules (optional - remove if you want multiple open)
          moduleCards.forEach((otherCard, otherIndex) => {
            if (otherIndex !== index && otherCard.classList.contains('active')) {
              otherCard.classList.remove('active');
              const otherToggleIcon = otherCard.querySelector('.toggle-icon');
              if (otherToggleIcon) otherToggleIcon.textContent = '+';
            }
          });

          // Open clicked module
          card.classList.add('active');
          if (toggleIcon) toggleIcon.textContent = '−';
        }
      });
    });

    // Also handle toggle button click (prevent double toggle)
    moduleToggles.forEach((toggle, index) => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = moduleCards[index];
        const isActive = card.classList.contains('active');
        const toggleIcon = card.querySelector('.toggle-icon');

        if (isActive) {
          card.classList.remove('active');
          if (toggleIcon) toggleIcon.textContent = '+';
        } else {
          // Close other modules
          moduleCards.forEach((otherCard, otherIndex) => {
            if (otherIndex !== index && otherCard.classList.contains('active')) {
              otherCard.classList.remove('active');
              const otherToggleIcon = otherCard.querySelector('.toggle-icon');
              if (otherToggleIcon) otherToggleIcon.textContent = '+';
            }
          });

          card.classList.add('active');
          if (toggleIcon) toggleIcon.textContent = '−';
        }
      });
    });
  }

  // ============================================
  // Show More Button
  // ============================================
  function initShowMore() {
    const showMoreBtn = document.querySelector('.show-more-btn');
    
    if (!showMoreBtn) return;

    showMoreBtn.addEventListener('click', () => {
      // You can add functionality here to load more modules
      // For now, we'll just scroll to show more content or trigger an action
      console.log('Show more clicked');
      // Example: Scroll to next section or load more modules via AJAX
    });
  }

  // ============================================
  // Pricing Toggle (Monthly/Yearly)
  // ============================================
  function initPricingToggle() {
    const toggleMonthly = document.getElementById('pricingToggleMonthly');
    const toggleYearly = document.getElementById('pricingToggleYearly');
    const priceAmounts = document.querySelectorAll('.price-amount');
    
    if (!toggleMonthly || !toggleYearly || !priceAmounts.length) return;

    // Set initial state - Arabic defaults to yearly, English to monthly
    const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
    const defaultPeriod = isRTL ? 'yearly' : 'monthly';
    
    if (defaultPeriod === 'yearly') {
      toggleYearly.classList.add('active');
      toggleMonthly.classList.remove('active');
      updatePrices('yearly');
    } else {
      toggleMonthly.classList.add('active');
      toggleYearly.classList.remove('active');
      updatePrices('monthly');
    }

    function updatePrices(period) {
      priceAmounts.forEach(amountEl => {
        const monthlyPrice = amountEl.getAttribute('data-monthly');
        const yearlyPrice = amountEl.getAttribute('data-yearly');
        
        if (period === 'monthly') {
          amountEl.textContent = monthlyPrice;
        } else {
          amountEl.textContent = yearlyPrice;
        }
      });
    }

    toggleMonthly.addEventListener('click', () => {
      if (!toggleMonthly.classList.contains('active')) {
        toggleMonthly.classList.add('active');
        toggleYearly.classList.remove('active');
        updatePrices('monthly');
      }
    });

    toggleYearly.addEventListener('click', () => {
      if (!toggleYearly.classList.contains('active')) {
        toggleYearly.classList.add('active');
        toggleMonthly.classList.remove('active');
        updatePrices('yearly');
      }
    });
  }

  // ============================================
  // Circular Testimonials Carousel
  // ============================================
  function initCircularTestimonials() {
    const wrapper = document.querySelector('.testimonials-cards-wrapper');
    const circle = wrapper ? wrapper.querySelector('.testimonial-circle') : null;
    let items = circle ? Array.from(circle.querySelectorAll('.testimonial-circle-item')) : [];
    const prevBtn = wrapper ? wrapper.querySelector('.rotation-prev') : null;
    const nextBtn = wrapper ? wrapper.querySelector('.rotation-next') : null;
    const AUTO_ROTATE_DELAY = 3500; // ms

    if (!wrapper || !circle || !items.length || !prevBtn || !nextBtn) return;

    // Duplicate items so we have 10 (5 visible on top, 5 hidden under the fold)
    const baseItems = [...items];
    while (items.length < 10) {
      for (let i = 0; i < baseItems.length && items.length < 10; i++) {
        const clone = baseItems[i].cloneNode(true);
        clone.classList.add('testimonial-circle-item-clone');
        circle.appendChild(clone);
        items.push(clone);
      }
    }

    let order = [...items];
    let autoRotateTimer = null;

    const positionItems = () => {
      const rect = circle.getBoundingClientRect();
      // Slightly smaller radius so cards are closer and more of them are visible
      const baseSize = Math.min(rect.width, rect.height);
      const radius = Math.max(210, baseSize * 0.55);
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const angleStep = (2 * Math.PI) / order.length;

      order.forEach((item, index) => {
        const angle = angleStep * index - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle) - item.offsetWidth / 2;
        const y = centerY + radius * Math.sin(angle) - item.offsetHeight / 2;

        item.style.transform = `translate(${x}px, ${y}px)`;
        item.style.opacity = '1';
      });
    };

    const rotate = (direction) => {
      if (direction === 'next') {
        const last = order.pop();
        if (last) order.unshift(last);
      } else {
        const first = order.shift();
        if (first) order.push(first);
      }
      positionItems();
    };

    const startAutoRotate = () => {
      if (autoRotateTimer) clearInterval(autoRotateTimer);
      autoRotateTimer = setInterval(() => {
        // لو التاب مش ظاهر، بلاش نرندر
        if (document.hidden) return;
        rotate('next');
      }, AUTO_ROTATE_DELAY);
    };

    const stopAutoRotate = () => {
      if (autoRotateTimer) {
        clearInterval(autoRotateTimer);
        autoRotateTimer = null;
      }
    };

    prevBtn.addEventListener('click', () => {
      rotate('prev');
      startAutoRotate(); // نرجّع التايمر بعد الكليك
    });

    nextBtn.addEventListener('click', () => {
      rotate('next');
      startAutoRotate();
    });

    // إيقاف التشغيل التلقائي عند الـ hover على المنطقة
    wrapper.addEventListener('mouseenter', stopAutoRotate);
    wrapper.addEventListener('mouseleave', startAutoRotate);

    // إيقاف التايمر لما التاب يتقفل / يتهيدن
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoRotate();
      } else {
        startAutoRotate();
      }
    });
    window.addEventListener('resize', positionItems);

    const images = circle.querySelectorAll('img');
    const totalImages = images.length;
    let loadedImages = 0;

    const onImageLoad = () => {
      loadedImages += 1;
      if (loadedImages >= totalImages) {
        positionItems();
        startAutoRotate();
      }
    };

    if (totalImages === 0) {
      positionItems();
      startAutoRotate();
    } else {
      images.forEach(img => {
        if (img.complete) {
          onImageLoad();
        } else {
          img.addEventListener('load', onImageLoad);
          img.addEventListener('error', onImageLoad);
        }
      });
    }

    // Initial draw for cached images
    positionItems();
  }

  // ============================================
  // FAQ Accordion
  // ============================================
  function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    const faqQuestions = document.querySelectorAll('.faq-question');

    if (!faqItems.length || !faqQuestions.length) return;

    // Handle FAQ toggle
    faqQuestions.forEach((question, index) => {
      question.addEventListener('click', (e) => {
        e.preventDefault();
        const faqItem = question.closest('.faq-item');
        const isActive = faqItem.classList.contains('active');

        // Close all FAQ items
        faqItems.forEach((item) => {
          item.classList.remove('active');
          const q = item.querySelector('.faq-question');
          if (q) q.setAttribute('aria-expanded', 'false');
        });

        // If clicking on an inactive item, open it
        if (!isActive) {
          faqItem.classList.add('active');
          question.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // ============================================
  // Contact Form Handler
  // ============================================
  function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (!contactForm) return;

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(contactForm);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        message: formData.get('message')
      };

      // Basic validation
      if (!data.name || !data.email || !data.phone || !data.message) {
        alert('Please fill in all fields');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        alert('Please enter a valid email address');
        return;
      }

      // Here you would typically send the data to a server
      console.log('Form submitted:', data);
      
      // Show success message (you can customize this)
      alert('Thank you! Your message has been sent successfully.');
      
      // Reset form
      contactForm.reset();
    });
  }

  // ============================================
  // Initialize all features when DOM is ready
  // ============================================
  function init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Initialize all features
    initMobileMenu();
    initLanguageDropdown();
    initVideoPlayer();
    initCourseModules();
    initShowMore();
    initPricingToggle();
    initCircularTestimonials();
    initFAQ();
    initContactForm();
    initLatestCourses();
    initCheckout();
  }

  // Latest Courses Section
  function initLatestCourses() {
    const playButtons = document.querySelectorAll('.latest-courses-section .lc-play-btn');
    
    playButtons.forEach(button => {
      // Hover animation
      button.addEventListener('mouseenter', function() {
        this.style.transform = 'translate(-50%, -50%) scale(1.1)';
      });
      
      button.addEventListener('mouseleave', function() {
        this.style.transform = 'translate(-50%, -50%) scale(1)';
      });
      
      // Click handler
      button.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Play video');
      });
    });
  }

  // Checkout Section
  function initCheckout() {
    const paymentCards = document.querySelectorAll('.checkout-payment-card');
    
    // Payment method selection
    paymentCards.forEach(card => {
      card.addEventListener('click', function() {
        // Remove active class from all cards
        paymentCards.forEach(c => c.classList.remove('checkout-payment-active'));
        // Add active class to clicked card
        this.classList.add('checkout-payment-active');
      });
    });
  }

  // Start initialization
  init();

})();