(() => {
  const DEFAULT_NOTE = "kirill-bogatov";
  const stackEl = document.getElementById("stack");
  const cache = new Map();
  let stack = [];

  function parseStack(search) {
    const params = new URLSearchParams(search);
    const first = params.get("note") || DEFAULT_NOTE;
    const rest = params.getAll("stackedNotes");
    return [first, ...rest].filter((slug, i, all) => slug && all.indexOf(slug) === i);
  }

  function buildUrl(slugs) {
    const params = new URLSearchParams();
    params.set("note", slugs[0]);
    slugs.slice(1).forEach((slug) => params.append("stackedNotes", slug));
    return location.pathname + "?" + params.toString();
  }

  async function loadNote(slug) {
    if (cache.has(slug)) return cache.get(slug);
    const promise = fetch("/notes/" + encodeURIComponent(slug) + ".html")
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (!text) return null;
        const article = new DOMParser().parseFromString(text, "text/html").querySelector("article.note");
        if (!article) return null;
        const title = article.querySelector("h1")?.textContent.trim() || slug;
        const links = [...article.querySelectorAll("a[data-note]")].map((a) => a.dataset.note);
        return { slug, title, article, links };
      })
      .catch(() => null);
    cache.set(slug, promise);
    return promise;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function buildPane(note, slug, index, prevTitle) {
    const pane = el("section", "pane");
    pane.dataset.index = index;

    const title = note ? note.title : "Заметка не найдена";

    const body = el("div", "pane-body");
    if (index > 0) {
      const back = el("a", "pane-back", "← " + prevTitle);
      back.href = buildUrl(stack.slice(0, index));
      back.dataset.back = index - 1;
      body.appendChild(back);
    }
    if (note) {
      body.appendChild(note.article.cloneNode(true));
    } else {
      body.appendChild(el("h1", "", title));
      body.appendChild(el("p", "", "Такой заметки нет: " + slug));
    }

    body.querySelectorAll("a[href]").forEach((a) => {
      if (a.origin && a.origin !== location.origin && /^https?:$/.test(a.protocol)) {
        a.target = "_blank";
        a.rel = [...new Set([...a.relList, "noopener", "noreferrer"])].join(" ");
      }
    });

    body.querySelectorAll(".carousel-btn").forEach((btn) => { btn.hidden = false; });

    pane.appendChild(body);
    return pane;
  }

  const EASE = "cubic-bezier(0.22, 0.7, 0.2, 1)";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 700px)");
  let renderId = 0;
  let firstRender = true;

  function sizeFrames(from, to) {
    return [
      { flexBasis: from + "px", width: from + "px", opacity: from ? 1 : 0 },
      { flexBasis: to + "px", width: to + "px", opacity: to ? 1 : 0 },
    ];
  }

  function animateIn(pane, duration) {
    const w = pane.offsetWidth;
    pane.dataset.fullWidth = w;
    return pane.animate(sizeFrames(0, w), { duration, easing: EASE });
  }

  function animateOut(pane, duration) {
    const w = pane.offsetWidth;
    pane.getAnimations().forEach((a) => a.cancel());
    pane.classList.add("leaving");
    pane.setAttribute("aria-hidden", "true");
    const anim = pane.animate(sizeFrames(w, 0), { duration, easing: EASE, fill: "forwards" });
    anim.onfinish = () => pane.remove();
    return anim;
  }

  async function render(scroll = true) {
    const id = ++renderId;
    const notes = await Promise.all(stack.map(loadNote));
    if (id !== renderId) return;

    const animate = !firstRender && !reducedMotion.matches;
    const duration = animate ? 280 : 0;
    if (firstRender) stackEl.replaceChildren();
    firstRender = false;

    const current = [...stackEl.children].filter((p) => p.classList.contains("pane") && !p.classList.contains("leaving"));
    const common = Math.min(current.length, stack.length);

    // Same level: swap content in place, no animation. Once one pane differs, the
    // ones after it are rebuilt too so their "back" links stay correct.
    let diverged = false;
    for (let i = 0; i < common; i++) {
      if (!diverged && current[i].dataset.slug === stack[i]) continue;
      diverged = true;
      const prevTitle = i > 0 && notes[i - 1] ? notes[i - 1].title : "назад";
      const pane = buildPane(notes[i], stack[i], i, prevTitle);
      pane.dataset.slug = stack[i];
      current[i].replaceWith(pane);
    }

    current.slice(common).forEach((pane) => {
      if (animate && !mobile.matches) animateOut(pane, duration);
      else pane.remove();
    });

    const fresh = [];
    for (let i = common; i < stack.length; i++) {
      const prevTitle = i > 0 && notes[i - 1] ? notes[i - 1].title : "назад";
      const pane = buildPane(notes[i], stack[i], i, prevTitle);
      pane.dataset.slug = stack[i];
      stackEl.appendChild(pane);
      fresh.push(pane);
    }
    fresh.forEach((pane) => {
      if (!animate) return;
      if (mobile.matches) pane.animate([{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration, easing: EASE });
      else animateIn(pane, duration);
    });

    const last = notes[notes.length - 1];
    document.title = (last ? last.title + " — " : "") + "Кирилл Богатов";
    if (scroll) followPane(stack.length - 1, duration, id);
  }

  // Keeps the target pane in view while neighbours grow/shrink during animation.
  function followPane(index, duration, id) {
    const started = performance.now();
    const step = () => {
      if (id !== renderId) return;
      const pane = [...stackEl.children].filter((p) => !p.classList.contains("leaving"))[index];
      if (pane) {
        const right = pane.offsetLeft + Math.max(pane.offsetWidth, Number(pane.dataset.fullWidth) || 0) - stackEl.clientWidth;
        let left = stackEl.scrollLeft;
        if (right > left) left = right;
        if (pane.offsetLeft < left) left = pane.offsetLeft;
        if (left !== stackEl.scrollLeft) stackEl.scrollLeft = left;
      }
      if (performance.now() - started < duration + 50) requestAnimationFrame(step);
    };
    step();
  }

  function navigate(next, push = true) {
    stack = next;
    if (push) history.pushState(null, "", buildUrl(stack));
    render();
  }

  function openLightbox(images, current) {
    let i = images.indexOf(current);
    const box = el("div", "lightbox");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    const full = el("img");
    const prev = el("button", "lightbox-btn prev", "‹");
    const next = el("button", "lightbox-btn next", "›");
    const close = el("button", "lightbox-btn close", "×");
    prev.type = next.type = close.type = "button";
    prev.setAttribute("aria-label", "Предыдущий скриншот");
    next.setAttribute("aria-label", "Следующий скриншот");
    close.setAttribute("aria-label", "Закрыть");
    box.append(full, prev, next, close);

    const show = (n) => {
      i = (n + images.length) % images.length;
      full.src = images[i].currentSrc || images[i].src;
      full.alt = images[i].alt;
    };
    const shut = () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.classList.remove("lightbox-open");
      box.remove();
    };
    const onKey = (e) => {
      if (e.key === "Escape") shut();
      else if (e.key === "ArrowLeft") show(i - 1);
      else if (e.key === "ArrowRight") show(i + 1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };

    box.addEventListener("click", (e) => {
      if (e.target === prev) show(i - 1);
      else if (e.target === next) show(i + 1);
      else shut();
    });
    document.addEventListener("keydown", onKey, true);
    document.body.classList.add("lightbox-open");
    show(i);
    if (images.length < 2) prev.hidden = next.hidden = true;
    document.body.appendChild(box);
    close.focus();
  }

  stackEl.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    const pane = event.target.closest(".pane");
    if (!pane) return;
    const index = Number(pane.dataset.index);

    const shot = event.target.closest(".carousel-track img");
    if (shot) {
      openLightbox([...shot.parentElement.querySelectorAll("img")], shot);
      return;
    }

    const slideBtn = event.target.closest(".carousel-btn");
    if (slideBtn) {
      const track = slideBtn.parentElement.querySelector(".carousel-track");
      const dir = slideBtn.classList.contains("next") ? 1 : -1;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      if (dir > 0 && atEnd) track.scrollTo({ left: 0, behavior: "smooth" });
      else if (dir < 0 && track.scrollLeft <= 2) track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
      else track.scrollBy({ left: dir * track.clientWidth, behavior: "smooth" });
      return;
    }

    const back = event.target.closest("a[data-back]");
    if (back) {
      event.preventDefault();
      navigate(stack.slice(0, Number(back.dataset.back) + 1));
      return;
    }

    const link = event.target.closest("a[data-note]");
    if (link) {
      event.preventDefault();
      const slug = link.dataset.note;
      const existing = stack.indexOf(slug);
      if (existing !== -1 && existing <= index) {
        // Already open to the left: close the panes right of it and go there.
        navigate(stack.slice(0, existing + 1));
      } else {
        navigate([...stack.slice(0, index + 1), slug]);
      }
      return;
    }
  });

  window.addEventListener("popstate", () => {
    stack = parseStack(location.search);
    render();
  });

  stack = parseStack(location.search);
  render();
})();
