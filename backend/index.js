require('dotenv').config();

SECRET_JWT_KEY='miclaveultrasecreta123';
const express = require('express');
const {Pool} = require('pg');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
app.use(cookieParser()); //  esto debe ir antes de tus rutas

// Usar CORS con las opciones definidas 
/*app.use(cors());*/
app.use(cors({
}));
const port = process.env.PORT || 3001; 
app.use(express.json());


const pool = new Pool({ 
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME, 
	password: process.env.DB_PASS,
	port: 5432,
});


app.use((req, res, next) => {
  // Obtener el token desde el encabezado Authorization
  const token = req.headers['authorization']?.split(' ')[1]; // 'Bearer <token>'

  // Inicializamos la sesión del usuario
  req.session = { user: null };

  if (token) {
    try {
      // Verificamos el token
      const data = jwt.verify(token, SECRET_JWT_KEY);
      req.session.user = data; // Guardamos los datos del usuario en la sesión
    } catch (error) {
      // Si el token es inválido, lo dejamos como null
      req.session.user = null;
    }
  }

  next(); // Pasamos al siguiente middleware o ruta
});


app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Servidor funcionando mamados ptoyecto ', time: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


class User {
  static async create({ username, password}) {
    // Validación de username
    if (typeof username !== 'string') throw new Error('El nombre de Usuario debe ser una cadena de texto');
    if (username.length < 5) throw new Error('El nombre de Usuario debe ser mayor de 5 caracteres');

    // Validación de password
    if (typeof password !== 'string') throw new Error('La contraseña debe ser una cadena de texto');
    if (password.length < 5) throw new Error('La contraseña debe ser mayor de 5 caracteres');

    // Verificar si el usuario ya existe
    const result = await pool.query("SELECT * FROM usuarios WHERE nombre = $1", [username]);
    if (result.rows.length > 0) {
      throw new Error('El usuario ya existe'); 
    }

    // Crear el usuario en la base de datos
    const insertResult = await pool.query(
      "INSERT INTO usuarios (nombre, contrasena) VALUES ($1, $2) RETURNING *",
      [username, password]
    );

    return insertResult.rows[0]; // Retorna el usuario creado

  }

  static async Login ({username, password}){
    if (typeof username !== 'string') throw new Error('El nombre de Usuario debe ser una cadena de texto');
    if (username.length < 5) throw new Error('El nombre de Usuario debe ser mayor de 5 caracteres');
    if (typeof password !== 'string') throw new Error('La contraseña debe ser una cadena de texto');
    if (password.length < 5) throw new Error('La contraseña debe ser mayor de 5 caracteres');

    const result = await pool.query("SELECT * FROM usuarios WHERE nombre= $1", [username]);
    if (result.rows.length === 0) throw new Error('No existe el usuario');

    const user = result.rows[0];

    const isValid = password === user.contrasena;
    if (!isValid) throw new Error('Contraseña incorrecta'); 

    const { contrasena: _, ...publcUser } = user;

    return publcUser; // Aquí podrías devolver un token o los datos que quieras


    }
} 

app.post('/register', async (req, res) => { 
  const { nombre, contrasena} = req.body;

  try {
    const newUser = await User.create({ username: nombre, password: contrasena});
    res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



app.post('/login', async (req, res) => {
  const { nombre, contrasena } = req.body;
  try {
    const user = await User.Login({ username: nombre, password: contrasena });
    const token = jwt.sign({id: user.id, username: user.username},
    SECRET_JWT_KEY,
    {
      expiresIn: '1h'
    })
    
    res.send({user,token})
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
  
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ message: 'Sesión cerrada' });
  });
});

app.get('/protected', (req, res) => {
  // Obtener el token desde el encabezado Authorization
  const token = req.headers['authorization']?.split(' ')[1]; // Token se envía en el formato 'Bearer <token>'
  
  if (!token) {
    return res.status(403).send('Acceso no autorizado');
  }

  try {
    const data = jwt.verify(token, SECRET_JWT_KEY); 
    res.render('protected', data);
  } catch (error) {
    return res.status(401).send('Acceso no autorizado');
  }
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




// DELETE cita por ID
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


// DELETE cita por ID
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

//USAR METODO PUT PARA OBTENER LOS DATOS

app.get('/ahorros', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ahorros');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE cita por ID
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





app.listen(port, () => {
console.log('Servidor corriendo en http://localhost:3000');
=======
const express = require('express');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);

});
