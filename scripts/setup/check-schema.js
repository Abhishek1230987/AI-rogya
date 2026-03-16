import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "e_consultancy",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function checkSchema() {
  try {
    console.log("🔍 Checking medical_reports table schema...\n");

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'medical_reports'
      ORDER BY ordinal_position;
    `);

    console.log("📋 Columns in medical_reports table:");
    result.rows.forEach((row) => {
      const nullable = row.is_nullable === "YES" ? "✅" : "❌";
      console.log(
        `  ${nullable} ${row.column_name.padEnd(20)} - ${row.data_type}`
      );
    });

    console.log("\n✅ Schema verification complete\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkSchema();
