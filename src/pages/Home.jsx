// src/pages/HomePage.jsx
import Layout from "../components/Layout";

export default function HomePage() {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1C2D] text-white font-mono">
        <h1 className="text-6xl font-bold text-[#00FFFF] drop-shadow-[0_0_12px_#00FFFF] mb-6">
          Welcome to PNPL
        </h1>
        <p className="text-xl text-center max-w-xl">
          Your one-stop site for standings, stats, and records.
        </p>
      </div>
    </Layout>
  );
}
