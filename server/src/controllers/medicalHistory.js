/**
 * Medical History Controller
 * Handles medical history and profile management
 */

import pool from "../config/database.js";

/**
 * Get medical history status
 * Used to check if user has completed their medical profile
 */
export const getMedicalHistoryStatus = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user has medical history
    const result = await pool.query(
      "SELECT id FROM medical_history WHERE user_id = $1",
      [userId]
    );

    const hasCompletedHistory = result.rows.length > 0;

    res.json({
      success: true,
      hasCompletedHistory,
      redirectTo: hasCompletedHistory ? null : "/medical-profile",
    });
  } catch (error) {
    console.error("Error getting medical history status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get medical history status",
    });
  }
};

/**
 * Get user's medical history
 */
export const getMedicalHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await pool.query(
      "SELECT * FROM medical_history WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: "No medical history found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error getting medical history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get medical history",
    });
  }
};

/**
 * Update medical history
 */
export const updateMedicalHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      dateOfBirth,
      gender,
      bloodType,
      heightCm,
      weightKg,
      chronicConditions = [],
      currentMedications = [],
      allergies = [],
      familyHistory = {},
      smokingStatus,
      drinkingStatus,
      exerciseFrequency,
      additionalNotes,
    } = req.body;

    // Check if medical history exists
    const checkResult = await pool.query(
      "SELECT id FROM medical_history WHERE user_id = $1",
      [userId]
    );

    let result;

    if (checkResult.rows.length === 0) {
      // Create new medical history
      result = await pool.query(
        `INSERT INTO medical_history (
          user_id, date_of_birth, gender, blood_type, height_cm, weight_kg,
          chronic_conditions, current_medications, allergies, family_history,
          smoking_status, drinking_status, exercise_frequency, additional_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          userId,
          dateOfBirth,
          gender,
          bloodType,
          heightCm,
          weightKg,
          JSON.stringify(chronicConditions),
          JSON.stringify(currentMedications),
          JSON.stringify(allergies),
          JSON.stringify(familyHistory),
          smokingStatus,
          drinkingStatus,
          exerciseFrequency,
          additionalNotes,
        ]
      );
    } else {
      // Update existing medical history
      result = await pool.query(
        `UPDATE medical_history SET
          date_of_birth = COALESCE($1, date_of_birth),
          gender = COALESCE($2, gender),
          blood_type = COALESCE($3, blood_type),
          height_cm = COALESCE($4, height_cm),
          weight_kg = COALESCE($5, weight_kg),
          chronic_conditions = COALESCE($6, chronic_conditions),
          current_medications = COALESCE($7, current_medications),
          allergies = COALESCE($8, allergies),
          family_history = COALESCE($9, family_history),
          smoking_status = COALESCE($10, smoking_status),
          drinking_status = COALESCE($11, drinking_status),
          exercise_frequency = COALESCE($12, exercise_frequency),
          additional_notes = COALESCE($13, additional_notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $14
        RETURNING *`,
        [
          dateOfBirth,
          gender,
          bloodType,
          heightCm,
          weightKg,
          JSON.stringify(chronicConditions),
          JSON.stringify(currentMedications),
          JSON.stringify(allergies),
          JSON.stringify(familyHistory),
          smokingStatus,
          drinkingStatus,
          exerciseFrequency,
          additionalNotes,
          userId,
        ]
      );
    }

    res.json({
      success: true,
      message: "Medical history updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating medical history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update medical history",
    });
  }
};
