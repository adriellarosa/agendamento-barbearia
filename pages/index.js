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
