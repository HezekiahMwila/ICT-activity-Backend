require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const guidePage = require("./guide");

const app = express();
app.set("trust proxy", 1); // so the guide shows https:// behind Render's proxy

const origins = (process.env.CLIENT_ORIGINS || "")
  .split(",").map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin: origins }));
app.use(express.json());

// API guide for the marker
app.get("/", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.status(200).type("html").send(guidePage(baseUrl));
});

// Server and database check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1 AS ok");
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({ status: "error", database: "unavailable", message: "Database is not responding." });
  }
});

// Record routes
app.use("/api/records", require("./routes/records"));

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} was not found.` });
});

// Error handler
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON in request body." });
  }
  console.error(error);
  res.status(500).json({ message: "An unexpected server error occurred." });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
