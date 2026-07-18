import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Produtos() {
  const [products, setProducts] = useState([]);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      const { data: shops } = await supabase.from("barbershops").select("*").limit(1);

      if (!shops || shops.length === 0) {
        setError("Nenhuma barbearia cadastrada ainda.");
        setLoading(false);
        return;
      }

      setShopName(shops[0].name);

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("barbershop_id", shops[0].id)
        .eq("active", true)
        .order("name", { ascending: true });

      setProducts(data || []);
      setLoading(false);
    }

    loadProducts();
  }, []);

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: "#8A8378", fontFamily: "sans-serif" }}>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <p style={{ color: "#E8DDD0", fontFamily: "sans-serif" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <a href="/" style={styles.backLink}>‹</a>
          <div style={styles.headerBrandText}>{shopName}</div>
          <div style={{ width: 20 }} />
        </div>

        <div style={styles.stepBody}>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowLabel}>Produtos</span>
          </div>

          {products.length === 0 ? (
            <p style={{ color: "#8A8378", fontFamily: "sans-serif", fontSize: 13 }}>
              Nenhum produto cadastrado ainda.
            </p>
          ) : (
            <div style={styles.list}>
              {products.map((p) => (
                <div key={p.id} style={styles.productRow}>
                  <div>
                    <div style={styles.productName}>{p.name}</div>
                    {p.brand && <div style={styles.productBrand}>{p.brand}</div>}
                    {p.description && <div style={styles.productDesc}>{p.description}</div>}
                  </div>
                  <div style={styles.productPrice}>R$ {p.price}</div>
                </div>
              ))}
            </div>
          )}

          <p style={styles.footnote}>Disponível para compra presencial na barbearia.</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0F0D0B", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "Georgia, serif" },
  card: { width: "100%", maxWidth: 380, background: "#17140F", border: "1px solid #2A2622", borderRadius: 4 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", borderBottom: "1px solid #2A2622" },
  backLink: { color: "#E8DDD0", fontSize: 20, textDecoration: "none" },
  headerBrandText: { fontFamily: "sans-serif", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#E8DDD0" },
  stepBody: { padding: "24px 20px 28px" },
  eyebrow: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 },
  eyebrowLabel: { fontFamily: "sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8378" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  productRow: { display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #2A2622", borderRadius: 3, padding: "14px 16px" },
  productName: { fontFamily: "sans-serif", fontSize: 14, color: "#E8DDD0" },
  productDesc: { fontFamily: "sans-serif", fontSize: 11, color: "#8A8378", marginTop: 3 },
  productBrand: { fontFamily: "sans-serif", fontSize: 10, color: "#C9924A", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2
