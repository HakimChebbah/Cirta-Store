const tokenKey = "cirta_admin_token";
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const loginStatus = document.getElementById("loginStatus");
const productForm = document.getElementById("productForm");
const formStatus = document.getElementById("formStatus");
const productsTable = document.getElementById("productsTable");
const resetBtn = document.getElementById("resetBtn");

function getToken() {
  return localStorage.getItem(tokenKey) || "";
}

function setStatus(el, msg, isError = false) {
  el.textContent = msg;
  el.className = `status ${isError ? "err" : "ok"}`;
}

async function login(password) {
  const resp = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Login error");
  localStorage.setItem(tokenKey, data.token);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": getToken()
  };
}

function clearForm() {
  productForm.reset();
  document.getElementById("productId").value = "";
}

function fillForm(p) {
  document.getElementById("productId").value = p.id;
  document.getElementById("name").value = p.name;
  document.getElementById("description").value = p.description;
  document.getElementById("price").value = p.price_da;
  document.getElementById("imageUrl").value = p.image_url || "";
}

async function fetchProducts() {
  const resp = await fetch("/api/products");
  return resp.json();
}

function renderProducts(products) {
  if (!products.length) {
    productsTable.innerHTML = "<p>Aucun produit.</p>";
    return;
  }

  productsTable.innerHTML = `
    <div style="display:grid; gap:.7rem;">
      ${products
        .map(
          (p) => `
            <div class="panel" style="padding:.8rem;">
              <div class="row" style="justify-content:space-between; align-items:flex-start;">
                <div>
                  <strong>${p.name}</strong><br />
                  <span class="muted">${p.price_da} DA</span>
                  <p class="muted" style="margin:.4rem 0;">${p.description}</p>
                  <small class="muted">${p.image_url || "No image"}</small>
                </div>
                <div class="row" style="max-width:220px;">
                  <button class="btn btn-ghost edit-btn" data-id="${p.id}">Modifier</button>
                  <button class="btn btn-danger delete-btn" data-id="${p.id}">Supprimer</button>
                </div>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;

  productsTable.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = products.find((p) => p.id === Number(btn.dataset.id));
      if (product) fillForm(product);
      setStatus(formStatus, "Produit charge dans le formulaire.");
    });
  });

  productsTable.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer ce produit ?")) return;
      try {
        const resp = await fetch(`/api/products/${btn.dataset.id}`, {
          method: "DELETE",
          headers: authHeaders()
        });
        if (!resp.ok) throw new Error("Delete failed");
        setStatus(formStatus, "Produit supprime.");
        loadProducts();
      } catch (err) {
        setStatus(formStatus, "Erreur de suppression (verifie connexion admin).", true);
      }
    });
  });
}

async function loadProducts() {
  const products = await fetchProducts();
  renderProducts(products);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await login(document.getElementById("password").value);
    setStatus(loginStatus, "Connecte.");
  } catch (err) {
    setStatus(loginStatus, "Mot de passe incorrect.", true);
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(tokenKey);
  setStatus(loginStatus, "Deconnecte.");
});

resetBtn.addEventListener("click", clearForm);

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("productId").value;
  const payload = {
    name: document.getElementById("name").value.trim(),
    description: document.getElementById("description").value.trim(),
    price_da: Number(document.getElementById("price").value),
    image_url: document.getElementById("imageUrl").value.trim()
  };

  try {
    const resp = await fetch(id ? `/api/products/${id}` : "/api/products", {
      method: id ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error("Save failed");
    setStatus(formStatus, id ? "Produit modifie." : "Produit ajoute.");
    clearForm();
    loadProducts();
  } catch (err) {
    setStatus(formStatus, "Erreur enregistrement (verifie connexion admin).", true);
  }
});

loadProducts();
