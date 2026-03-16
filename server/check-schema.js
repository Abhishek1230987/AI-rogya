import pool from "./src/config/database.js";

(async () => {
  const res = await pool.query(
    "SELECT * FROM information_schema.columns WHERE table_name='medical_reports' ORDER BY ordinal_position",
  );
  console.log("Medical Reports Table Columns:\n");
  res.rows.forEach((r) => {
    console.log(
      `${r.column_name}: ${r.data_type} ${r.is_nullable === "NO" ? "(NOT NULL)" : ""}`,
    );
  });
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
