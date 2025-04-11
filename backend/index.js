require('dotenv').config();

// Use a constant for the secret key, typically from environment variables in real apps
const SECRET_JWT_KEY = process.env.SECRET_JWT_KEY || 'miclaveultrasecreta123'; // Added process.env check as good practice

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware Setup
app.use(cors({
    // Configure CORS options if needed, e.g., origin, credentials
}));
app.use(cookieParser()); // Use cookie-parser before routes that need it
app.use(express.json()); // Parse JSON request bodies

// Database Pool Setup
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432, // Added default port and process.env check
});

app.use((req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // 'Bearer <token>'

    req.userData = null; // Use a different property if not using express-session

    if (token) {
        try {
            const decoded = jwt.verify(token, SECRET_JWT_KEY);
            req.userData = decoded; // Attach decoded token data to the request object
        } catch (error) {
            // Invalid token, userData remains null
            console.error("JWT Verification Error:", error.message);
        }
    }
    next(); // Pass control to the next middleware or route handler
});

// --- Routes ---

// Root Route
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        // Added a more descriptive message
        res.json({ message: 'Backend server is running correctly.', time: result.rows[0].now });
    } catch (error) {
        console.error("Root route error:", error);
        res.status(500).json({ error: 'Database connection error', details: error.message });
    }
});

// User Model Class (Keep it here for simplicity as requested)
class User {
    static async create({ username, password }) {
        // Basic validation
        if (typeof username !== 'string' || username.length < 5) {
            throw new Error('El nombre de Usuario debe ser una cadena de texto de al menos 5 caracteres');
        }
        if (typeof password !== 'string' || password.length < 5) {
            // WARNING: Storing plain text passwords is a major security risk! Hash passwords in real applications.
            throw new Error('La contraseña debe ser una cadena de texto de al menos 5 caracteres');
        }

        // Check if user exists
        const existingUser = await pool.query("SELECT id FROM usuarios WHERE nombre = $1", [username]);
        if (existingUser.rows.length > 0) {
            throw new Error('El usuario ya existe');
        }

        // Create user (Still storing plain text password - NOT RECOMMENDED FOR PRODUCTION)
        const insertResult = await pool.query(
            "INSERT INTO usuarios (nombre, contrasena) VALUES ($1, $2) RETURNING id, nombre, creado_en", // Don't return password
            [username, password]
        );
        return insertResult.rows[0];
    }

    static async Login({ username, password }) {
         // Basic validation
        if (typeof username !== 'string' || username.length < 5) {
             throw new Error('El nombre de Usuario debe ser una cadena de texto de al menos 5 caracteres');
        }
        if (typeof password !== 'string' || password.length < 5) {
             throw new Error('La contraseña debe ser una cadena de texto de al menos 5 caracteres');
        }

        const result = await pool.query("SELECT * FROM usuarios WHERE nombre = $1", [username]);
        if (result.rows.length === 0) {
            throw new Error('Usuario no encontrado'); // More specific error
        }

        const user = result.rows[0];

        // WARNING: Comparing plain text passwords! Highly insecure.
        const isValid = (password === user.contrasena);
        if (!isValid) {
            throw new Error('Contraseña incorrecta');
        }

        // Exclude password from the returned user object
        const { contrasena: _, ...publicUser } = user;
        return publicUser;
    }
}

// Registration Route
app.post('/register', async (req, res) => {
    const { nombre, contrasena } = req.body;
    if (!nombre || !contrasena) {
        return res.status(400).json({ error: 'Nombre y contraseña son requeridos' });
    }
    try {
        const newUser = await User.create({ username: nombre, password: contrasena });
        res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser });
    } catch (error) {
        // Log the actual error on the server for debugging
        console.error("Registration Error:", error.message);
        // Send a generic or specific error message to the client
        res.status(400).json({ error: error.message }); // Send back the specific validation/creation error
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { nombre, contrasena } = req.body;
     if (!nombre || !contrasena) {
        return res.status(400).json({ error: 'Nombre y contraseña son requeridos' });
    }
    try {
        const user = await User.Login({ username: nombre, password: contrasena });
        // Create JWT token
        const token = jwt.sign(
            { id: user.id, username: user.nombre }, // Use user.nombre as payload
            SECRET_JWT_KEY,
            { expiresIn: '1h' }
        );
        // Send back user info (without password) and token
        res.json({ user, token }); // Changed from send to json for consistency
    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(401).json({ error: error.message }); // Use 401 for authentication failures
    }
});

// Logout Route (Conceptual for JWT - Client needs to discard the token)
// This server-side route doesn't do much for stateless JWT.
// If using sessions (like with express-session), this would clear the session.
app.post('/logout', (req, res) => {
    // For JWT, logout is primarily a client-side action (deleting the token).
    // If you were using express-session, you would use req.session.destroy() here.
    // Since we're focusing on JWT from headers, this endpoint might just confirm.
    res.json({ message: 'Logout successful (client should discard token)' });
});

