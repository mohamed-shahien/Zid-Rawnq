(function (window, document) {
    "use strict";

    var ROOT_SELECTOR = ".products-details-page .luxury-product-page";
    var reducedMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia
        && window.matchMedia("(hover: hover) and (pointer: fine)");
    var requestFrame = window.requestAnimationFrame || function (callback) {
        return window.setTimeout(callback, 16);
    };
    var MOTION_DURATION = 820;
    var MOTION_FAST = 620;

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
        if (!element || reducedMotion || element.closest(".is-loading:not(.is-resolving)")) {
            return;
        }

        options = options || {};
        window.clearTimeout(element.__pdpMotionTimer);
        element.classList.remove("pdp-motion");
        element.style.setProperty("--pdp-motion-y", (options.y === undefined ? 10 : options.y) + "px");
        element.style.setProperty("--pdp-motion-scale", options.scale || 0.992);
        element.style.setProperty("--pdp-motion-time", (options.duration || MOTION_DURATION) + "ms");
        void element.offsetWidth;
        element.classList.add("pdp-motion");
        element.__pdpMotionTimer = window.setTimeout(function () {
            element.classList.remove("pdp-motion");
        }, (options.duration || MOTION_DURATION) + 80);
    }

    function animateLayoutMutation(element, mutate) {
        var parent = element && element.parentElement;
        if (!parent || reducedMotion || typeof element.animate !== "function") {
            mutate();
            return;
        }

        var siblings = Array.prototype.slice.call(parent.children);
        var before = siblings.map(function (sibling) {
            return {
                element: sibling,
                rect: sibling.getBoundingClientRect()
            };
        });

        mutate();
        requestFrame(function () {
            before.forEach(function (item) {
                if (!item.element.isConnected) {
                    return;
                }
                var after = item.element.getBoundingClientRect();
                var deltaX = item.rect.left - after.left;
                var deltaY = item.rect.top - after.top;
                if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
                    return;
                }
                item.element.animate([
                    { transform: "translate3d(" + deltaX + "px," + deltaY + "px,0)" },
                    { transform: "translate3d(0,0,0)" }
                ], {
                    duration: 760,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)"
                });
            });
        });
    }

    function setVisibility(target, shouldShow, displayClass) {
        toElements(target).forEach(function (element) {
            if (element.__pdpVisibilityAnimation) {
                element.__pdpVisibilityAnimation.cancel();
                element.__pdpVisibilityAnimation = null;
            }

            if (shouldShow) {
                animateLayoutMutation(element, function () {
                    element.hidden = false;
                    element.classList.remove("d-none", "d-none-important");
                    if (displayClass) {
                        element.classList.add(displayClass);
                    }
                });
                motion(element, { y: 7, duration: MOTION_DURATION });
                return;
            }

            if (element.hidden || element.classList.contains("d-none")) {
                return;
            }

            function finishHide() {
                animateLayoutMutation(element, function () {
                    element.classList.add("d-none");
                    element.classList.remove("d-block", "d-inline-block");
                });
                element.__pdpVisibilityAnimation = null;
            }

            if (reducedMotion || typeof element.animate !== "function") {
                finishHide();
                return;
            }

            element.__pdpVisibilityAnimation = element.animate([
                { opacity: 1, transform: "translateY(0)" },
                { opacity: 0, transform: "translateY(-4px)" }
            ], {
                duration: MOTION_FAST,
                easing: "ease-in"
            });
            element.__pdpVisibilityAnimation.finished.then(finishHide).catch(function () {});
        });
    }

    function revealMedia(holder, media) {
        if (!holder || !holder.classList.contains("is-loading")) {
            motion(media, { y: 0, scale: 1.01, duration: MOTION_DURATION });
            return;
        }
        if (holder.__pdpMediaResolving) {
            return;
        }

        holder.__pdpMediaResolving = true;
        holder.classList.add("is-resolving");
        requestFrame(function () {
            holder.classList.add("is-ready");
            window.setTimeout(function () {
                holder.classList.remove("is-loading", "is-resolving");
                holder.__pdpMediaResolving = false;
            }, 720);
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
            revealMedia(holder, image);
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
            revealMedia(holder, image);
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
            revealMedia(holder, frame);
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

    function getLoadingContentHeight(element) {
        var computedStyle = window.getComputedStyle(element);
        var paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        var contentBottom = 0;

        Array.prototype.forEach.call(element.children, function (child) {
            if (child.matches("script, style, template")
                || window.getComputedStyle(child).display === "none") {
                return;
            }
            var childStyle = window.getComputedStyle(child);
            contentBottom = Math.max(
                contentBottom,
                child.offsetTop + child.offsetHeight + (parseFloat(childStyle.marginBottom) || 0)
            );
        });

        return Math.ceil(contentBottom ? contentBottom + paddingBottom : 0);
    }

    function prepareLoadingShell(element) {
        if (!element || !element.classList.contains("is-loading")
            || element.__pdpLoadingPrepared) {
            return;
        }

        var computedStyle = window.getComputedStyle(element);
        var configuredHeight = parseFloat(
            computedStyle.getPropertyValue("--pdp-skeleton-height")
        ) || 0;
        var currentHeight = element.getBoundingClientRect().height;
        var contentHeight = getLoadingContentHeight(element);
        var reservedHeight = Math.ceil(
            Math.max(configuredHeight, currentHeight, contentHeight, 1)
        );

        element.__pdpLoadingPrepared = true;
        element.__pdpReservedHeight = reservedHeight;
        element.classList.add("pdp-loading-shell");
        element.style.height = reservedHeight + "px";
        element.setAttribute("aria-busy", "true");
    }

    function revealLoadingShell(element) {
        if (!element || !element.classList.contains("is-loading")
            || element.__pdpLoadingResolving) {
            return;
        }

        prepareLoadingShell(element);
        element.__pdpLoadingResolving = true;
        var startHeight = element.getBoundingClientRect().height
            || element.__pdpReservedHeight;
        var targetHeight = getLoadingContentHeight(element)
            || element.scrollHeight
            || startHeight;

        if (reducedMotion) {
            element.classList.remove("is-loading", "is-resolving", "pdp-loading-shell");
            element.classList.add("is-ready");
            element.style.height = "";
            element.removeAttribute("aria-busy");
            element.__pdpLoadingResolving = false;
            return;
        }

        element.style.height = startHeight + "px";
        element.classList.add("is-resolving");
        requestFrame(function () {
            element.style.height = Math.ceil(targetHeight) + "px";
            window.setTimeout(function () {
                element.classList.remove("is-loading", "is-resolving");
                element.classList.add("is-ready");
                element.removeAttribute("aria-busy");
                element.style.height = Math.ceil(targetHeight) + "px";
                requestFrame(function () {
                    element.style.height = "";
                    element.classList.remove("pdp-loading-shell");
                    element.__pdpLoadingResolving = false;
                });
            }, 860);
        });
    }

    function hideEmptyLoadingShell(element) {
        if (!element || element.__pdpLoadingResolving) {
            return;
        }

        prepareLoadingShell(element);
        element.__pdpLoadingResolving = true;
        element.classList.add("is-emptying");
        element.style.height = element.getBoundingClientRect().height + "px";

        requestFrame(function () {
            element.style.height = "0px";
            element.style.opacity = "0";
            window.setTimeout(function () {
                animateLayoutMutation(element, function () {
                    element.classList.remove("is-loading", "is-emptying", "pdp-loading-shell");
                    element.classList.add("d-none");
                });
                element.style.height = "";
                element.style.opacity = "";
                element.removeAttribute("aria-busy");
                element.__pdpLoadingResolving = false;
            }, reducedMotion ? 20 : 700);
        });
    }

    function resolveAsyncSlot(slot) {
        if (!hasAsyncContent(slot)) {
            return false;
        }
        slot.classList.remove("d-none");
        prepareMedia(slot);
        revealLoadingShell(slot);
        return true;
    }

    function initAsyncSlots(root) {
        root.querySelectorAll("[data-pdp-async-slot]").forEach(function (slot) {
            prepareLoadingShell(slot);
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
                    hideEmptyLoadingShell(slot);
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
                motion(entry.target, { y: 14, duration: 860 });
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
        var descriptionGroup = details.closest("[data-product-description-collapses]");
        var isDescriptionCollapse = Boolean(
            descriptionGroup && details.classList.contains("product-description-collapse")
        );
        if (!summary || !content) {
            return;
        }

        details.__pdpDetailsBound = true;
        summary.setAttribute("role", "button");
        summary.setAttribute("aria-expanded", details.open ? "true" : "false");

        function setOpenState(opening) {
            if (details.__pdpDetailsAnimating) {
                return false;
            }

            summary.setAttribute("aria-expanded", opening ? "true" : "false");
            if (reducedMotion) {
                details.open = opening;
                return true;
            }

            details.__pdpDetailsAnimating = true;
            if (opening) {
                details.open = true;
            }

            var computedStyle = window.getComputedStyle(content);
            var paddingTop = computedStyle.paddingTop;
            var paddingBottom = computedStyle.paddingBottom;
            var targetHeight = content.scrollHeight;
            var startHeight = content.getBoundingClientRect().height;
            var finished = false;

            function finishAnimation() {
                if (finished) {
                    return;
                }
                finished = true;
                content.removeEventListener("transitionend", handleTransitionEnd);
                window.clearTimeout(details.__pdpDetailsTimer);

                if (!opening) {
                    details.open = false;
                }

                content.style.height = "";
                content.style.paddingTop = "";
                content.style.paddingBottom = "";
                content.style.opacity = "";
                details.__pdpDetailsAnimating = false;
            }

            function handleTransitionEnd(transitionEvent) {
                if (transitionEvent.target === content && transitionEvent.propertyName === "height") {
                    finishAnimation();
                }
            }

            content.addEventListener("transitionend", handleTransitionEnd);
            content.style.height = opening ? "0px" : startHeight + "px";
            content.style.paddingTop = opening ? "0px" : paddingTop;
            content.style.paddingBottom = opening ? "0px" : paddingBottom;
            content.style.opacity = opening ? "0" : "1";
            void content.offsetHeight;

            window.requestAnimationFrame(function () {
                content.style.height = opening ? targetHeight + "px" : "0px";
                content.style.paddingTop = opening ? paddingTop : "0px";
                content.style.paddingBottom = opening ? paddingBottom : "0px";
                content.style.opacity = opening ? "1" : "0";
            });

            details.__pdpDetailsTimer = window.setTimeout(
                finishAnimation,
                isDescriptionCollapse ? 640 : 980
            );
            return true;
        }

        details.__pdpSetOpen = setOpenState;
        summary.addEventListener("click", function (event) {
            event.preventDefault();

            if (details.__pdpDetailsAnimating) {
                return;
            }

            if (isDescriptionCollapse) {
                var descriptionItems = Array.prototype.slice.call(
                    descriptionGroup.querySelectorAll(".product-description-collapse")
                );
                var groupIsAnimating = descriptionItems.some(function (item) {
                    return item.__pdpDetailsAnimating;
                });

                if (groupIsAnimating || details.open) {
                    return;
                }

                descriptionItems.forEach(function (item) {
                    if (item !== details && item.open) {
                        if (typeof item.__pdpSetOpen === "function") {
                            item.__pdpSetOpen(false);
                        } else {
                            item.open = false;
                            var itemSummary = item.querySelector("summary");
                            if (itemSummary) {
                                itemSummary.setAttribute("aria-expanded", "false");
                            }
                        }
                    }
                });
            }

            setOpenState(!details.open);
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
        var contentContainer = page.querySelector(".tabs-minimal-content");

        page.querySelectorAll(".tabs-minimal-header .tab-btn").forEach(function (tab) {
            var active = tab === trigger;
            tab.classList.toggle("active", active);
            tab.classList.toggle("text-muted", !active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
            tab.setAttribute("tabindex", active ? "0" : "-1");
        });
        updateTabIndicator(header, trigger);

        if (activePane === target) {
            motion(target, { y: 5, duration: 680 });
            return;
        }

        function showTarget() {
            var startHeight = contentContainer
                ? contentContainer.getBoundingClientRect().height
                : 0;
            if (contentContainer && !reducedMotion) {
                contentContainer.style.height = startHeight + "px";
                contentContainer.classList.add("is-resizing");
            }

            panes.forEach(function (pane) {
                pane.classList.remove("active");
                pane.style.display = "none";
            });
            target.style.display = "block";
            target.classList.add("active");
            motion(target, { y: 8, duration: MOTION_DURATION });

            if (contentContainer && !reducedMotion) {
                var targetHeight = target.getBoundingClientRect().height;
                requestFrame(function () {
                    contentContainer.style.height = Math.ceil(targetHeight) + "px";
                    window.setTimeout(function () {
                        contentContainer.style.height = "";
                        contentContainer.classList.remove("is-resizing");
                    }, 860);
                });
            }
        }

        if (!activePane || reducedMotion || typeof activePane.animate !== "function") {
            showTarget();
            return;
        }

        activePane.animate([
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0, transform: "translateY(-6px)" }
        ], {
            duration: 680,
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
                motion(element, { y: 5, duration: 680 });
            });
            observer.observe(element, { childList: true, subtree: true, characterData: true });
            element.__pdpValueObserver = observer;
        });
    }

    function resolveHydration(target) {
        toElements(target).forEach(function (element) {
            if (!element.classList.contains("is-loading")) {
                return;
            }
            revealLoadingShell(element);
        });
    }

    function initHydration(root) {
        root.querySelectorAll("[data-pdp-hydrate]").forEach(function (element) {
            prepareLoadingShell(element);
            window.setTimeout(function () {
                resolveHydration(element);
            }, 2600);
        });
    }

    function initDynamicDomMotion(root) {
        if (!window.MutationObserver || root.__pdpDomMotionBound) {
            return;
        }

        root.__pdpDomMotionBound = true;
        var enterSelector = [
            "[data-pdp-animate]",
            ".swiper-slide",
            ".product-description-collapse",
            ".bundle-slide-card",
            ".variant-image-option",
            ".metafields-item",
            ".review-luxury-card",
            ".questions-luxury-card",
            ".reel-circle-item"
        ].join(",");

        function animateCandidate(element) {
            if (!element || !element.matches || !element.matches(enterSelector)
                || element.closest(".is-loading:not(.is-resolving)")
                || element.hidden
                || element.classList.contains("d-none")) {
                return;
            }
                motion(element, { y: 8, duration: MOTION_DURATION });
        }

        var observer = new MutationObserver(function (records) {
            records.forEach(function (record) {
                if (record.type === "childList") {
                    Array.prototype.forEach.call(record.addedNodes, function (node) {
                        if (node.nodeType !== 1) {
                            return;
                        }
                        prepareMedia(node);
                        animateCandidate(node);
                        if (node.querySelectorAll) {
                            Array.prototype.forEach.call(
                                node.querySelectorAll(enterSelector),
                                animateCandidate
                            );
                        }
                    });
                    return;
                }

                var element = record.target;
                if (!element.classList || typeof element.closest !== "function") {
                    return;
                }
                var oldValue = record.oldValue || "";
                var wasHidden = record.attributeName === "hidden"
                    ? record.oldValue !== null
                    : /(?:^|\s)(?:d-none|d-none-important)(?:\s|$)/.test(oldValue);
                var isVisible = !element.hidden
                    && !element.classList.contains("d-none")
                    && !element.classList.contains("d-none-important");
                if (wasHidden && isVisible) {
                    motion(element, { y: 7, duration: MOTION_DURATION });
                }
            });
        });

        observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true,
            attributeFilter: ["class", "hidden"]
        });
    }

    function initQuestionAccordions(root) {
        root.querySelectorAll(".questions-luxury-card-header").forEach(function (header) {
            if (header.__pdpQuestionBound) {
                return;
            }

            header.__pdpQuestionBound = true;

            function toggleQuestion() {
                var card = header.closest(".questions-luxury-card");
                var body = card && card.querySelector(".questions-luxury-card-body");
                if (!card || !body || card.__pdpQuestionAnimating) {
                    return;
                }

                var opening = card.classList.contains("collapsed");
                header.setAttribute("aria-expanded", opening ? "true" : "false");
                if (reducedMotion) {
                    card.classList.toggle("collapsed", !opening);
                    body.style.maxHeight = opening ? "none" : "0px";
                    return;
                }

                card.__pdpQuestionAnimating = true;
                var height = body.scrollHeight;
                body.style.maxHeight = opening ? "0px" : height + "px";
                void body.offsetHeight;

                if (opening) {
                    card.classList.remove("collapsed");
                    window.requestAnimationFrame(function () {
                        body.style.maxHeight = height + "px";
                    });
                } else {
                    window.requestAnimationFrame(function () {
                        card.classList.add("collapsed");
                        body.style.maxHeight = "0px";
                    });
                }

                window.setTimeout(function () {
                    if (opening) {
                        body.style.maxHeight = "none";
                    }
                    card.__pdpQuestionAnimating = false;
                }, 880);
            }

            header.addEventListener("click", toggleQuestion);
            header.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleQuestion();
                }
            });
        });
    }

    function initReviewImages(root) {
        if (root.__pdpReviewImagesBound) {
            return;
        }
        root.__pdpReviewImagesBound = true;
        root.addEventListener("click", function (event) {
            var image = event.target.closest(".review-luxury-image-thumb img");
            if (!image) {
                return;
            }

            var container = image.closest(".review-luxury-images");
            if (!container || typeof window.openPhotoSwiper !== "function") {
                return;
            }

            var images = Array.prototype.map.call(container.querySelectorAll("img"), function (item) {
                return item.currentSrc || item.src;
            });
            var index = Math.max(0, images.indexOf(image.currentSrc || image.src));
            window.openPhotoSwiper(images, index);
        });
    }

    function initQuestionMessages(root) {
        var dialog = root.querySelector("#addProductQuestionModal[data-question-success]");
        if (!dialog) {
            return;
        }
        window.locales_messages = {
            success: dialog.getAttribute("data-question-success") || "",
            success_header: dialog.getAttribute("data-question-success-header") || "",
            error: dialog.getAttribute("data-question-error") || ""
        };
    }

    function initMobileCart(root) {
        var page = root.closest(".products-details-page");
        var cart = page && page.querySelector("[data-pdp-mobile-cart]");
        if (!cart || cart.__pdpMobileCartBound) {
            return;
        }

        cart.__pdpMobileCartBound = true;
        var nativeQuantity = root.querySelector("#product-quantity");
        var originalButton = root.querySelector(".btn-add-to-cart");
        var productButtons = root.querySelector(".product-buttons");
        var currentPrice = root.querySelector(".product-formatted-price");
        var oldPrice = root.querySelector(".product-formatted-price-old");
        var mobilePrice = cart.querySelector("[data-pdp-mobile-price]");
        var mobileOldPrice = cart.querySelector("[data-pdp-mobile-old-price]");
        var mobileQuantity = cart.querySelector("[data-pdp-mobile-qty]");
        var submit = cart.querySelector("[data-pdp-mobile-submit]");
        var minus = cart.querySelector("[data-pdp-mobile-qty-minus]");
        var plus = cart.querySelector("[data-pdp-mobile-qty-plus]");
        var mobileMedia = window.matchMedia
            ? window.matchMedia("(max-width: 767.98px)")
            : { matches: window.innerWidth < 768 };
        var lastScrollY = window.pageYOffset || 0;
        var scrollFrame = null;
        var mobileCartEnabled = false;

        function isAvailable() {
            return productButtons
                && !productButtons.classList.contains("d-none")
                && window.getComputedStyle(productButtons).display !== "none";
        }

        function syncCart() {
            if (mobilePrice && currentPrice) {
                mobilePrice.textContent = currentPrice.textContent.trim();
            }
            if (mobileOldPrice) {
                var oldText = oldPrice ? oldPrice.textContent.trim() : "";
                mobileOldPrice.textContent = oldText;
                mobileOldPrice.classList.toggle("d-none", !oldText);
            }
            if (mobileQuantity && nativeQuantity) {
                mobileQuantity.textContent = nativeQuantity.value || "1";
            }
            if (submit && originalButton) {
                submit.disabled = Boolean(originalButton.disabled);
                var originalLabel = originalButton.querySelector("span");
                var mobileLabel = submit.querySelector("span");
                if (originalLabel && mobileLabel) {
                    mobileLabel.textContent = originalLabel.textContent;
                }
            }
            cart.classList.toggle("is-unavailable", !isAvailable());
        }

        function updateBodySpace() {
            var enabled = mobileMedia.matches && isAvailable();
            document.body.classList.toggle("has-pdp-mobile-cart", enabled);
            if (!enabled) {
                cart.classList.add("is-scroll-hidden");
            } else if (!mobileCartEnabled) {
                lastScrollY = window.pageYOffset || 0;
                cart.classList.remove("is-scroll-hidden");
            }
            mobileCartEnabled = enabled;
        }

        function dispatchQuantityEvents() {
            ["input", "change"].forEach(function (eventName) {
                var event;
                if (typeof window.Event === "function") {
                    event = new Event(eventName, { bubbles: true });
                } else {
                    event = document.createEvent("Event");
                    event.initEvent(eventName, true, false);
                }
                nativeQuantity.dispatchEvent(event);
            });
        }

        function setQuantity(delta) {
            if (!nativeQuantity || nativeQuantity.disabled) {
                return;
            }
            var options = nativeQuantity.options;
            if (!options || !options.length) {
                return;
            }
            var currentIndex = nativeQuantity.selectedIndex;
            var nextIndex = Math.max(0, Math.min(options.length - 1, currentIndex + delta));
            if (nextIndex === currentIndex) {
                return;
            }
            nativeQuantity.selectedIndex = nextIndex;
            dispatchQuantityEvents();
            syncCart();
        }

        if (minus) {
            minus.addEventListener("click", function () {
                setQuantity(-1);
            });
        }
        if (plus) {
            plus.addEventListener("click", function () {
                setQuantity(1);
            });
        }
        if (submit) {
            submit.addEventListener("click", function () {
                if (originalButton && !originalButton.disabled) {
                    originalButton.click();
                }
            });
        }
        if (nativeQuantity) {
            nativeQuantity.addEventListener("input", syncCart);
            nativeQuantity.addEventListener("change", syncCart);
        }

        window.addEventListener("scroll", function () {
            // Keep mobile cart fixed/sticky at the bottom, do not hide it on scroll.
        }, { passive: true });

        if (mobileMedia.addEventListener) {
            mobileMedia.addEventListener("change", updateBodySpace);
        } else if (mobileMedia.addListener) {
            mobileMedia.addListener(updateBodySpace);
        }

        if (window.MutationObserver) {
            var observer = new MutationObserver(function () {
                syncCart();
                updateBodySpace();
            });
            [productButtons, currentPrice, oldPrice, originalButton, nativeQuantity].forEach(function (element) {
                if (element) {
                    observer.observe(element, {
                        attributes: true,
                        childList: true,
                        subtree: true,
                        characterData: true,
                        attributeFilter: ["class", "disabled"]
                    });
                }
            });
        }

        syncCart();
        updateBodySpace();
        window.setTimeout(function () {
            cart.classList.remove("is-loading", "is-scroll-hidden");
            cart.classList.add("is-ready");
            updateBodySpace();
        }, reducedMotion ? 20 : 220);
    }

    function initReels(root) {
        var reelItems = root.querySelectorAll(".reel-circle-item");
        var dialog = document.getElementById("reels-modal");
        var video = document.getElementById("reels-video");
        if (!reelItems.length || !dialog || !video || dialog.__pdpReelsBound) {
            return;
        }

        dialog.__pdpReelsBound = true;
        var closeButton = document.getElementById("reels-close-btn");
        var muteButton = document.getElementById("reels-mute-btn");
        var mutedIcon = document.getElementById("icon-muted");
        var unmutedIcon = document.getElementById("icon-unmuted");
        var progressContainer = document.getElementById("reels-progress-container");
        var previousButton = document.getElementById("reels-prev-btn");
        var nextButton = document.getElementById("reels-next-btn");
        var centerZone = document.getElementById("reels-center-zone");
        var loader = document.getElementById("reels-loader");
        if (!closeButton || !muteButton || !previousButton || !nextButton || !centerZone) {
            dialog.__pdpReelsBound = false;
            return;
        }

        var videos = [];
        var progress = [];
        var index = 0;
        var muted = true;
        var pausedByHold = false;
        var holdTimer = null;
        var closeTimer = null;

        function updateMute() {
            video.muted = muted;
            if (mutedIcon && unmutedIcon) {
                mutedIcon.classList.toggle("d-none", !muted);
                unmutedIcon.classList.toggle("d-none", muted);
            }
        }

        function toggleMute(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            muted = !muted;
            updateMute();
        }

        function buildProgress() {
            if (!progressContainer) {
                return;
            }
            progressContainer.innerHTML = "";
            progress = videos.map(function () {
                var bar = document.createElement("div");
                var fill = document.createElement("div");
                bar.className = "reels-progress-bar";
                fill.className = "reels-progress-fill";
                bar.appendChild(fill);
                progressContainer.appendChild(bar);
                return fill;
            });
        }

        function closeReel(event) {
            if (event) {
                event.stopPropagation();
            }
            dialog.classList.add("out");
            document.body.style.overflow = "";
            video.pause();
            window.clearTimeout(closeTimer);
            closeTimer = window.setTimeout(function () {
                dialog.classList.remove("unfold", "out");
                video.removeAttribute("src");
                video.load();
            }, 1000);
        }

        function playVideo(nextIndex) {
            if (nextIndex >= videos.length) {
                closeReel();
                return;
            }
            index = Math.max(0, nextIndex);
            progress.forEach(function (fill, progressIndex) {
                fill.style.width = progressIndex < index ? "100%" : "0%";
            });
            if (loader) {
                loader.classList.remove("d-none");
            }
            video.src = videos[index];
            updateMute();
            var playPromise = video.play();
            if (playPromise && typeof playPromise.then === "function") {
                playPromise.then(function () {
                    if (loader) {
                        loader.classList.add("d-none");
                    }
                }).catch(function () {
                    if (loader) {
                        loader.classList.add("d-none");
                    }
                });
            }
        }

        function openReel(value) {
            videos = String(value || "").split("&&").map(function (item) {
                return item.trim();
            }).filter(Boolean);
            if (!videos.length) {
                return;
            }
            index = 0;
            window.clearTimeout(closeTimer);
            document.body.style.overflow = "hidden";
            dialog.classList.remove("out");
            dialog.classList.add("unfold");
            buildProgress();
            playVideo(0);
        }

        function startHold(event) {
            if (event) {
                event.stopPropagation();
            }
            window.clearTimeout(holdTimer);
            holdTimer = window.setTimeout(function () {
                pausedByHold = true;
                video.pause();
            }, 220);
        }

        function endHold(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            window.clearTimeout(holdTimer);
            if (pausedByHold) {
                pausedByHold = false;
                video.play();
            } else {
                toggleMute();
            }
        }

        video.removeAttribute("loop");
        video.addEventListener("timeupdate", function () {
            if (video.duration && progress[index]) {
                progress[index].style.width = ((video.currentTime / video.duration) * 100) + "%";
            }
        });
        video.addEventListener("ended", function () {
            playVideo(index + 1);
        });
        closeButton.addEventListener("click", closeReel);
        var overlay = document.getElementById("reels-modal-bg");
        if (overlay) {
            overlay.addEventListener("click", function (event) {
                if (event.target === overlay) {
                    closeReel(event);
                }
            });
        }
        muteButton.addEventListener("click", toggleMute);
        previousButton.addEventListener("click", function (event) {
            event.stopPropagation();
            playVideo(index - 1);
        });
        nextButton.addEventListener("click", function (event) {
            event.stopPropagation();
            playVideo(index + 1);
        });
        centerZone.addEventListener("mousedown", startHold);
        centerZone.addEventListener("mouseup", endHold);
        centerZone.addEventListener("mouseleave", function () {
            window.clearTimeout(holdTimer);
            if (pausedByHold) {
                pausedByHold = false;
                video.play();
            }
        });
        centerZone.addEventListener("touchstart", startHold, { passive: true });
        centerZone.addEventListener("touchend", endHold);
        reelItems.forEach(function (item) {
            item.addEventListener("click", function (event) {
                event.preventDefault();
                openReel(item.getAttribute("data-videos"));
            });
        });
    }

    function initRelatedProducts(root) {
        if (!window.themeSwiper) {
            if (!root.__pdpRelatedProductsWaiting) {
                root.__pdpRelatedProductsWaiting = true;
                window.addEventListener("load", function () {
                    root.__pdpRelatedProductsWaiting = false;
                    initRelatedProducts(root);
                }, { once: true });
            }
            return;
        }

        var page = root.closest(".products-details-page");
        [
            {
                element: root.querySelector("#related-products-minimal-slider"),
                spaceBetween: 16
            },
            {
                element: page && page.querySelector("#related-products-slider"),
                spaceBetween: 20
            }
        ].forEach(function (config) {
            if (!config.element) {
                return;
            }
            window.themeSwiper.init(config.element, {
                slidesPerView: "auto",
                spaceBetween: config.spaceBetween,
                loop: false,
                navigation: false,
                pagination: false
            });
        });
    }

    function init(root) {
        root = root || document.querySelector(ROOT_SELECTOR);
        if (!root) {
            return;
        }

        if (root.__pdpUiReady) {
            prepareMedia(root);
            root.querySelectorAll("details.accordion-minimal").forEach(bindDetails);
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
        initHydration(root);
        initDynamicDomMotion(root);
        initQuestionAccordions(root);
        initReviewImages(root);
        initQuestionMessages(root);
        initMobileCart(root);
        initReels(root);
        initRelatedProducts(root);
        root.querySelectorAll("details.accordion-minimal").forEach(bindDetails);
    }

    window.pdpInitMobileCart = function (root) {
        initMobileCart(root || document);
    };

    window.pdpInitReels = function (root) {
        initReels(root || document);
    };

    window.pdpInitQuestionMessages = function (root) {
        initQuestionMessages(root || document);
    };

    window.productPageUI = {
        init: init,
        motion: motion,
        setVisibility: setVisibility,
        prepareMedia: prepareMedia,
        switchTab: switchTab,
        bindDetails: bindDetails,
        resolveHydration: resolveHydration
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            init();
        }, { once: true });
    } else {
        init();
    }
})(window, document);
