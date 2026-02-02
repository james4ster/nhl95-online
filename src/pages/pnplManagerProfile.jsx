// src/pages/ManagerProfile.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";

export default function ManagerProfile() {
  const { managerId } = useParams();
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchManager() {
      setLoading(true);
      const { data } = await supabase
        .from("managers")
        .select("*")
        .eq("id", managerId)
        .single();

      setManager(data || null);
      setLoading(false);
    }

    fetchManager();
  }, [managerId]);

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: "80px", color: "#00FFFF" }}>
          Loading manager profile...
        </div>
      </Layout>
    );
  }

  if (!manager) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: "80px", color: "#FF5555" }}>
          Manager not found.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        style={{
          textAlign: "center",
          marginBottom: "40px",
          padding: "30px",
          background: "linear-gradient(to bottom, #0E2A44, #091421)",
          borderRadius: "14px",
          boxShadow: "0 0 25px rgba(0,255,255,0.4)",
        }}
      >
        {/* Discord Avatar */}
        <img
          src={`https://cdn.discordapp.com/embed/avatars/${
            Number(manager.discord_discriminator || 0) % 5
          }.png`}
          alt="Discord Avatar"
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            marginBottom: "16px",
            border: "2px solid #00FFFF",
          }}
        />

        <h1 style={{ color: "#00FFFF", fontSize: "3rem", marginTop: "16px" }}>
          {manager.name}
        </h1>

        <div style={{ color: "#FFD700", fontSize: "1.1rem", marginTop: "6px" }}>
          Discord: {manager.discord_id}
        </div>

        {manager.hometown && (
          <div style={{ marginTop: "10px", fontSize: "1.1rem" }}>
            Hometown: <strong>{manager.hometown}</strong>
          </div>
        )}

        <div style={{ marginTop: "6px", fontSize: "1.1rem" }}>
          Seasons Played: <strong>{manager.seasons_played}</strong>
        </div>

        <div style={{ marginTop: "6px", fontSize: "1.1rem" }}>
          Titles: <strong>{manager.titles || 0}</strong>
        </div>
      </div>

      {/* Back link */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <Link to="/managers" style={{ color: "#00FFFF", textDecoration: "none" }}>
          ← Back to Managers
        </Link>
      </div>
    </Layout>
  );
}
