import express from "express";
import pool from "../config/database.js";

const router = express.Router();

// POST /api/appointments - Create a new appointment (persist to Postgres)
router.post("/", async (req, res) => {
  try {
    const {
      hospitalId,
      hospitalName,
      specialty,
      patientName,
      datetime,
      contact,
    } = req.body;
    if (
      !hospitalId ||
      !hospitalName ||
      !specialty ||
      !patientName ||
      !datetime
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO appointments (hospital_id, hospital_name, specialty, patient_name, appointment_at, contact) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          hospitalId,
          hospitalName,
          specialty,
          patientName,
          datetime,
          contact || null,
        ]
      );

      const appointment = result.rows[0];
      return res.json({ success: true, appointment });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error creating appointment:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create appointment" });
  }
});

// GET /api/appointments - list persisted appointments
router.get("/", async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM appointments ORDER BY created_at DESC`
      );
      return res.json({ success: true, appointments: result.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error fetching appointments:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch appointments" });
  }
});

export default router;
