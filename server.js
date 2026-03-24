const path = require("path");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "cirta_store.db");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TRUSTbank2003";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "cirta_admin_static_token";
const WHATSAPP_URL_BASE = "https://wa.me/213657010417?text=";

const db = new sqlite3.Database(DB_PATH);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_da INTEGER NOT NULL,
      image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_location TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  const countRow = await get("SELECT COUNT(*) AS count FROM products");
  if (countRow.count === 0) {
    const seedProducts = [
      ["iPhone Case", "Protection elegante et resistante pour iPhone.", 1200, "iphone case.jpg"],
      ["Airpods Case", "Etui compact anti-rayures pour Airpods.", 900, "airpods case.jpg"],
      ["Wireless Headphones", "Casque sans fil avec son clair et batterie durable.", 4500, "headphones.jpg"],
      ["Fast Charger", "Chargeur rapide et securise pour usage quotidien.", 2000, "charger.jpg"],
      ["USB-C Cable", "Cable USB-C robuste pour charge et transfert data.", 700, "cable.jpg"],
      ["Screen Protector", "Verre trempe haute transparence et anti-choc.", 800, "screen protector.jpg"]
    ];

    for (const item of seedProducts) {
      // eslint-disable-next-line no-await-in-loop
      await run(
        "INSERT INTO products(name, description, price_da, image_url) VALUES(?, ?, ?, ?)",
        item
      );
    }
  }
}

function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }
  return res.json({ token: ADMIN_TOKEN });
});

app.get("/api/products", async (req, res) => {
  try {
    const rows = await all(
      "SELECT id, name, description, price_da, image_url FROM products ORDER BY id DESC"
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Failed to load products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const row = await get(
      "SELECT id, name, description, price_da, image_url FROM products WHERE id = ?",
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "Product not found" });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: "Failed to load product" });
  }
});

app.post("/api/products", adminAuth, async (req, res) => {
  const { name, description, price_da, image_url } = req.body || {};
  if (!name || !description || !Number.isFinite(Number(price_da))) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  try {
    const result = await run(
      "INSERT INTO products(name, description, price_da, image_url) VALUES(?, ?, ?, ?)",
      [name.trim(), description.trim(), Number(price_da), (image_url || "").trim()]
    );
    const created = await get(
      "SELECT id, name, description, price_da, image_url FROM products WHERE id = ?",
      [result.id]
    );
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create product" });
  }
});

app.put("/api/products/:id", adminAuth, async (req, res) => {
  const { name, description, price_da, image_url } = req.body || {};
  if (!name || !description || !Number.isFinite(Number(price_da))) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  try {
    const result = await run(
      "UPDATE products SET name = ?, description = ?, price_da = ?, image_url = ? WHERE id = ?",
      [name.trim(), description.trim(), Number(price_da), (image_url || "").trim(), req.params.id]
    );
    if (result.changes === 0) return res.status(404).json({ error: "Product not found" });
    const updated = await get(
      "SELECT id, name, description, price_da, image_url FROM products WHERE id = ?",
      [req.params.id]
    );
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", adminAuth, async (req, res) => {
  try {
    const result = await run("DELETE FROM products WHERE id = ?", [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: "Product not found" });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

app.post("/api/orders", async (req, res) => {
  const { product_id, customer_name, customer_phone, customer_location, note } = req.body || {};
  if (!product_id || !customer_name || !customer_phone || !customer_location) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const product = await get(
      "SELECT id, name, price_da FROM products WHERE id = ?",
      [product_id]
    );
    if (!product) return res.status(404).json({ error: "Product not found" });

    const cleanName = customer_name.trim();
    const cleanPhone = customer_phone.trim();
    const cleanLocation = customer_location.trim();
    const cleanNote = (note || "").trim();

    await run(
      "INSERT INTO orders(product_id, customer_name, customer_phone, customer_location, note) VALUES(?, ?, ?, ?, ?)",
      [product_id, cleanName, cleanPhone, cleanLocation, cleanNote]
    );

    const msg = [
      "Bonjour, je veux commander",
      "",
      `Produit: ${product.name}`,
      `Prix: ${product.price_da} DA`,
      `Nom: ${cleanName}`,
      `Telephone: ${cleanPhone}`,
      `Adresse/Wilaya: ${cleanLocation}`,
      `Note: ${cleanNote || "-"}`
    ].join("\n");

    return res.status(201).json({
      ok: true,
      whatsapp_url: `${WHATSAPP_URL_BASE}${encodeURIComponent(msg)}`
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create order" });
  }
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Cirta Store running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize database", err);
    process.exit(1);
  });
