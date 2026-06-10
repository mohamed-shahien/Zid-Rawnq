(function (window, document) {
    "use strict";

    var ROOT_SELECTOR = ".products-details-page .luxury-product-page";
    var reducedMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia
        && window.matchMedia("(hover: hover) and (pointer: fine)");

    function toElements(target) {
        if (!target) {
            return [];
        }
        if (typeof target === "string") {
            return Array.prototype.slice.call(document.querySelectorAll(target));
        }
        if (target.jquery) {
            return target.toArray();
        }
        if (target.nodeType === 1) {
            return [target];
        }
        return Array.prototype.slice.call(target);
    }

    function motion(element, options) {
        if (!element || reducedMotion) {
            return;
        }

        options = options || {};
        window.clearTimeout(element.__pdpMotionTimer);
        element.classList.remove("pdp-motion");
        element.style.setProperty("--pdp-motion-y", (options.y === undefined ? 10 : options.y) + "px");
        element.style.setProperty("--pdp-motion-scale", options.scale || 0.992);
        element.style.setProperty("--pdp-motion-time", (options.duration || 420) + "ms");
        void element.offsetWidth;
        element.classList.add("pdp-motion");
        element.__pdpMotionTimer = window.setTimeout(function () {
            element.classList.remove("pdp-motion");
        }, (options.duration || 420) + 50);
    }

    function setVisibility(target, shouldShow, displayClass) {
        toElements(target).forEach(function (element) {
            if (element.__pdpVisibilityAnimation) {
                element.__pdpVisibilityAnimation.cancel();
                element.__pdpVisibilityAnimation = null;
            }

            if (shouldShow) {
                element.hidden = false;
                element.classList.remove("d-none", "d-none-important");
                if (displayClass) {
                    element.classList.add(displayClass);
                }
                motion(element, { y: 7, duration: 340 });
                return;
            }

            if (element.hidden || element.classList.contains("d-none")) {
                return;
            }

            function finishHide() {
                element.classList.add("d-none");
                element.classList.remove("d-block", "d-inline-block");
                element.__pdpVisibilityAnimation = null;
            }

            if (reducedMotion || typeof element.animate !== "function") {
                finishHide();
                return;
            }

            element.__pdpVisibilityAnimation = element.animate([
                { opacity: 1, transform: "translateY(0)" },
                { opacity: 0, transform: "translateY(-6px)" }
            ], {
                duration: 180,
                easing: "ease-in"
            });
            element.__pdpVisibilityAnimation.finished.then(finishHide).catch(function () {});
        });
    }

    function mediaHolder(media) {
        return media.closest(
            ".image-link, .thumb-image-a, .related-product-img-wrapper, " +
            ".review-luxury-image-thumb, .luxury-lifestyle-wrapper, " +
            ".reel-circle-item, li.variant-image-option"
        ) || media.parentElement;
    }

    function prepareImage(image) {
        if (!image || image.__pdpMediaReady
            || image.classList.contains("play-icon")
            || image.classList.contains("add-to-cart-progress")
            || image.classList.contains("send-notify-progress")) {
            return;
        }

        image.__pdpMediaReady = true;
        image.decoding = "async";

        var firstGalleryImage = image.matches(
            "#product-images-swiper .swiper-slide:first-child .carousel-img"
        );
        if (firstGalleryImage) {
            image.loading = "eager";
            image.fetchPriority = "high";
        } else if (!image.hasAttribute("loading")) {
            image.loading = "lazy";
        }

        var holder = mediaHolder(image);

        function finish() {
            if (holder) {
                holder.classList.remove("is-loading");
            }
            motion(image, { y: 0, scale: 1.018, duration: 360 });
        }

        if (image.complete && image.naturalWidth > 0) {
            window.requestAnimationFrame(finish);
            return;
        }

        if (holder) {
            holder.classList.add("is-loading");
        }
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", function () {
            if (holder) {
                holder.classList.remove("is-loading");
            }
        }, { once: true });
    }

    function prepareFrame(frame) {
        if (!frame || frame.__pdpMediaReady || !frame.getAttribute("src")) {
            return;
        }

        frame.__pdpMediaReady = true;
        frame.loading = "lazy";
        var holder = mediaHolder(frame);
        if (holder) {
            holder.classList.add("is-loading");
        }

        function finish() {
            if (holder) {
                holder.classList.remove("is-loading");
            }
            motion(frame, { y: 0, scale: 1.01, duration: 360 });
        }

        frame.addEventListener("load", finish, { once: true });
        window.setTimeout(finish, 2400);
    }

    function prepareMedia(root) {
        if (!root) {
            return;
        }

        var images = root.matches && root.matches("img") ? [root] : [];
        var frames = root.matches && root.matches("iframe[src]") ? [root] : [];
        if (root.querySelectorAll) {
            images = images.concat(Array.prototype.slice.call(root.querySelectorAll("img")));
            frames = frames.concat(Array.prototype.slice.call(root.querySelectorAll("iframe[src]")));
        }
        images.forEach(prepareImage);
        frames.forEach(prepareFrame);
    }

    function hasAsyncContent(slot) {
        var clone = slot.cloneNode(true);
        clone.querySelectorAll("script, style, template").forEach(function (element) {
            element.remove();
        });

        return Boolean(
            String(clone.textContent || "").replace(/\s+/g, " ").trim()
            || slot.querySelector("img[src], iframe[src], svg, button, input, select, textarea, [data-pdp-ready]")
        );
    }

    function resolveAsyncSlot(slot) {
        if (!hasAsyncContent(slot)) {
            return false;
        }
        slot.classList.remove("is-loading", "d-none");
        prepareMedia(slot);
        motion(slot, { y: 7, duration: 360 });
        return true;
    }

    function initAsyncSlots(root) {
        root.querySelectorAll("[data-pdp-async-slot]").forEach(function (slot) {
            if (slot.__pdpAsyncBound || resolveAsyncSlot(slot)) {
                return;
            }

            slot.__pdpAsyncBound = true;
            var observer = new MutationObserver(function () {
                if (resolveAsyncSlot(slot)) {
                    observer.disconnect();
                }
            });
            observer.observe(slot, { childList: true, subtree: true, characterData: true });

            window.setTimeout(function () {
                if (!hasAsyncContent(slot)) {
                    observer.disconnect();
                    slot.classList.remove("is-loading");
                    slot.classList.add("d-none");
                }
            }, parseInt(slot.getAttribute("data-pdp-empty-timeout"), 10) || 1800);
        });
    }

    function initEntrance(root) {
        var selector = [
            ".breadcrumb-minimal",
            ".pdp-gallery-column",
            ".col-product-info > *",
            ".bundle-offer-details-section",
            ".lifestyle-video-section",
            ".lifestyle-image-section",
            ".tabs-minimal-header",
            ".review-luxury-card",
            ".questions-luxury-card",
            ".reviews-luxury-empty-wrapper",
            ".questions-luxury-empty-wrapper",
            ".metafields-item",
            "#product-variants-options li",
            ".related-product-card",
            ".reel-circle-item"
        ].join(",");
        var items = root.querySelectorAll(selector);

        if (!window.IntersectionObserver || reducedMotion) {
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }
                motion(entry.target, { y: 14, duration: 460 });
                observer.unobserve(entry.target);
            });
        }, {
            rootMargin: "0px 0px -5% 0px",
            threshold: 0.08
        });

        items.forEach(function (item) {
            observer.observe(item);
        });
    }

    function bindDetails(details) {
        if (!details || details.__pdpDetailsBound) {
            return;
        }

        var summary = details.querySelector("summary");
        var content = summary && summary.nextElementSibling;
        if (!summary || !content) {
            return;
        }

        details.__pdpDetailsBound = true;
        summary.setAttribute("role", "button");
        summary.setAttribute("aria-expanded", details.open ? "true" : "false");
        summary.addEventListener("click", function (event) {
            event.preventDefault();
            if (details.__pdpDetailsAnimating) {
                return;
            }

            var opening = !details.open;
            summary.setAttribute("aria-expanded", opening ? "true" : "false");
            if (reducedMotion || typeof content.animate !== "function") {
                details.open = opening;
                return;
            }

            details.__pdpDetailsAnimating = true;
            if (opening) {
                details.open = true;
            }

            var height = content.scrollHeight;
            var animation = content.animate(opening ? [
                { height: "0px", opacity: 0, transform: "translateY(-7px)" },
                { height: height + "px", opacity: 1, transform: "translateY(0)" }
            ] : [
                { height: height + "px", opacity: 1, transform: "translateY(0)" },
                { height: "0px", opacity: 0, transform: "translateY(-7px)" }
            ], {
                duration: opening ? 360 : 240,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)"
            });

            animation.finished.then(function () {
                if (!opening) {
                    details.open = false;
                }
                details.__pdpDetailsAnimating = false;
            }).catch(function () {
                details.__pdpDetailsAnimating = false;
            });
        });
    }

    function updateTabIndicator(header, activeTab) {
        if (!header || !activeTab) {
            return;
        }
        var indicator = header.querySelector(".pdp-tabs-indicator");
        if (!indicator) {
            indicator = document.createElement("span");
            indicator.className = "pdp-tabs-indicator";
            indicator.setAttribute("aria-hidden", "true");
            header.appendChild(indicator);
        }
        indicator.style.width = activeTab.offsetWidth + "px";
        indicator.style.transform = "translate3d(" + activeTab.offsetLeft + "px,0,0)";
    }

    function initTabs(root) {
        root.querySelectorAll(".tabs-minimal-header").forEach(function (header) {
            var tabs = Array.prototype.slice.call(header.querySelectorAll(".tab-btn"));
            header.setAttribute("role", "tablist");
            tabs.forEach(function (tab, index) {
                tab.setAttribute("role", "tab");
                tab.setAttribute("tabindex", tab.classList.contains("active") ? "0" : "-1");
                tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false");
                var targetSelector = tab.getAttribute("data-target");
                if (targetSelector && targetSelector.charAt(0) === "#") {
                    tab.setAttribute("aria-controls", targetSelector.substring(1));
                }
                tab.addEventListener("keydown", function (event) {
                    var nextIndex;
                    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                        event.preventDefault();
                        nextIndex = event.key === "ArrowRight" ? index + 1 : index - 1;
                        tabs[(nextIndex + tabs.length) % tabs.length].click();
                        tabs[(nextIndex + tabs.length) % tabs.length].focus();
                    } else if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        tab.click();
                    }
                });
            });

            window.requestAnimationFrame(function () {
                updateTabIndicator(header, header.querySelector(".tab-btn.active"));
            });
        });

        var resizeTimer;
        window.addEventListener("resize", function () {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(function () {
                root.querySelectorAll(".tabs-minimal-header").forEach(function (header) {
                    updateTabIndicator(header, header.querySelector(".tab-btn.active"));
                });
            }, 100);
        }, { passive: true });
    }

    function switchTab(page, target, trigger) {
        if (!page || !target || !trigger) {
            return;
        }

        var panes = page.querySelectorAll(".tabs-minimal-content .tab-pane");
        var activePane = page.querySelector(".tabs-minimal-content .tab-pane.active");
        var header = trigger.closest(".tabs-minimal-header");

        page.querySelectorAll(".tabs-minimal-header .tab-btn").forEach(function (tab) {
            var active = tab === trigger;
            tab.classList.toggle("active", active);
            tab.classList.toggle("text-muted", !active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
            tab.setAttribute("tabindex", active ? "0" : "-1");
        });
        updateTabIndicator(header, trigger);

        if (activePane === target) {
            motion(target, { y: 5, duration: 320 });
            return;
        }

        function showTarget() {
            panes.forEach(function (pane) {
                pane.classList.remove("active");
                pane.style.display = "none";
            });
            target.style.display = "block";
            target.classList.add("active");
            motion(target, { y: 9, duration: 420 });
        }

        if (!activePane || reducedMotion || typeof activePane.animate !== "function") {
            showTarget();
            return;
        }

        activePane.animate([
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0, transform: "translateY(-6px)" }
        ], {
            duration: 160,
            easing: "ease-in"
        }).finished.then(showTarget).catch(showTarget);
    }

    function stickyOffset() {
        var offset = 24;
        document.querySelectorAll(".sticky-header, header, .search-header, .upper-bar").forEach(function (element) {
            var style = window.getComputedStyle(element);
            var rect = element.getBoundingClientRect();
            if ((style.position === "fixed" || style.position === "sticky")
                && rect.height > 0 && rect.bottom > 0) {
                offset = Math.max(offset, Math.round(rect.bottom + 16));
            }
        });
        document.documentElement.style.setProperty("--pdp-sticky-offset", offset + "px");
    }

    function initStickyGallery() {
        stickyOffset();
        window.addEventListener("resize", stickyOffset, { passive: true });
        if (window.ResizeObserver) {
            var observer = new ResizeObserver(stickyOffset);
            document.querySelectorAll(".sticky-header, header, .search-header, .upper-bar").forEach(function (header) {
                observer.observe(header);
            });
        }
    }

    function initZoom(root) {
        var gallery = root.querySelector("#product-images-swiper");
        if (!gallery || !finePointer || !finePointer.matches) {
            return;
        }

        var zoom = 2.25;
        var lensSize = 176;

        function hideLens(link) {
            var lens = link && link.querySelector(".pdp-zoom-lens");
            if (lens) {
                lens.classList.remove("is-visible");
            }
        }

        gallery.addEventListener("pointermove", function (event) {
            var link = event.target.closest(".swiper-slide-active .image-link");
            var image = link && link.querySelector(".carousel-img");
            if (!link || !image || !image.complete || !image.naturalWidth) {
                return;
            }

            var imageRect = image.getBoundingClientRect();
            var linkRect = link.getBoundingClientRect();
            if (event.clientX < imageRect.left || event.clientX > imageRect.right
                || event.clientY < imageRect.top || event.clientY > imageRect.bottom) {
                hideLens(link);
                return;
            }

            var lens = link.querySelector(".pdp-zoom-lens");
            if (!lens) {
                lens = document.createElement("span");
                lens.className = "pdp-zoom-lens";
                lens.setAttribute("aria-hidden", "true");
                link.appendChild(lens);
            }

            var x = event.clientX - imageRect.left;
            var y = event.clientY - imageRect.top;
            var imageLeft = imageRect.left - linkRect.left;
            var imageTop = imageRect.top - linkRect.top;
            var left = Math.max(imageLeft, Math.min(imageLeft + imageRect.width - lensSize, imageLeft + x - lensSize / 2));
            var top = Math.max(imageTop, Math.min(imageTop + imageRect.height - lensSize, imageTop + y - lensSize / 2));

            lens.style.left = left + "px";
            lens.style.top = top + "px";
            lens.style.backgroundImage = "url(\"" + image.currentSrc.replace(/"/g, "%22") + "\")";
            lens.style.backgroundSize = (imageRect.width * zoom) + "px " + (imageRect.height * zoom) + "px";
            lens.style.backgroundPosition = (lensSize / 2 - x * zoom) + "px " + (lensSize / 2 - y * zoom) + "px";
            lens.classList.add("is-visible");
        }, { passive: true });

        gallery.addEventListener("pointerleave", function () {
            gallery.querySelectorAll(".pdp-zoom-lens.is-visible").forEach(function (lens) {
                lens.classList.remove("is-visible");
            });
        });
    }

    function initValueObservers(root) {
        if (!window.MutationObserver) {
            return;
        }
        root.querySelectorAll([
            ".product-formatted-price",
            ".product-formatted-price-old",
            ".product-formatted-price-discount",
            ".product-weight",
            ".product-sku",
            ".product-stock-qty",
            ".low-quantity",
            ".qty-display",
            ".btn-add-to-cart > span"
        ].join(",")).forEach(function (element) {
            if (element.__pdpValueObserver) {
                return;
            }
            var observer = new MutationObserver(function () {
                motion(element, { y: 5, duration: 320 });
            });
            observer.observe(element, { childList: true, subtree: true, characterData: true });
            element.__pdpValueObserver = observer;
        });
    }

    function init(root) {
        root = root || document.querySelector(ROOT_SELECTOR);
        if (!root || root.__pdpUiReady) {
            return;
        }

        root.__pdpUiReady = true;
        prepareMedia(root);
        initAsyncSlots(root);
        initEntrance(root);
        initTabs(root);
        initStickyGallery();
        initZoom(root);
        initValueObservers(root);
        root.querySelectorAll("details.accordion-minimal").forEach(bindDetails);
    }

    window.productPageUI = {
        init: init,
        motion: motion,
        setVisibility: setVisibility,
        prepareMedia: prepareMedia,
        switchTab: switchTab,
        bindDetails: bindDetails
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            init();
        }, { once: true });
    } else {
        init();
    }
})(window, document);
