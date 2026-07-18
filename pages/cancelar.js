import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Cancelar() {
  const [phone, setPhone] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState("");

  const search = async () => {
    if (phone.trim().length < 8) return;
    setLoading(true);
    setSearched(false);

    const { data: shops } = await supabase.from("barbershops").select("*").limit(1);
    if (!shops || shops.length === 0) {
      setLoading(false);
      return;
    }

    setShopName(shops[0].name);

    const { data } = await supabase
      .from("appointments")
      .select(
        `id, start_time, status,
         services(name),
         professionals(name),
         clients!inner(name, phone)`
      )
      .eq("barbershop_id", shops[0].id)
      .eq("clients.phone", phone.trim())
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    setAppointments(data || []);
    setSearched(true);
    setLoading(false);
  };

  const cancelAppointment = async (id) => {
    const confirmed = window.confirm("Cancelar este agendamento?");
    if (!confirmed) return;

    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);

    if (error) {
      alert("Erro ao cancelar: " + error.message);
      return;
    }

    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <a href="/" style={styles.backLink}>‹</a>
          <div style={styles.headerBrandText}>{shopName || "Cancelar agendamento"}</div>
          <div style={{ width: 20 }} />
        </div>

        <div style={styles.stepBody}>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowLabel}>Cancelar agendamento</span>
          </div>

          <p style={styles.helperText}>
            Digite o WhatsApp que você usou para agendar.
          </p>

          <input
            placeholder="WhatsApp (com DDD)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            style={styles.input}
          />
          <button onClick={search} style={styles.searchBtn}>
            {loading ? "Buscando..." : "Buscar agendamentos"}
          </button>

          {searched && appointments.length === 0 && (
            <p style={styles.helperText}>Nenhum agendamento encontrado para esse número.</p>
          )}

          {appointments.length > 0 && (
            <div style={styles.list}>
              {appointments.map((a) => {
                const d = new Date(a.start_time);
                const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={a.id} style={styles.apptRow}>
                    <div>
                      <div style={styles.apptTitle}>{a.services?.name}</div>
                      <div style={styles.apptSub}>
                        {dateStr} às {timeStr} · {a.professionals?.name || "Qualquer profissional"}
                      </div>
                    </div>
                    <button onClick={() => cancelAppointment(a.id)} style={styles.cancelBtn}>Cancelar</button>
                  </div>
                );
              })}
            </div>
          )}
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
  eyebrow: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 },
  eyebrowLabel: { fontFamily: "sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8378" },
  helperText: { fontFamily: "sans-serif", fontSize: 12, color: "#8A8378", marginBottom: 14, lineHeight: 1.5 },
  input: { width: "100%", background: "#0F0D0B", border: "1px solid #2A2622", borderRadius: 3, padding: "13px 14px", color: "#E8DDD0", fontFamily: "sans-serif", fontSize: 14, marginBottom: 10, boxSizing: "border-box" },
  searchBtn: { width: "100%", background: "#C9924A", border: "none", borderRadius: 3, padding: "13px", color: "#0F0D0B", fontFamily: "sans-serif", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", marginBottom: 20 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  apptRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid #2A2622", borderRadius: 3, padding: "14px 16px" },
  apptTitle: { fontFamily: "sans-serif", fontSize: 14, color: "#E8DDD0" },
  apptSub: { fontFamily: "sans-serif", fontSize: 11, color: "#8A8378", marginTop: 3 },
  cancelBtn: { background: "transparent", border: "1px solid #5A3D33", borderRadius: 3, padding: "8px 12px", color: "#C0705C", fontFamily: "sans-serif", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" },
};
