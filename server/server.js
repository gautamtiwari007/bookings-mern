import express from 'express';
import { readdirSync } from 'fs';
import cors from 'cors';
import mongoose from 'mongoose';
const morgan = require('morgan');
require("dotenv").config();

const app = express();

// DB connection
mongoose
    .connect(process.env.DATABASE_LOCAL)
    .then(() => console.log("DB Connection Successful..."))
    .catch((err) => console.log("DB Connection Error: ", err));

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// route middleware
readdirSync('./routes').map((r) =>
    app.use('/api', require(`./routes/${r}`))
);

const port = process.env.PORT || 8000;

app.listen(port, () => console.log(`Server is running on port ${port}...`));