(function (window, document) {
  'use strict';

  var activeDialog = null;
  var closeTimer = null;
  var reducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animationDuration = reducedMotion ? 20 : 920;
  var requestFrame = window.requestAnimationFrame || function (callback) {
    return window.setTimeout(callback, 16);
  };
  var focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function matches(element, selector) {
    if (!element || element.nodeType !== 1) return false;
    var matcher = element.matches
      || element.msMatchesSelector
      || element.webkitMatchesSelector;
    return matcher ? matcher.call(element, selector) : false;
  }

  function closest(element, selector) {
    if (element && element.nodeType !== 1) {
      element = element.parentElement;
    }
    while (element && element.nodeType === 1) {
      if (matches(element, selector)) return element;
      element = element.parentElement;
    }
    return null;
  }

  function toDialog(target) {
    if (!target) return null;
    if (target.nodeType === 1) return target;

    try {
      return document.querySelector(String(target));
    } catch (error) {
      return null;
    }
  }

  function emit(dialog, name) {
    var event;
    if (typeof window.CustomEvent === 'function') {
      event = new CustomEvent(name, { bubbles: true });
    } else {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent(name, true, false, null);
    }
    dialog.dispatchEvent(event);
  }

  function getFocusable(dialog) {
    return Array.prototype.filter.call(
      dialog.querySelectorAll(focusableSelector),
      function (element) {
        return element.offsetWidth > 0 || element.offsetHeight > 0;
      }
    );
  }

  function focusDialog(dialog) {
    var preferred = dialog.querySelector('[data-dialog-autofocus]');
    var focusable = getFocusable(dialog);
    var target = preferred || focusable[0] || dialog.querySelector('.theme-dialog-panel');
    if (target && typeof target.focus === 'function') {
      try {
        target.focus({ preventScroll: true });
      } catch (error) {
        target.focus();
      }
    }
  }

  function finishClose(dialog) {
    if (!dialog || !dialog.classList.contains('is-mounted')) return;

    window.clearTimeout(closeTimer);
    dialog.classList.remove('is-open');
    dialog.classList.remove('is-closing');
    dialog.classList.remove('is-mounted');
    dialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('theme-dialog-open');
    emit(dialog, 'theme:dialog:closed');

    var trigger = dialog.__themeDialogTrigger;
    dialog.__themeDialogTrigger = null;
    activeDialog = null;

    if (trigger && document.documentElement.contains(trigger)
        && typeof trigger.focus === 'function') {
      try {
        trigger.focus({ preventScroll: true });
      } catch (error) {
        trigger.focus();
      }
    }
  }

  function close(target) {
    var dialog = toDialog(target) || activeDialog;
    if (!dialog || !dialog.classList.contains('is-mounted')
        || dialog.classList.contains('is-closing')) {
      return;
    }

    emit(dialog, 'theme:dialog:close');
    dialog.classList.remove('is-open');
    dialog.classList.add('is-closing');
    closeTimer = window.setTimeout(function () {
      finishClose(dialog);
    }, animationDuration);
  }

  function open(target, trigger) {
    var dialog = toDialog(target);
    if (!dialog || !dialog.classList.contains('theme-dialog')) return;

    if (dialog.hasAttribute('data-dialog-portal')
        && dialog.parentNode !== document.body) {
      document.body.appendChild(dialog);
    }

    if (activeDialog && activeDialog !== dialog) {
      finishClose(activeDialog);
    }

    window.clearTimeout(closeTimer);
    activeDialog = dialog;
    dialog.__themeDialogTrigger = trigger || document.activeElement;
    dialog.classList.remove('is-closing');
    dialog.classList.add('is-mounted');
    dialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('theme-dialog-open');
    emit(dialog, 'theme:dialog:open');

    requestFrame(function () {
      requestFrame(function () {
        dialog.classList.add('is-open');
        focusDialog(dialog);
        emit(dialog, 'theme:dialog:opened');
      });
    });
  }

  document.addEventListener('click', function (event) {
    var opener = closest(event.target, '[data-dialog-open]');
    if (opener) {
      event.preventDefault();
      open(opener.getAttribute('data-dialog-open'), opener);
      return;
    }

    var closer = closest(event.target, '[data-dialog-close]');
    if (closer) {
      event.preventDefault();
      close(closest(closer, '.theme-dialog'));
      return;
    }

    if (activeDialog && matches(event.target, '[data-dialog-backdrop]')
        && !activeDialog.hasAttribute('data-dialog-static')) {
      close(activeDialog);
    }
  });

  document.addEventListener('keydown', function (event) {
    var key = event.key;
    if (!key) {
      key = event.keyCode === 27 ? 'Escape'
        : event.keyCode === 9 ? 'Tab'
          : event.keyCode === 13 ? 'Enter'
            : event.keyCode === 32 ? ' '
              : '';
    }
    var keyboardOpener = closest(event.target, '[data-dialog-open]');
    if (keyboardOpener && (key === 'Enter' || key === ' ')) {
      event.preventDefault();
      open(keyboardOpener.getAttribute('data-dialog-open'), keyboardOpener);
      return;
    }

    if (!activeDialog) return;

    if (key === 'Escape' && !activeDialog.hasAttribute('data-dialog-static')) {
      event.preventDefault();
      close(activeDialog);
      return;
    }

    if (key !== 'Tab') return;

    var focusable = getFocusable(activeDialog);
    if (!focusable.length) {
      event.preventDefault();
      focusDialog(activeDialog);
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('.theme-dialog'), function (dialog) {
    dialog.setAttribute('aria-hidden', 'true');
  });

  window.themeDialog = {
    open: open,
    close: close,
    getActive: function () {
      return activeDialog;
    }
  };
})(window, document);
