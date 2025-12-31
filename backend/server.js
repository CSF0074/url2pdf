import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { crawlWebsite } from "./crawler.js";
import { generatePDF } from "./pdf.js";
import { mergePDFs } from "./merge.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

const OUTPUT_DIR = path.join(process.cwd(), "output");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

app.post("/process", async (req, res) => {
  try {
    let { url } = req.body;   // ✅ THIS WAS MISSING

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const pages = await crawlWebsite(url);
    const pdfPaths = [];

    for (let i = 0; i < pages.length; i++) {
      const pdfPath = path.join(
        OUTPUT_DIR,
        `page-${i + 1}.pdf`
      );

      await generatePDF(pages[i], pdfPath);
      pdfPaths.push(pdfPath);
    }

    const mergedPath = path.join(OUTPUT_DIR, "merged.pdf");
    await mergePDFs(pdfPaths, mergedPath);

    res.json({
      pages: pdfPaths.map((_, i) => ({
        name: `Page ${i + 1}`,
        downloadUrl: `/output/page-${i + 1}.pdf`
      })),
      mergedDownloadUrl: "/output/merged.pdf"
    });

  } catch (error) {
    console.error("PROCESS ERROR:", error);
    res.status(500).json({
      error: "Processing failed",
      details: error.message
    });
  }
});


app.use("/output", express.static(OUTPUT_DIR));

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
