import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "linear-gradient(135deg, #0e0e10 0%, #0b0c0f 100%)",
      color: "#f7f8fb",
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      padding: 24
    }}>
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div style={{
          border: "1px solid #1e2126",
          background: "#16171a",
          borderRadius: 20,
          padding: 22,
          boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#4b8cf5", boxShadow: "0 0 10px rgba(75,140,245,0.5)" }}/>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.2 }}>ADHDeEyes Assessment</div>
          </div>
          <div style={{ fontSize: 14, color: "#9aa0a6", marginTop: 8 }}>
            A four-part evaluation: Card CPT, Stroop, Free Speech, and Number Sense. Breaks between tests. Progress only; no visible timers.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <Link href="/assessment" style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #1e2126",
              background: "#22252b",
              color: "#f7f8fb",
              fontWeight: 800,
              letterSpacing: 0.3,
              textDecoration: "none",
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            }}>Start Assessment</Link>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/01cardcpt" style={{ color: "#9aa0a6", textDecoration: "underline" }}>Card CPT</Link>
              <Link href="/02stroop" style={{ color: "#9aa0a6", textDecoration: "underline" }}>Stroop</Link>
              <Link href="/03freespeech" style={{ color: "#9aa0a6", textDecoration: "underline" }}>Free Speech</Link>
              <Link href="/04numbersense" style={{ color: "#9aa0a6", textDecoration: "underline" }}>Number Sense</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
