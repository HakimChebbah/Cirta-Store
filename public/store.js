const productsGrid = document.getElementById("productsGrid");
const orderModal = document.getElementById("orderModal");
const closeModalBtn = document.getElementById("closeModal");
const orderForm = document.getElementById("orderForm");
const orderStatus = document.getElementById("orderStatus");
const modalProduct = document.getElementById("modalProduct");
const langFrBtn = document.getElementById("langFrBtn");
const langArBtn = document.getElementById("langArBtn");
const pageTitle = document.querySelector("title");

let selectedProduct = null;
let currentLang = localStorage.getItem("cirta_lang") || "fr";

const i18n = {
  fr: {
    page_title: "Cirta Store | Accessoires Phone en Algerie",
    order_now: "Order Now",
    hero_title: "Your Phone. Upgraded.",
    hero_subtitle: "Premium phone accessories delivered to your door",
    shop_now: "Shop Now",
    our_products: "Our Products",
    why_cirta: "Why Cirta Store",
    feature_fast_title: "Livraison Rapide",
    feature_fast_desc: "Expedition rapide partout en Algerie.",
    feature_quality_title: "Qualite Garantie",
    feature_quality_desc: "Produits fiables et selectionnes avec soin.",
    feature_order_title: "Commande Facile",
    feature_order_desc: "Choisis un produit et commande en quelques clics.",
    reviews_title: "Ce que disent nos clients",
    final_title: "Pret a upgrader ton telephone ?",
    final_btn: "Commander maintenant",
    whatsapp_label: "WhatsApp",
    modal_title: "Commander",
    label_name: "Nom complet",
    label_phone: "Telephone",
    label_location: "Adresse / Wilaya",
    label_note: "Note (optionnel)",
    btn_cancel: "Annuler",
    btn_send_order: "Envoyer la commande",
    loading: "Chargement...",
    empty_products: "Aucun produit disponible pour le moment.",
    order_btn: "Commander",
    sending: "Envoi en cours...",
    redirecting: "Redirection vers WhatsApp...",
    redirect_hint: "Si rien ne se passe, clique ici pour ouvrir WhatsApp.",
    send_error: "Erreur: impossible d'envoyer la commande."
  },
  ar: {
    page_title: "سيرتا ستور | اكسسوارات الهاتف في الجزائر",
    order_now: "اطلب الآن",
    hero_title: "هاتفك... نسخة أفضل",
    hero_subtitle: "اكسسوارات هاتف ممتازة حتى باب دارك",
    shop_now: "تسوق الآن",
    our_products: "منتجاتنا",
    why_cirta: "لماذا سيرتا ستور",
    feature_fast_title: "توصيل سريع",
    feature_fast_desc: "توصيل سريع لكل ولايات الجزائر.",
    feature_quality_title: "جودة مضمونة",
    feature_quality_desc: "منتجات موثوقة ومختارة بعناية.",
    feature_order_title: "طلب سهل",
    feature_order_desc: "اختار المنتج واطلب في ثواني.",
    reviews_title: "آراء زبائننا",
    final_title: "جاهز تطوّر هاتفك؟",
    final_btn: "اطلب الآن",
    whatsapp_label: "واتساب",
    modal_title: "اطلب المنتج",
    label_name: "الاسم الكامل",
    label_phone: "رقم الهاتف",
    label_location: "العنوان / الولاية",
    label_note: "ملاحظة (اختياري)",
    btn_cancel: "الغاء",
    btn_send_order: "ارسال الطلب",
    loading: "جار التحميل...",
    empty_products: "لا توجد منتجات حاليا.",
    order_btn: "اطلب",
    sending: "جاري الارسال...",
    redirecting: "جاري التحويل إلى واتساب...",
    redirect_hint: "اذا لم يفتح، اضغط هنا لفتح واتساب.",
    send_error: "تعذر ارسال الطلب."
  }
};

function t(key) {
  return i18n[currentLang][key] || i18n.fr[key] || key;
}

