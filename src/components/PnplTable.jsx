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
          borderCollapse: "collapse",
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
                  padding: "6px 8px",
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  textAlign: col.align || "center", // use column alignment
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
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 0 12px rgba(0,255,255,0.45)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              {columns.map((col) => {
                let cellContent;

                if (col.render) {
                  cellContent = col.render(row);
                } else if (col.type === "logo" && row[col.key]) {
                  cellContent = (
                    <img
                      src={row[col.key]}
                      alt=""
                      style={{
                        width: "48px",
                        height: "48px",
                        objectFit: "contain",
                      }}
                    />
                  );
                } else {
                  cellContent = row[col.key] ?? "";
                }

                return (
                  <td
                    key={col.key}
                    style={{
                      padding: "6px 8px",
                      textAlign: col.align || "center",
                      verticalAlign: "middle",
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
