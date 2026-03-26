import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Project Task Tracker API is running" });
  });

  // Sample REST API endpoints (these would normally interact with Firebase Admin SDK)
  // For this app, we'll primarily use client-side Firebase for real-time features,
  // but we'll provide these endpoints as requested.
  
  app.get("/api/projects", (req, res) => {
    // In a real app, you'd verify JWT and fetch from Firestore via Admin SDK
    res.json({ message: "Use client-side Firestore for real-time project listing" });
  });

  app.post("/api/projects", (req, res) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    res.status(201).json({ message: "Project created (mock response)", project: { title, description } });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