function applyLanguage() {
  document.documentElement.lang = currentLang === "ar" ? "ar" : "fr";
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
  pageTitle.textContent = t("page_title");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  langFrBtn.classList.toggle("active", currentLang === "fr");
  langArBtn.classList.toggle("active", currentLang === "ar");
}

function setLanguage(lang) {
  currentLang = lang === "ar" ? "ar" : "fr";
  localStorage.setItem("cirta_lang", currentLang);
  applyLanguage();
  loadProducts();
}

function formatPrice(price) {
  return `${Number(price).toLocaleString("fr-FR")} DA`;
}

function buildDeepLink(waUrl) {
  const prefix = "https://wa.me/213657010417?text=";
  if (!waUrl.startsWith(prefix)) return waUrl;
  const encodedText = waUrl.slice(prefix.length);
  return `whatsapp://send?phone=213657010417&text=${encodedText}`;
}

function fallbackImageMarkup(name) {
  return `<div>${name}</div>`;
}

function openModal(product) {
  selectedProduct = product;
  modalProduct.textContent = `${product.name} - ${formatPrice(product.price_da)}`;
  orderStatus.textContent = "";
  orderStatus.className = "status";
  orderForm.reset();
  orderModal.classList.add("open");
}

function closeModal() {
  orderModal.classList.remove("open");
  selectedProduct = null;
}

async function loadProducts() {
  productsGrid.innerHTML = `<p>${t("loading")}</p>`;
  const resp = await fetch("/api/products");
  const products = await resp.json();

  if (!Array.isArray(products) || products.length === 0) {
    productsGrid.innerHTML = `<p>${t("empty_products")}</p>`;
    return;
  }

  productsGrid.innerHTML = products
    .map((product) => {
      const safeUrl = product.image_url ? product.image_url.trim() : "";
      const img = safeUrl
        ? `<img src="${safeUrl}" alt="${product.name}" onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend','${fallbackImageMarkup(
            product.name
          ).replace(/'/g, "\\'")}');" />`
        : fallbackImageMarkup(product.name);

      return `
        <article class="card">
          <div class="card-media">${img}</div>
          <div class="card-body">
            <h3>${product.name}</h3>
            <p class="muted">${product.description}</p>
            <p class="price">${formatPrice(product.price_da)}</p>
            <button class="btn btn-primary order-btn" data-id="${product.id}">${t("order_btn")}</button>
          </div>
        </article>
      `;
    })
    .join("");

  productsGrid.querySelectorAll(".order-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = products.find((p) => p.id === Number(btn.dataset.id));
      if (product) openModal(product);
    });
  });
}

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedProduct) return;

  const payload = {
    product_id: selectedProduct.id,
    customer_name: orderForm.name.value.trim(),
    customer_phone: orderForm.phone.value.trim(),
    customer_location: orderForm.location.value.trim(),
    note: orderForm.note.value.trim()
  };

  orderStatus.textContent = t("sending");
  orderStatus.className = "status";

  try {
    const resp = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Erreur");

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const deepLink = buildDeepLink(data.whatsapp_url);

    orderStatus.className = "status ok";
    orderStatus.innerHTML = `
      ${t("redirecting")}<br />
      <a href="${data.whatsapp_url}" target="_self" style="color:#16a34a;font-weight:700;">${t("redirect_hint")}</a>
    `;

    if (isMobile) {
      // Try app deep-link first on mobile, then fallback to wa.me.
      window.location.href = deepLink;
      setTimeout(() => {
        window.location.href = data.whatsapp_url;
      }, 1200);
    } else {
      window.location.href = data.whatsapp_url;
    }
  } catch (err) {
    orderStatus.textContent = t("send_error");
    orderStatus.className = "status err";
  }
});

closeModalBtn.addEventListener("click", closeModal);
orderModal.addEventListener("click", (e) => {
  if (e.target === orderModal) closeModal();
});

applyLanguage();
loadProducts();

langFrBtn.addEventListener("click", () => setLanguage("fr"));
langArBtn.addEventListener("click", () => setLanguage("ar"));
