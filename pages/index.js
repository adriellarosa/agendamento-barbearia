import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const TIMES = ["09:00", "09:30", "10:00", "10:30", "11:30", "14:00", "14:30", "15:00", "16:00", "16:30", "17:00"];

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function getNextDays(count) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateLabel(date, index) {
  if (index === 0) return "Hoje";
  if (index === 1) return "Amanhã";
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

export default function Home() {
  const [barbershop, setBarbershop] = useState(null);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [professional, setProfessional] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: shops, error: shopError } = await supabase
        .from("barbershops")
        .select("*")
        .limit(1);

      if (shopError || !shops || shops.length === 0) {
        setError(
          "Nenhuma barbearia cadastrada ainda. Cadastre uma barbearia na tabela 'barbershops' no Supabase."
        );
        setLoading(false);
        return;
      }

      const shop = shops[0];
      setBarbershop(shop);

      const { data: svc } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", shop.id)
        .eq("active", true);

      const { data: profs } = await supabase
        .from("professionals")
        .select("*")
        .eq("barbershop_id", shop.id)
        .eq("active", true);

      setServices(svc || []);
      setProfessionals(profs || []);
      setLoading(false);
    }

    loadData();
  }, []);

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const checkAvailability = async (chosenDate) => {
    setLoadingTimes(true);
    const dayStart = new Date(chosenDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(chosenDate);
    dayEnd.setHours(23, 59, 59, 999);

    let query = supabase
      .from("appointments")
      .select("start_time")
      .eq("barbershop_id", barbershop.id)
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString())
      .neq("status", "cancelled");

    if (professional.id !== "qualquer") {
      query = query.eq("professional_id", professional.id);
    }

    const { data } = await query;

    const booked = (data || []).map((a) => {
      const d = new Date(a.start_time);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    });

    setBookedTimes(booked);
    setLoadingTimes(false);
  };

  const reset = () => {
    setStep(1);
    setService(null);
    setProfessional(null);
    setDate(null);
    setTime(null);
    setName("");
    setPhone("");
    setDone(false);
  };

  const confirmBooking = async () => {
    setSaving(true);

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({ barbershop_id: barbershop.id, name, phone })
      .select()
      .single();

    if (clientError) {
      alert("Erro ao salvar cliente: " + clientError.message);
      setSaving(false);
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

    const { error: apptError } = await supabase.from("appointments").insert({
      barbershop_id: barbershop.id,
      professional_id: professional.id === "qualquer" ? null : professional.id,
      service_id: service.id,
      client_id: client.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "pending",
    });

    setSaving(false);

    if (apptError) {
      alert("Erro ao salvar agendamento: " + apptError.message);
      return;
    }

    setDone(true);
  };

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
        <div style={{ ...styles.card, padding: 24 }}>
          <p style={{ color: "#E8DDD0", fontFamily: "sans-serif", fontSize: 14, lineHeight: 1.6 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  const allProfessionals = [{ id: "qualquer", name: "Qualquer profissional" }, ...professionals];

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Header step={step} onBack={step > 1 && !done ? goBack : null} shopName={barbershop.name} />

        {done ? (
          <Confirmation service={service} professional={professional} date={date} time={time} name={name} onReset={reset} />
        ) : (
          <>
            {step === 1 && (
              <StepServices services={services} selected={service} onSelect={(s) => { setService(s); setStep(2); }} />
            )}
            {step === 2 && (
              <StepProfessional professionals={allProfessionals} selected={professional} onSelect={(p) => { setProfessional(p); setStep(3); }} />
            )}
            {step === 3 && (
              <StepDate selected={date} onSelect={(d) => { setDate(d); checkAvailability(d); setStep(4); }} />
            )}
            {step === 4 && (
              <StepTime selected={time} bookedTimes={bookedTimes} loading={loadingTimes} onSelect={(t) => { setTime(t); setStep(5); }} />
            )}
            {step === 5 && (
              <StepDetails
                name={name}
                phone={phone}
                setName={setName}
                setPhone={setPhone}
                onConfirm={confirmBooking}
                service={service}
                date={date}
                time={time}
                saving={saving}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Header({ step, onBack, shopName }) {
  return (
    <div style={styles.header}>
      {onBack && (
        <button onClick={onBack} style={styles.backBtn} aria-label="Voltar">
          ‹
        </button>
      )}
      <div style={styles.headerBrandText}>{shopName}</div>
      <div style={{ width: 20 }} />
    </div>
  );
}

function StepServices({ services, selected, onSelect }) {
  return (
    <div style={styles.stepBody}>
      <Eyebrow n="01" label="Escolha o serviço" />
      <div style={styles.list}>
        {services.length === 0 && (
          <p style={{ color: "#8A8378", fontFamily: "sans-serif", fontSize: 13 }}>
            Nenhum serviço cadastrado ainda.
          </p>
        )}
        {services.map((s) => (
          <button key={s.id} onClick={() => onSelect(s)} style={{ ...styles.optionRow, borderColor: selected?.id === s.id ? "#C9924A" : "#2A2622" }}>
            <div>
              <div style={styles.optionTitle}>{s.name}</div>
              <div style={styles.optionSub}>{s.duration_minutes} min</div>
            </div>
            <div style={styles.optionPrice}>R$ {s.price}</div>
          </button>
        ))}
      </div>
      <a href="/produtos" style={styles.productsLink}>Ver produtos da barbearia →</a>
    </div>
  );
}

function StepProfessional({ professionals, selected, onSelect }) {
  return (
    <div style={styles.stepBody}>
      <Eyebrow n="02" label="Escolha o profissional" />
      <div style={styles.list}>
        {professionals.map((p) => (
          <button key={p.id} onClick={() => onSelect(p)} style={{ ...styles.optionRow, borderColor: selected?.id === p.id ? "#C9924A" : "#2A2622" }}>
            <div style={styles.optionTitle}>{p.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDate({ selected, onSelect }) {
  const days = getNextDays(7);
  return (
    <div style={styles.stepBody}>
      <Eyebrow n="03" label="Escolha o dia" />
      <div style={styles.grid}>
        {days.map((d, i) => {
          const isSelected = selected && d.toDateString() === selected.toDateString();
          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              style={{ ...styles.timeCell, borderColor: isSelected ? "#C9924A" : "#2A2622", color: isSelected ? "#C9924A" : "#E8DDD0" }}
            >
              {formatDateLabel(d, i)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTime({ selected, bookedTimes, loading, onSelect }) {
  return (
    <div style={styles.stepBody}>
      <Eyebrow n="04" label="Escolha o horário" />
      {loading ? (
        <p style={{ color: "#8A8378", fontFamily: "sans-serif", fontSize: 13 }}>Verificando horários...</p>
      ) : (
        <div style={styles.grid}>
          {TIMES.map((t) => {
            const isBooked = bookedTimes.includes(t);
            return (
              <button
                key={t}
                onClick={() => !isBooked && onSelect(t)}
                disabled={isBooked}
                style={{
                  ...styles.timeCell,
                  borderColor: selected === t ? "#C9924A" : "#2A2622",
                  color: isBooked ? "#4A453D" : selected === t ? "#C9924A" : "#E8DDD0",
                  textDecoration: isBooked ? "line-through" : "none",
                  cursor: isBooked ? "not-allowed" : "pointer",
                  opacity: isBooked ? 0.5 : 1,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepDetails({ name, phone, setName, setPhone, onConfirm, service, date, time, saving }) {
  const canConfirm = name.trim().length > 1 && phone.trim().length > 7 && !saving;
  const dateStr = date ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
  return (
    <div style={styles.stepBody}>
      <Eyebrow n="05" label="Seus dados" />
      <div style={styles.summaryBox}>
        <span style={styles.summaryText}>{service?.name} em {dateStr} às {time}</span>
      </div>
      <input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
      <input placeholder="WhatsApp (com DDD)" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
      <button disabled={!canConfirm} onClick={onConfirm} style={{ ...styles.confirmBtn, opacity: canConfirm ? 1 : 0.4, cursor: canConfirm ? "pointer" : "not-allowed" }}>
        {saving ? "Salvando..." : "Confirmar agendamento"}
      </button>
    </div>
  );
}

function Confirmation({ service, professional, date, time, name, onReset }) {
  const dateStr = date ? date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }) : "";
  return (
    <div style={styles.stepBody}>
      <div style={styles.checkCircle}>✓</div>
      <h2 style={styles.confirmTitle}>Agendado, {name.split(" ")[0]}!</h2>
      <div style={styles.confirmDetails}>
        <DetailLine label="Serviço" value={service?.name} />
        <DetailLine label="Profissional" value={professional?.name} />
        <DetailLine label="Data" value={dateStr} />
        <DetailLine label="Horário" value={time} />
      </div>
      <button onClick={onReset} style={styles.secondaryBtn}>Fazer novo agendamento</button>
      <a href="/cancelar" style={styles.productsLink}>Precisa cancelar? Clique aqui</a>
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div style={styles.detailLine}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function Eyebrow({ n, label }) {
  return (
    <div style={styles.eyebrow}>
      <span style={styles.eyebrowNum}>{n}</span>
      <span style={styles.eyebrowLabel}>{label}</span>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0F0D0B", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "Georgia, serif" },
  card: { width: "100%", maxWidth: 380, background: "#17140F", border: "1px solid #2A2622", borderRadius: 4 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", borderBottom: "1px solid #2A2622" },
  backBtn: { background: "none", border: "none", cursor: "pointer", color: "#E8DDD0", fontSize: 20 },
  headerBrandText: { fontFamily: "sans-serif", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#E8DDD0" },
  stepBody: { padding: "24px 20px 28px" },
  eyebrow: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 },
  eyebrowNum: { fontFamily: "sans-serif", fontSize: 11, color: "#C9924A", letterSpacing: "0.1em" },
  eyebrowLabel: { fontFamily: "sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8378" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  optionRow: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "1px solid #2A2622", borderRadius: 3, padding: "14px 16px", cursor: "pointer", textAlign: "left", width: "100%" },
  optionTitle: { fontFamily: "sans-serif", fontSize: 14, color: "#E8DDD0" },
  optionSub: { fontFamily: "sans-serif", fontSize: 11, color: "#8A8378", marginTop: 3 },
  optionPrice: { fontFamily: "sans-serif", fontSize: 14, color: "#C9924A" },
  productsLink: { display: "block", textAlign: "center", fontFamily: "sans-serif", fontSize: 12, color: "#8A8378", marginTop: 20, textDecoration: "none" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  timeCell: { display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid #2A2622", borderRadius: 3, padding: "12px 8px", fontFamily: "sans-serif", fontSize: 13, cursor: "pointer" },
  summaryBox: { background: "#221E18", borderRadius: 3, padding: "10px 14px", marginBottom: 16 },
  summaryText: { fontFamily: "sans-serif", fontSize: 12, color: "#C9924A" },
  input: { width: "100%", background: "#0F0D0B", border: "1px solid #2A2622", borderRadius: 3, padding: "13px 14px", color: "#E8DDD0", fontFamily: "sans-serif", fontSize: 14, marginBottom: 10, boxSizing: "border-box" },
  confirmBtn: { width: "100%", background: "#C9924A", border: "none", borderRadius: 3, padding: "14px", color: "#0F0D0B", fontFamily: "sans-serif", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 6 },
  secondaryBtn: { width: "100%", background: "transparent", border: "1px solid #2A2622", borderRadius: 3, padding: "13px", color: "#E8DDD0", fontFamily: "sans-serif", fontSize: 13, cursor: "pointer", marginTop: 20 },
  checkCircle: { width: 48, height: 48, borderRadius: "50%", background: "#C9924A", display: "flex", alignItems: "center", justifyContent: "center", margin: "8px auto 18px", color: "#0F0D0B", fontSize: 22, fontWeight: "bold" },
  confirmTitle: { textAlign: "center", fontFamily: "Georgia, serif", fontSize: 20, color: "#E8DDD0", margin: "0 0 20px" },
  confirmDetails: { display: "flex", flexDirection: "column", gap: 10, background: "#221E18", borderRadius: 3, padding: "14px 16px" },
  detailLine: { display: "flex", justifyContent: "space-between", fontFamily: "sans-serif", fontSize: 13 },
  detailLabel: { color: "#8A8378" },
  detailValue: { color: "#E8DDD0" },
};