// Protected Route Example (Checks for valid JWT via middleware)
app.get('/protected', (req, res) => {
    // The middleware already tried to verify the token and put data in req.userData
    if (!req.userData) {
        return res.status(401).send('Acceso no autorizado: Token inválido o ausente');
    }
    // If we reach here, the token was valid
    // res.render is for template engines (like EJS, Handlebars). If just sending JSON:
    res.json({ message: 'Acceso concedido a ruta protegida', user: req.userData });
    // If you were using a template engine and wanted to render a view:
    // res.render('protected', { user: req.userData });
});

// --- Gastos Routes ---
app.get('/gastos', async (req, res) => {
    try {
        // Consider adding filtering by user ID if needed: WHERE usuario_id = $1, [req.userData.id]
        const result = await pool.query('SELECT * FROM gastos ORDER BY fecha DESC, id DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching gastos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post("/agregargasto", async (req, res) => {
    // Add validation for required fields
    const { usuario_id, categoria_id, metodopago_id, monto, descripcion, fecha } = req.body;
    if (!usuario_id || !categoria_id || !metodopago_id || monto === undefined || !fecha) {
         return res.status(400).json({ error: 'Faltan campos requeridos para agregar el gasto' });
    }
    // Add further validation (e.g., is monto a number?)
    try {
        const result = await pool.query(
            "INSERT INTO gastos (usuario_id, categoria_id, metodopago_id, monto, descripcion, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [usuario_id, categoria_id, metodopago_id, monto, descripcion || null, fecha] // Handle optional description
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding gasto:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

app.put("/editargasto/:id", async (req, res) => {
    const { id } = req.params;
    const { usuario_id, categoria_id, metodopago_id, monto, descripcion, fecha } = req.body;
     if (!usuario_id || !categoria_id || !metodopago_id || monto === undefined || !fecha) {
         return res.status(400).json({ error: 'Faltan campos requeridos para editar el gasto' });
    }
    try {
        const result = await pool.query(
            "UPDATE gastos SET usuario_id=$1, categoria_id=$2, metodopago_id=$3, monto=$4, descripcion=$5, fecha=$6 WHERE id=$7 RETURNING *",
            [usuario_id, categoria_id, metodopago_id, monto, descripcion || null, fecha, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Gasto no encontrado para editar' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error editing gasto:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

app.delete('/gastos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM gastos WHERE id = $1 RETURNING id', [id]); // RETURNING helps confirm deletion
        if (result.rowCount > 0) {
            res.json({ message: 'Gasto eliminado correctamente' }); // Status 200 OK is implicit
        } else {
            res.status(404).json({ message: 'Gasto no encontrado' });
        }
    } catch (error) {
        console.error('Error deleting gasto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- Other Resource Routes (Usuarios, Categorias, MetodosPago, Ingresos, Ahorros) ---

app.get('/usuarios', async (req, res) => {
    try {
        // Exclude password from the query results
        const result = await pool.query('SELECT id, nombre, creado_en FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/categorias', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categorias ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categorias:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/metodopago', async (req, res) => { // Route name matches DB table now
    try {
        const result = await pool.query('SELECT * FROM metodospago ORDER BY nombre'); // Query matches DB table now
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching metodospago:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/ingresos', async (req, res) => {
    try {
        // Consider adding filtering by user ID if needed
        const result = await pool.query('SELECT * FROM ingresos ORDER BY fecha DESC, id DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching ingresos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- Ingresos Routes ---

// POST /ingresos (NEW - Simple Pattern)
app.post('/ingresos', async (req, res) => {
  // Get data from request body - assumes frontend sends all required fields
  const { usuario_id, tipo_ingreso_id, monto, fecha } = req.body;

  // Basic validation (mirroring /agregargasto)
  if (usuario_id === undefined || tipo_ingreso_id === undefined || monto === undefined || !fecha) {
      return res.status(400).json({ error: 'Faltan campos requeridos: usuario_id, tipo_ingreso_id, monto, fecha' });
  }
  // No explicit auth check, relies on frontend sending correct usuario_id

  try {
      const result = await pool.query(
          "INSERT INTO ingresos (usuario_id, tipo_ingreso_id, monto, fecha) VALUES ($1, $2, $3, $4) RETURNING *",
          [usuario_id, tipo_ingreso_id, monto, fecha]
      );
      res.status(201).json(result.rows[0]);
  } catch (err) {
      console.error('Error adding ingreso:', err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});



// PUT /ingresos/:id (NEW - Simple Pattern)
app.put('/ingresos/:id', async (req, res) => {
  const { id } = req.params; // Income record ID to update
  // Get data from request body - assumes frontend sends all required fields
  const { usuario_id, tipo_ingreso_id, monto, fecha } = req.body;

  // Basic validation (mirroring /editargasto)
   if (usuario_id === undefined || tipo_ingreso_id === undefined || monto === undefined || !fecha) {
       return res.status(400).json({ error: 'Faltan campos requeridos: usuario_id, tipo_ingreso_id, monto, fecha' });
  }
  // No explicit auth check or ownership check

  try {
      const result = await pool.query(
          `UPDATE ingresos
           SET usuario_id = $1, tipo_ingreso_id = $2, monto = $3, fecha = $4
           WHERE id = $5
           RETURNING *`,
          [usuario_id, tipo_ingreso_id, monto, fecha, id] // Updates based only on income ID
      );

      if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Ingreso no encontrado para editar' });
      }
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error editing ingreso:', err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});



app.delete('/ingresos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM ingresos WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount > 0) {
            res.json({ message: 'Ingreso eliminado correctamente' });
        } else {
            res.status(404).json({ message: 'Ingreso no encontrado' });
        }
    } catch (error) {
        console.error('Error deleting ingreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// --- Tipos Ingreso Route ---

// GET /tipos_ingreso (NEW - Simple Pattern)
app.get('/tipos_ingreso', async (req, res) => {
  // No authentication check needed as per frontend spec (Optional)
  try {
      const result = await pool.query('SELECT * FROM tipos_ingreso ORDER BY nombre');
      res.json(result.rows);
  } catch (error) {
      console.error('Error fetching tipos_ingreso:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
  }
});




// GET /ahorros (Existing Simple Pattern - Keep As Is)
app.get('/ahorros', async (req, res) => {
  try {
      // No user filtering
      const result = await pool.query('SELECT * FROM ahorros ORDER BY fecha_inicio DESC, id DESC');
      res.json(result.rows);
  } catch (error) {
      console.error('Error fetching ahorros:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /ahorros/:id (Existing Simple Pattern - Keep As Is)
app.delete('/ahorros/:id', async (req, res) => {
  const { id } = req.params;
  try {
      // No ownership check
      const result = await pool.query('DELETE FROM ahorros WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount > 0) {
          res.json({ message: 'Ahorro eliminado correctamente' });
      } else {
          res.status(404).json({ message: 'Ahorro no encontrado' });
      }
  } catch (error) {
      console.error('Error deleting ahorro:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- End of Ahorros Routes ---


// --- Ahorros Routes ---

// POST /ahorros (NEW - Simple Pattern)
app.post('/ahorros', async (req, res) => {
  // Get data from request body
  // We only need usuario_id and monto_objetivo for creation.
  // monto_ahorrado defaults to 0, fecha_inicio defaults to CURRENT_DATE in DB.
  const { usuario_id, monto_objetivo } = req.body;

  // Basic validation
  if (usuario_id === undefined || monto_objetivo === undefined) {
      return res.status(400).json({ error: 'Faltan campos requeridos: usuario_id, monto_objetivo' });
  }
  if (typeof monto_objetivo !== 'number' || monto_objetivo <= 0) {
      return res.status(400).json({ error: 'El monto_objetivo debe ser un número positivo' });
  }
  // No explicit auth check

  try {
      // Only insert the required fields, let DB handle defaults/generated columns
      const result = await pool.query(
          "INSERT INTO ahorros (usuario_id, monto_objetivo) VALUES ($1, $2) RETURNING *",
          [usuario_id, monto_objetivo]
      );
      res.status(201).json(result.rows[0]);
  } catch (err) {
      console.error('Error adding ahorro:', err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PUT /ahorros/:id (NEW - STRICT Simple Pattern)
app.put('/ahorros/:id', async (req, res) => {
  const { id } = req.params; // Savings record ID to update
  // Get ALL potentially updatable fields from request body (matching simple pattern)
  const { usuario_id, monto_objetivo, monto_ahorrado, fecha_inicio } = req.body;

  // Basic validation (mirroring /editargasto - check required fields)
  // Adjust required fields based on what the frontend *must* send for an update
  // Let's assume all these are needed for simplicity, like in gastos
  if (usuario_id === undefined || monto_objetivo === undefined || monto_ahorrado === undefined || !fecha_inicio) {
       return res.status(400).json({ error: 'Faltan campos requeridos: usuario_id, monto_objetivo, monto_ahorrado, fecha_inicio' });
  }
  // Add type/value validation if needed
  if (typeof monto_objetivo !== 'number' || monto_objetivo <= 0) {
      return res.status(400).json({ error: 'monto_objetivo debe ser un número positivo' });
  }
   if (typeof monto_ahorrado !== 'number' || monto_ahorrado < 0) {
      return res.status(400).json({ error: 'monto_ahorrado debe ser un número no negativo' });
  }
  // No explicit auth check or ownership check

  try {
      // Static UPDATE query setting all provided fields (simple pattern)
      // Note: Updating usuario_id or fecha_inicio might have unintended consequences
      // but this matches the simple pattern of updating everything sent.
      const result = await pool.query(
          `UPDATE ahorros
           SET usuario_id = $1, monto_objetivo = $2, monto_ahorrado = $3, fecha_inicio = $4
           WHERE id = $5
           RETURNING *`,
          [usuario_id, monto_objetivo, monto_ahorrado, fecha_inicio, id]
      );

      if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Ahorro no encontrado para editar' });
      }
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error editing ahorro:', err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});




// --- Server Start ---
const port = process.env.PORT || 3001; // Define port before using it

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    // Removed the second server setup that was incorrectly placed here
});

// Add basic error handling for uncaught exceptions or unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Optionally exit gracefully
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally exit gracefully
  // process.exit(1);
});