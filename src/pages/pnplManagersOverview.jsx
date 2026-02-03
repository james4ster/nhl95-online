// src/pages/ManagersOverview.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";

export default function ManagersOverview() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchManagers() {
      setLoading(true);

      try {
        // Fetch all managers
        const { data: managersData, error: managersError } = await supabase
          .from("managers")
          .select("id, name, discord_id, discord_avatar_url")
          .order("name", { ascending: true });

        if (managersError) {
          console.error("Error fetching managers:", managersError);
          setManagers([]);
          setLoading(false);
          return;
        }

        // Fetch titles count per manager
        const { data: standingsData, error: standingsError } = await supabase
          .from("pnpl_standings")
          .select("manager, champ");

        if (standingsError) console.error("Error fetching standings:", standingsError);

        const champMap = {};
        standingsData?.forEach((s) => {
          if (s.champ) champMap[s.manager] = (champMap[s.manager] || 0) + 1;
        });

        const combined = managersData.map((m) => ({
          ...m,
          titles: champMap[m.name] || 0,
        }));

        setManagers(combined);
      } catch (err) {
        console.error("Fatal error fetching managers:", err);
        setManagers([]);
      }

      setLoading(false);
    }

    fetchManagers();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: "80px", color: "#00FFFF" }}>
          Loading managers...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 style={{ color: "#00FFFF", textAlign: "center", margin: "30px 0" }}>
        Managers
      </h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "20px",
        }}
      >
        {managers.map((m) => (
          <Link key={m.id} to={`/manager/${m.id}`} style={{ textDecoration: "none" }}>
            <div className="card-container">
              <div className="card">
                {/* Front */}
                <div className="card-front">
                  <img
                    src={
                      m.discord_avatar_url
                        ? m.discord_avatar_url
                        : `https://cdn.discordapp.com/embed/avatars/${
                            Number(m.discord_id || 0) % 5
                          }.png`
                    }
                    alt="Discord Avatar"
                    className="avatar"
                  />
                  <h2>{m.name}</h2>
                </div>

                {/* Back */}
                <div className="card-back">
                  <div className="back-content">
                    <img src="/images/goldTrophy.png" alt="Trophy" className="trophy" />
                    <div className="back-text">= {m.titles}</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .card-container {
          perspective: 1000px;
        }

        .card {
          width: 220px;
          height: 280px;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s;
        }

        .card-container:hover .card {
          transform: rotateY(180deg);
        }

        .card-front,
        .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          box-shadow: 0 0 20px rgba(0,255,255,0.4);
          transition: transform 0.6s;
        }

        /* Front */
        .card-front {
          background: linear-gradient(145deg, #0E3C5F, #091421);
          color: #00FFFF;
        }

        .card-front h2 {
          margin-top: 12px;
          color: #00FFFF; /* icey blue */
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid #00FFFF;
        }

        /* Back */
        .card-back {
          background: #0E2A44;
          transform: rotateY(180deg);
          color: #FFD700;
          justify-content: center;
          align-items: center;
        }

        .back-content {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .trophy {
          width: 40px;
          height: 40px;
        }

        .back-text {
          font-weight: bold;
          font-size: 1.1rem;
        }
      `}</style>
    </Layout>
  );
}
