const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ahorros");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { usuario_id, monto_objetivo, monto_ahorrado, fecha_inicio } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO ahorros (usuario_id, monto_objetivo, monto_ahorrado, fecha_inicio) VALUES ($1, $2, $3, $4) RETURNING *",
      [usuario_id, monto_objetivo, monto_ahorrado, fecha_inicio]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { usuario_id, monto_objetivo, monto_ahorrado, fecha_inicio } = req.body;
  try {
    const result = await pool.query(
      "UPDATE ahorros SET usuario_id=$1, monto_objetivo=$2, monto_ahorrado=$3, fecha_inicio=$4 WHERE id=$5 RETURNING *",
      [usuario_id, monto_objetivo, monto_ahorrado, fecha_inicio, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM ahorros WHERE id = $1", [id]);
    res.json({ mensaje: "Ahorro eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;