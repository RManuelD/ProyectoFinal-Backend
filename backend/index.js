require('dotenv').config();
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
