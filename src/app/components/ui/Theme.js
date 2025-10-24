"use client";

// Shared UI tokens and components for the unified assessment
import React from "react";

export const theme = {
  // Neutral CPT-inspired palette
  text: "#f7f8fb",
  textMuted: "#9aa0a6",
  bgStart: "#0e0e10",
  bgEnd: "#0b0c0f",
  cardBg: "#16171a",
  cardBd: "#1e2126",
  accent: "#4b8cf5",
  accentSoft: "#72a2f7",
};

export function AssessmentPage({ children }){
  return (
    <div style={{
      minHeight: "100vh",
      padding: 24,
      background: `linear-gradient(135deg, ${theme.bgStart} 0%, ${theme.bgEnd} 100%)`,
      color: theme.text,
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

export function Card({ title, subtitle, children, footer }){
  return (
    <div style={{
      border: `1px solid ${theme.cardBd}`,
      background: theme.cardBg,
      borderRadius: 20,
      padding: 22,
      boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
      marginBottom: 18,
    }}>
      {title && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentSoft} 100%)`,
            boxShadow: "0 0 10px rgba(124,58,237,0.65)",
          }}/>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>{title}</div>
        </div>
      )}
      {subtitle && <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>{subtitle}</div>}
      <div style={{ marginTop: 14 }}>{children}</div>
      {footer}
    </div>
  );
}

export function Button({ children, onClick, kind = "primary", full, disabled }){
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? "100%" : undefined,
      padding: "12px 16px",
      borderRadius: 14,
      border: `1px solid ${theme.cardBd}`,
      background: kind === "secondary" ? "rgba(255,255,255,0.05)" : "#22252b",
      color: theme.text,
      fontWeight: 700,
      letterSpacing: 0.3,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    }}>
      {children}
    </button>
  );
}

export function Progress({ value, max }){
  const pct = Math.max(0, Math.min(100, (Number(value) / Math.max(1, Number(max))) * 100));
  return (
    <div style={{ height: 8, background: "#2A1B4D", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: theme.accentSoft, transition: "width .2s ease" }}/>
    </div>
  );
}

export function BreakScreen({ title = "Break", subtitle = "Pause here. Continue when ready.", onContinue }){
  return (
    <Card title={title} subtitle={subtitle}>
      <div style={{ display: "grid", gap: 12 }}>
        <Button onClick={onContinue}>Continue</Button>
      </div>
    </Card>
  );
}

export function Pill({ children }){
  return (
    <span style={{
      display: "inline-block",
      padding: "5px 10px",
      borderRadius: 999,
      background: "rgba(75,140,245,0.15)",
      border: `1px solid ${theme.cardBd}`,
      color: theme.accentSoft,
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 0.3,
    }}>{children}</span>
  );
}


