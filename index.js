require("dotenv").config();

const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

connection.connect((error) => {
  if (error) throw error;

  console.log("Database connected");
});

app.get("/api/databases", (req, res) => {
  connection.query("SHOW DATABASES", (error, result) => {
    if (error) {
      return res.status(500).json({
        message: "Error while fetching databases",
      });
    }

    res.status(200).json(result);
  });
});

app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000");
});