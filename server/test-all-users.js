import pool from "./src/config/database.js";

(async () => {
  try {
    const res = await pool.query("SELECT id, email FROM users");
    console.log("Total users:", res.rows.length);
    for (const user of res.rows) {
      const histRes = await pool.query(
        "SELECT id FROM medical_history WHERE user_id = $1",
        [user.id],
      );
      const repRes = await pool.query(
        "SELECT id FROM medical_reports WHERE user_id = $1",
        [user.id],
      );
      const vocRes = await pool.query(
        "SELECT id FROM voice_consultations WHERE user_id = $1",
        [user.id],
      );
      console.log(
        `User ${user.id} (${user.email}): history=${histRes.rows.length}, reports=${repRes.rows.length}, consultations=${vocRes.rows.length}`,
      );
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
