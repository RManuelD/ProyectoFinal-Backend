const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM gastos");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { usuario_id, categoria_id, metodopago_id, monto, descripcion, fecha } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO gastos (usuario_id, categoria_id, metodopago_id, monto, descripcion, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [usuario_id, categoria_id, metodopago_id, monto, descripcion, fecha]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { usuario_id, categoria_id, metodopago_id, monto, descripcion, fecha } = req.body;
  try {
    const result = await pool.query(
      "UPDATE gastos SET usuario_id=$1, categoria_id=$2, metodopago_id=$3, monto=$4, descripcion=$5, fecha=$6 WHERE id=$7 RETURNING *",
      [usuario_id, categoria_id, metodopago_id, monto, descripcion, fecha, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM gastos WHERE id = $1", [id]);
    res.json({ mensaje: "Gasto eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
