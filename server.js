const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 3000;

// In-memory storage of uploaded text
let storedText = "";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve your existing static files:
app.use(express.static(path.join(__dirname)));

// API endpoint to upload text
app.post("/api/upload", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });
  storedText = text;
  res.json({ message: "Text uploaded successfully" });
});

// API endpoint to retrieve text
app.get("/api/retrieve", (req, res) => {
  res.json({ text: storedText });
});

// Fallback to serve index.html for any other route (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
