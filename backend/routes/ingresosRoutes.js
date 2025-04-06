const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ingresos");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { usuario_id, tipoingreso_id, monto, fecha } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO ingresos (usuario_id, tipoingreso_id, monto, fecha) VALUES ($1, $2, $3, $4) RETURNING *",
      [usuario_id, tipoingreso_id, monto, fecha]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { usuario_id, tipoingreso_id, monto, fecha } = req.body;
  try {
    const result = await pool.query(
      "UPDATE ingresos SET usuario_id=$1, tipoingreso_id=$2, monto=$3, fecha=$4 WHERE id=$5 RETURNING *",
      [usuario_id, tipoingreso_id, monto, fecha, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM ingresos WHERE id = $1", [id]);
    res.json({ mensaje: "Ingreso eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;