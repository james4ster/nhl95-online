// src/components/PnplTable.jsx
export default function PnplTable({ columns, data }) {
  return (
    <div
      style={{
        overflowX: "auto",
        maxWidth: "1200px",
        margin: "0 auto",
        boxShadow: "0 0 20px rgba(0,255,255,0.3)",
        borderRadius: "8px",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0",
          fontFamily: "monospace",
        }}
      >
        <thead
          style={{
            background: "#0E3C5F",
            color: "#FFFFFF",
            boxShadow: "0 0 15px rgba(0,255,255,0.5)",
          }}
        >
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "12px",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? "#0B2A44" : "#0E3456",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 15px rgba(0,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {columns.map((col) => {
                let cellContent;

                // Use custom render function if provided
                if (col.render) {
                  cellContent = col.render(row, i);
                }
                // Handle logos
                else if (col.type === "logo" && row[col.key]) {
                  cellContent = (
                    <img
                      src={row[col.key]}
                      alt=""
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "contain",
                      }}
                    />
                  );
                }
                // Default content
                else {
                  cellContent = row[col.key] ?? "";
                }

                return (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontWeight: col.bold ? "bold" : "normal",
                      color: col.color
                        ? col.color
                        : col.highlight
                        ? "#FFD700"
                        : "inherit",
                    }}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
