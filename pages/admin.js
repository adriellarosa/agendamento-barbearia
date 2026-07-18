import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shopName, setShopName] = useState("");

  const checkPassword = () => {
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    if (passwordInput === correctPassword) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  useEffect(() => {
    if (!authenticated) return;

    async function loadAppointments() {
      const { data: shops } = await supabase.from("barbershops").select("*").limit(1);

      if (!shops || shops.length === 0) {
        setError("Nenhuma barbearia cadastrada ainda.");
        setLoading(false);
        return;
      }

      setShopName(shops[0].name);

      const { data, error: apptError } = await supabase
        .from("appointments")
        .select(
          `id, start_time, status,
           clients(name, phone),
           services(name, price),
           professionals(name)`
        )
        .eq("barbershop_id", shops[0].id)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (apptError) {
        setError("Erro ao carregar agendamentos: " + apptError.message);
        setLoading(false);
        return;
      }

      setAppointments(data || []);
      setLoading(false);
    }

    loadAppointments();
  }, [authenticated]);

  const grouped = {};
  appointments.forEach((a) => {
    const d = new Date(a.start_time);
    const key = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  if (!authenticated) {
    return (
      <div style={styles.page}>
        <div style={styles.loginBox}>
          <h1 style={styles.title}>Acesso restrito</h1>
          <input
            type="password"
            placeholder="Senha"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkPassword()}
            style={styles.input}
          />
          {passwordError && <p style={styles.errorText}>Senha incorreta.</p>}
          <button onClick={checkPassword} style={styles.loginBtn}>Entrar</button>
        </div>
      </div>
    );
  }

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
      <div style={styles.container}>
        <h1 style={styles.title}>{shopName} — Agendamentos</h1>

        {appointments.length === 0 && (
          <p style={{ color: "#8A8378", fontFamily: "sans-serif" }}>Nenhum agendamento ainda.</p>
        )}

        {Object.keys(grouped).map((dateKey) => (
          <div key={dateKey} style={styles.dateGroup}>
            <h2 style={styles.dateTitle}>{dateKey}</h2>
            {grouped[dateKey].map((a) => {
              const time = new Date(a.start_time).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div key={a.id} style={styles.card}>
                  <div style={styles.time}>{time}</div>
                  <div style={styles.details}>
                    <div style={styles.clientName}>{a.clients?.name || "Cliente"}</div>
                    <div style={styles.subInfo}>{a.services?.name} · {a.professionals?.name || "Qualquer profissional"}</div>
                    <div style={styles.subInfo}>{a.clients?.phone}</div>
                  </div>
                  <div style={styles.status}>{a.status}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0F0D0B",
    padding: "32px 16px",
    fontFamily: "Georgia, serif",
  },
  container: {
    maxWidth: 600,
    margin: "0 auto",
  },
  loginBox: {
    maxWidth: 320,
    margin: "80px auto 0",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    width: "100%",
    background: "#17140F",
    border: "1px solid #2A2622",
    borderRadius: 3,
    padding: "13px 14px",
    color: "#E8DDD0",
    fontFamily: "sans-serif",
    fontSize: 14,
    boxSizing: "border-box",
  },
  loginBtn: {
    background: "#C9924A",
    border: "none",
    borderRadius: 3,
    padding: "13px",
    color: "#0F0D0B",
    fontFamily: "sans-serif",
    fontSize: 13,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  errorText: {
    color: "#C05C4A",
    fontFamily: "sans-serif",
    fontSize: 12,
    margin: 0,
  },
  title: {
    color: "#E8DDD0",
    fontSize: 22,
    marginBottom: 24,
  },
  dateGroup: {
    marginBottom: 28,
  },
  dateTitle: {
    color: "#C9924A",
    fontFamily: "sans-serif",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 10,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#17140F",
    border: "1px solid #2A2622",
    borderRadius: 4,
    padding: "14px 16px",
    marginBottom: 8,
  },
  time: {
    color: "#C9924A",
    fontFamily: "sans-serif",
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 50,
  },
  details: {
    flex: 1,
  },
  clientName: {
    color: "#E8DDD0",
    fontFamily: "sans-serif",
    fontSize: 14,
  },
  subInfo: {
    color: "#8A8378",
    fontFamily: "sans-serif",
    fontSize: 12,
    marginTop: 2,
  },
  status: {
    color: "#8A8378",
    fontFamily: "sans-serif",
    fontSize: 11,
    textTransform: "uppercase",
  },
};
