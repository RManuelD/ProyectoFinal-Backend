require('dotenv').config();
const express = require('express');
const {Pool} = require('pg');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ 
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASS,
	port: 5432,
});

app.use("/usuarios", require("./routes/usuariosRoutes"));
app.use("/categorias", require("./routes/categoriasRoutes"));
app.use("/metodospago", require("./routes/metodopagoRoutes"));
app.use("/tiposingreso", require("./routes/tipoingresoRoutes"));
app.use("/ingresos", require("./routes/ingresosRoutes"));
app.use("/gastos", require("./routes/gastosRoutes"));
app.use("/ahorros", require("./routes/ahorrosRoutes"));

app.get('/', (req, res) => {
    res.send('API funcionando...');
});


app.get('/gastos', async (req, res) => {  
    try {
        const result = await pool.query('SELECT * FROM gastos');
        res.json(result.rows);
    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/usuarios', async (req, res) => {  
  try {
      const result = await pool.query('SELECT * FROM usuarios');
      res.json(result.rows);
  } catch (error) {
      console.error('Error en la consulta:', error);
      res.status(500).json({ error: error.message }); 
  }
});

app.get('/categorias', async (req, res) => {   
  try {
      const result = await pool.query('SELECT * FROM categorias');
      res.json(result.rows);
  } catch (error) {
      console.error('Error en la consulta:', error); 
      res.status(500).json({ error: error.message }); 
  }
}); 


app.get('/metodopago', async (req, res) => {  
  try {
      const result = await pool.query('SELECT * FROM metodospago');
      res.json(result.rows);
  } catch (error) {
      console.error('Error en la consulta:', error);
      res.status(500).json({ error: error.message });
  }
});


app.post("/agregargasto", async (req, res) => {
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

app.put("/editargasto/:id", async (req, res) => {
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



app.delete('/gastos/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('DELETE FROM gastos WHERE id = $1', [id]);
    if (result.rowCount > 0) {
      res.json({ message: 'Gasto Eliminado Correctamente' });
    } else {
      res.status(404).json({ message: 'El gasto no Existe, no se encontro' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); 


app.get('/ingresos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ingresos'); 
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.delete('/ingresos/:id', async (req, res) => {
    const id = req.params.id;
    try {
      const result = await pool.query('DELETE FROM ingresos WHERE id = $1', [id]);
      if (result.rowCount > 0) {
        res.json({ message: 'Ingreso Eliminado Correctamente' });
      } else {
        res.status(404).json({ message: 'El Ingreso no Existe, no se encontro' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });



app.get('/ahorros', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ahorros');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.delete('/ahorros/:id', async (req, res) => {
    const id = req.params.id;
    try {
      const result = await pool.query('DELETE FROM ahorros WHERE id = $1', [id]);
      if (result.rowCount > 0) {
        res.json({ message: 'Ahorro Eliminado Correctamente' });
      } else {
        res.status(404).json({ message: 'El ahorro no Existe, no se encontro' }); 
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
