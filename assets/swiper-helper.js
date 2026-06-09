(function (window, document) {
  'use strict';

  function getDirection() {
    var documentDirection = document.documentElement.getAttribute('dir') || document.dir;
    return documentDirection === 'rtl' || window.appDirection === 'rtl' ? 'rtl' : 'ltr';
  }

  function getElement(target) {
    if (!target) {
      return null;
    }

    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  function getShell(element) {
    return element.closest('[data-swiper-shell]') || element.parentElement || element;
  }

  function getControl(element, selector) {
    var shell = getShell(element);
    return shell ? shell.querySelector(selector) : null;
  }

  function prepareNavigation(element) {
    var isRtl = getDirection() === 'rtl';
    var nextElement = getControl(element, '.theme-swiper-button-next');
    var previousElement = getControl(element, '.theme-swiper-button-prev');

    if (nextElement) {
      nextElement.innerHTML = '<span class="' +
        (isRtl ? 'icon-keyboard_arrow_left' : 'icon-keyboard_arrow_right') +
        '"></span>';
      nextElement.setAttribute('aria-label', 'Next');
    }

    if (previousElement) {
      previousElement.innerHTML = '<span class="' +
        (isRtl ? 'icon-keyboard_arrow_right' : 'icon-keyboard_arrow_left') +
        '"></span>';
      previousElement.setAttribute('aria-label', 'Previous');
    }

    return {
      addIcons: false,
      nextEl: nextElement,
      prevEl: previousElement
    };
  }

  function buildOptions(element, options) {
    var config = Object.assign({
      observer: true,
      observeParents: true,
      watchOverflow: true
    }, options || {});

    if (config.navigation === true) {
      config.navigation = prepareNavigation(element);
    }

    if (config.pagination === true) {
      config.pagination = {
        el: getControl(element, '.theme-swiper-pagination'),
        clickable: true
      };
    }

    return config;
  }

  function init(target, options) {
    var element = getElement(target);

    if (!element || typeof window.Swiper !== 'function') {
      return null;
    }

    var existingInstance = element.__themeSwiper || element.swiper;
    if (existingInstance && !existingInstance.destroyed) {
      element.__themeSwiper = existingInstance;
      return existingInstance;
    }

    element.setAttribute('dir', getDirection());
    element.__themeSwiper = new window.Swiper(element, buildOptions(element, options));
    return element.__themeSwiper;
  }

  function destroy(target) {
    var element = getElement(target);

    if (!element) {
      return;
    }

    var instance = element.__themeSwiper || element.swiper;
    if (instance && !instance.destroyed) {
      instance.destroy(true, true);
    }

    element.__themeSwiper = null;
  }

  function initResponsive(target, options, responsiveOptions) {
    var element = getElement(target);

    if (!element) {
      return null;
    }

    var settings = Object.assign({
      minWidth: 0,
      force: false
    }, responsiveOptions || {});

    function sync() {
      var shouldInitialize = settings.force ||
        window.matchMedia('(min-width: ' + settings.minWidth + 'px)').matches;

      if (shouldInitialize) {
        init(element, options);
      } else {
        destroy(element);
      }
    }

    if (!element.__themeSwiperResponsiveBound) {
      var resizeTimer = null;
      window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(sync, 100);
      });
      element.__themeSwiperResponsiveBound = true;
    }

    sync();
    return element.__themeSwiper;
  }

  function updateAll() {
    document.querySelectorAll('.swiper-initialized').forEach(function (element) {
      var instance = element.__themeSwiper || element.swiper;
      if (instance && !instance.destroyed) {
        instance.update();
      }
    });
  }

  window.themeSwiper = {
    destroy: destroy,
    getDirection: getDirection,
    init: init,
    initResponsive: initResponsive,
    updateAll: updateAll
  };
})(window, document);
