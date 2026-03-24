const productsGrid = document.getElementById("productsGrid");
const orderModal = document.getElementById("orderModal");
const closeModalBtn = document.getElementById("closeModal");
const orderForm = document.getElementById("orderForm");
const orderStatus = document.getElementById("orderStatus");
const modalProduct = document.getElementById("modalProduct");

let selectedProduct = null;

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
  productsGrid.innerHTML = "<p>Chargement...</p>";
  const resp = await fetch("/api/products");
  const products = await resp.json();

  if (!Array.isArray(products) || products.length === 0) {
    productsGrid.innerHTML = "<p>Aucun produit disponible pour le moment.</p>";
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
            <button class="btn btn-primary order-btn" data-id="${product.id}">Commander</button>
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

  orderStatus.textContent = "Envoi en cours...";
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
      Redirection vers WhatsApp...<br />
      Si rien ne se passe, <a href="${data.whatsapp_url}" target="_self" style="color:#16a34a;font-weight:700;">clique ici pour ouvrir WhatsApp</a>.
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
    orderStatus.textContent = "Erreur: impossible d'envoyer la commande.";
    orderStatus.className = "status err";
  }
});

closeModalBtn.addEventListener("click", closeModal);
orderModal.addEventListener("click", (e) => {
  if (e.target === orderModal) closeModal();
});

loadProducts();
