const router = require("express").Router();
const pool = require("../db");

const STATUSES = ["Pending", "In progress", "Completed"];
const COLUMNS = "id, title, category, description, status";

// Sends a JSON error with the given status code.
function fail(res, status, message) {
  return res.status(status).json({ message });
}

// Returns the id as a number, or null when it is not a positive whole number.
function parseId(value) {
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

// Checks the four editable fields. Returns { error } or { values }.
function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object with title, category, description and status." };
  }
  const rules = [
    ["title", "Title", 3, 80],
    ["category", "Category", 2, 40],
    ["description", "Description", 5, 300]
  ];
  const values = {};
  for (const [field, label, min, max] of rules) {
    if (typeof body[field] !== "string") return { error: `${label} is required and must be text.` };
    const trimmed = body[field].trim();
    if (trimmed.length < min || trimmed.length > max) {
      return { error: `${label} must have ${min} to ${max} characters.` };
    }
    values[field] = trimmed;
  }
  if (typeof body.status !== "string") return { error: "Status is required and must be text." };
  const status = body.status.trim();
  if (!STATUSES.includes(status)) {
    return { error: "Status must be one of: Pending, In progress, Completed." };
  }
  values.status = status;
  return { values };
}

// GET /api/records - all records
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM records ORDER BY id`);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/records/:id - one record
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return fail(res, 400, "Id must be a positive whole number.");
    const result = await pool.query(`SELECT ${COLUMNS} FROM records WHERE id = ?`, [id]);
    if (result.rowCount === 0) return fail(res, 404, `Record ${id} was not found.`);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/records - create (any client-supplied id is ignored)
router.post("/", async (req, res, next) => {
  try {
    const { error, values } = validate(req.body);
    if (error) return fail(res, 400, error);
    const result = await pool.query(
      `INSERT INTO records (title, category, description, status) VALUES (?, ?, ?, ?) RETURNING ${COLUMNS}`,
      [values.title, values.category, values.description, values.status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/records/:id - replace the four editable fields (does not create)
router.put("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return fail(res, 400, "Id must be a positive whole number.");
    const { error, values } = validate(req.body);
    if (error) return fail(res, 400, error);
    const result = await pool.query(
      `UPDATE records SET title = ?, category = ?, description = ?, status = ? WHERE id = ? RETURNING ${COLUMNS}`,
      [values.title, values.category, values.description, values.status, id]
    );
    if (result.rowCount === 0) return fail(res, 404, `Record ${id} was not found.`);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/records/:id - delete
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return fail(res, 400, "Id must be a positive whole number.");
    const result = await pool.query("DELETE FROM records WHERE id = ? RETURNING id", [id]);
    if (result.rowCount === 0) return fail(res, 404, `Record ${id} was not found.`);
    res.status(200).json({ message: "Record deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
