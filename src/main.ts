import "./style.css";
import manifest from "./generated/gallery-manifest.json";

type GalleryImage = {
  src: string;
  alt: string;
};
type GallerySet = { id: string; title: string; images: GalleryImage[] };

const SITE_LABEL = "Photography Portfolio";

type ElAttrs = Record<string, string | boolean | number | undefined> & {
  className?: string;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: ElAttrs,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props) {
    const { className, ...rest } = props;
    if (className) node.className = className;
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined) continue;
      node.setAttribute(key, typeof value === "boolean" ? String(value) : String(value));
    }
  }
  if (children) {
    for (const c of children) {
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }
  return node;
}

function buildApp(root: HTMLElement) {
  const sets = manifest.sets as GallerySet[];

  const header = el("header", { className: "site-header" }, [
    el("div", { className: "site-header__inner" }, [
      el("a", { className: "site-logo", href: "#top" }, [SITE_LABEL]),
      sets.length > 1
        ? el("nav", { className: "site-nav", "aria-label": "Collections" }, [
            ...sets.map((s) =>
              el("a", { className: "site-nav__link", href: `#${s.id}` }, [
                s.title,
              ])
            ),
          ])
        : document.createDocumentFragment(),
    ]),
  ]);

  const hero = el("section", { className: "hero", id: "top" }, [
    el("p", { className: "hero__eyebrow" }, ["Selected work by moses yang"]),
    el("h1", { className: "hero__title" }, [
      "Still frames from ",
      el("span", { className: "hero__title-accent" }, ["places"]),
      " and light.",
    ]),
  ]);

  const main = el("main", { className: "gallery-main" });

  sets.forEach((set, setIndex) => {
    const section = el("section", {
      className: "album",
      id: set.id,
    });
    section.setAttribute("aria-labelledby", `heading-${set.id}`);

    const heading = el("h2", {
      className: "album__title",
      id: `heading-${set.id}`,
    });
    heading.textContent = set.title;

    const grid = el("div", { className: "album__grid" });

    if (set.images.length === 0) {
      grid.append(
        el("p", { className: "album__empty" }, [
          "No images yet. Drop JPG, PNG, or WebP files into ",
          el("code", { className: "album__code" }, [
            `public/photos/${set.title}/`,
          ]),
          ", then run ",
          el("code", { className: "album__code" }, ["npm run dev"]),
          " or ",
          el("code", { className: "album__code" }, ["npm run photos"]),
          ".",
        ])
      );
    } else {
      set.images.forEach((image, index) => {
        const btn = el("button", {
          className: "thumb",
          type: "button",
          "aria-label": `View larger: ${image.alt}`,
        });
        const img = el("img", {
          className: "thumb__img",
          src: image.src,
          alt: image.alt,
          loading: "lazy",
          decoding: "async",
        });
        btn.append(img);
        btn.addEventListener("click", () => openLightbox(setIndex, index));
        grid.append(btn);
      });
    }

    section.append(heading, grid);
    main.append(section);
  });

  const footer = el("footer", { className: "site-footer" }, [
    el("p", { className: "site-footer__text" }, [
      `© ${new Date().getFullYear()} · ${SITE_LABEL}`,
    ]),
  ]);

  root.append(header, hero, main, footer);

  let lightboxCleanup: (() => void) | null = null;

  function openLightbox(setIndex: number, imageIndex: number) {
    const set = sets[setIndex];
    if (!set || set.images.length === 0) return;

    const overlay = el("div", {
      className: "lightbox",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": set.title,
    });

    const backdrop = el("button", {
      className: "lightbox__backdrop",
      type: "button",
      "aria-label": "Close gallery",
    });

    const stage = el("div", { className: "lightbox__stage" });
    const figure = el("figure", { className: "lightbox__figure" });
    const img = el("img", {
      className: "lightbox__img",
      alt: "",
    });
    const caption = el("figcaption", { className: "lightbox__caption" });

    const closeBtn = el("button", {
      className: "lightbox__close",
      type: "button",
      "aria-label": "Close",
    });
    closeBtn.innerHTML =
      '<span aria-hidden="true">&times;</span><span class="visually-hidden">Close</span>';

    const prevBtn = el("button", {
      className: "lightbox__nav lightbox__nav--prev",
      type: "button",
      "aria-label": "Previous image",
    });
    prevBtn.textContent = "‹";

    const nextBtn = el("button", {
      className: "lightbox__nav lightbox__nav--next",
      type: "button",
      "aria-label": "Next image",
    });
    nextBtn.textContent = "›";

    figure.append(img, caption);
    stage.append(prevBtn, figure, nextBtn);
    overlay.append(backdrop, closeBtn, stage);

    let idx = imageIndex;

    function render() {
      const item = set.images[idx];
      img.src = item.src;
      img.alt = item.alt;
      caption.textContent = item.alt;
      prevBtn.disabled = idx <= 0;
      nextBtn.disabled = idx >= set.images.length - 1;
    }

    function close() {
      lightboxCleanup?.();
      lightboxCleanup = null;
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        idx -= 1;
        render();
      } else if (e.key === "ArrowRight" && idx < set.images.length - 1) {
        e.preventDefault();
        idx += 1;
        render();
      }
    }

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (idx > 0) {
        idx -= 1;
        render();
      }
    });
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (idx < set.images.length - 1) {
        idx += 1;
        render();
      }
    });

    document.addEventListener("keydown", onKey);
    document.body.append(overlay);
    document.body.classList.add("lightbox-open");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => overlay.classList.add("lightbox--visible"));

    render();

    lightboxCleanup = () => {
      document.removeEventListener("keydown", onKey);
      overlay.classList.remove("lightbox--visible");
      window.setTimeout(() => overlay.remove(), 200);
      document.body.classList.remove("lightbox-open");
      document.body.style.overflow = prevOverflow;
    };
  }
}

const app = document.querySelector<HTMLElement>("#app");
if (app) buildApp(app);
