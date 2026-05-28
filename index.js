
require("dotenv").config();

const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

connection.connect((error) => {
  if (error) {
    console.log("Database connection failed");
    console.log(error);
  } else {
    console.log("Database connected");
  }
});

/* ================= OTP STORAGE ================= */

const otpStore = {};

/* ================= NODEMAILER ================= */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ================= TEST API ================= */

app.get("/", (req, res) => {
  res.send("Backend Running Successfully 🚀");
});

/* ================= SHOW TABLES ================= */

app.get("/api/tables", (req, res) => {
  connection.query("SHOW TABLES", (error, result) => {
    if (error) {
      return res.status(500).json({
        message: "Error while fetching tables",
      });
    }

    res.status(200).json(result);
  });
});
/* ================= SIGNUP ================= */

app.post("/signup", async (req, res) => {

  try {

    const {
      username,
      first_name,
      last_name,
      phone,
      email,
      password,
      user_type,
    } = req.body;

    /* ================= CHECK USER ================= */

    const checkQuery =
      "SELECT * FROM users WHERE email = ?";

    connection.query(
      checkQuery,
      [email],
      async (err, result) => {

        if (err) {

          return res.json({
            status: "db_error",
          });

        }

        if (result.length > 0) {

          return res.json({
            status: "user_exists",
          });

        }

        /* ================= GENERATE OTP ================= */

        const otp =
          Math.floor(
            100000 + Math.random() * 900000
          );

        const otpExpiry =
          new Date(
            Date.now() + 5 * 60 * 1000
          );

        /* ================= HASH PASSWORD ================= */

        const hashedPassword =
          await bcrypt.hash(password, 10);

        /* ================= INSERT USER ================= */

        const insertQuery = `
          INSERT INTO users
          (
            username,
            first_name,
            last_name,
            phone,
            email,
            password,
            user_type,
            otp,
            otp_expiry,
            is_verified
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        connection.query(
          insertQuery,
          [
            username,
            first_name,
            last_name,
            phone,
            email,
            hashedPassword,
            user_type,
            otp,
            otpExpiry,
            0
          ],
          async (err) => {

            if (err) {

              console.log(err);

              return res.json({
                status: "signup_failed",
              });

            }

            /* ================= SEND OTP MAIL ================= */

            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: email,
              subject: "DWJD OTP Verification",
              html: `
                <div style="
                  font-family: Arial;
                  padding: 20px;
                  background: #f4f4f4;
                ">
                  <h2>
                    Welcome to DWJD 🌱
                  </h2>

                  <p>
                    Your OTP verification code is:
                  </p>

                  <h1 style="
                    color: green;
                    letter-spacing: 5px;
                  ">
                    ${otp}
                  </h1>

                  <p>
                    OTP expires in 5 minutes.
                  </p>
                </div>
              `,
            });

            /* ================= RESPONSE ================= */

            res.json({
              status: "signup_success_otp_sent",
            });

          }
        );
      }
    );

  } catch (error) {

    console.log(error);

    res.json({
      status: "server_error",
    });

  }
});



/* ================= LOGIN ================= */

app.post("/login", (req, res) => {
  try {
    const { email, password, user_type } = req.body;

    const query =
      "SELECT * FROM users WHERE email = ? AND user_type = ?";

    connection.query(query, [email, user_type], async (err, result) => {
      if (err) {
        return res.json({
          status: "db_error",
        });
      }

      if (result.length === 0) {
        return res.json({
          status: "invalid_user",
        });
      }

      const user = result[0];

      const isMatch = await bcrypt.compare(
        password,
        user.password
      );

      if (!isMatch) {
        return res.json({
          status: "wrong_password",
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          user_type: user.user_type,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      res.json({
        status: "login_success",
        token,
        user: {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          user_type: user.user_type,
        },
      });
    });
  } catch (error) {
    console.log(error);

    res.json({
      status: "server_error",
    });
  }
});


/* ================= GET USER DETAILS ================= */

app.post("/get-user", (req, res) => {

  const { email } = req.body;

  const query = `
    SELECT
      id,
      username,
      first_name,
      last_name,
      phone,
      email,
      user_type
    FROM users
    WHERE email = ?
  `;

  connection.query(
    query,
    [email],
    (err, result) => {

      if (err) {
        return res.json({
          status: "db_error",
        });
      }

      if (result.length === 0) {
        return res.json({
          status: "user_not_found",
        });
      }

      res.json({
        status: "success",
        user: result[0],
      });
    }
  );
});

/* ================= UPDATE PROFILE ================= */ app.put("/update-profile", (req, res) => { const { email, first_name, last_name, phone, } = req.body; const query = ` UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE email = ? `; connection.query( query, [ first_name, last_name, phone, email, ], (err) => { if (err) { console.log(err); return res.json({ status: "update_failed", }); } const getUpdatedUser = ` SELECT id, username, first_name, last_name, phone, email, user_type FROM users WHERE email = ? `; connection.query( getUpdatedUser, [email], (err, result) => { if (err) { return res.json({ status: "db_error", }); } res.json({ status: "updated_successfully", user: result[0], }); } ); } ); });



app.post("/verify-otp", (req, res) => {

  const { email, otp } = req.body;

  const query = `
    SELECT * FROM users
    WHERE email = ?
  `;

  connection.query(
    query,
    [email],
    (err, result) => {

      if (err) {
        return res.json({
          status: "db_error",
        });
      }

      if (result.length === 0) {
        return res.json({
          status: "user_not_found",
        });
      }

      const user = result[0];

      if (user.is_verified === 1) {
        return res.json({
          status: "already_verified",
        });
      }

      if (user.otp != otp) {
        return res.json({
          status: "invalid_otp",
        });
      }

      const now = new Date();

      if (now > user.otp_expiry) {
        return res.json({
          status: "otp_expired",
        });
      }

      const updateQuery = `
        UPDATE users
        SET
          is_verified = 1,
          otp = NULL,
          otp_expiry = NULL
        WHERE email = ?
      `;

      connection.query(
        updateQuery,
        [email],
        (err) => {

          if (err) {
            return res.json({
              status: "verification_failed",
            });
          }

          res.json({
            status: "otp_verified",
          });
        }
      );
    }
  );
});


/* ================= SERVER ================= */

app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000");
});

