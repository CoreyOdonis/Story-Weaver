import { useState } from "react";
import { jsPDF } from "jspdf";
import { useGenerateIllustrations } from "@workspace/api-client-react";

export type PdfExportStatus = "idle" | "illustrating" | "building" | "error";

interface StoryData {
  title: string;
  story: string;
  childName: string;
  emoji: string;
}

async function pngBase64ToJpegDataUrl(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No canvas context");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64}`;
  });
}

function buildStorybookPdf(storyData: StoryData, jpegDataUrls: string[]): jsPDF {
  const { title, story, childName } = storyData;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const H = 297;
  const M = 18;
  const CW = W - 2 * M;

  const paragraphs = story.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const storyImages = jpegDataUrls.slice(1);

  const paraGroups: string[][] =
    storyImages.length < 2
      ? [paragraphs]
      : [
          paragraphs.slice(0, Math.ceil(paragraphs.length / 2)),
          paragraphs.slice(Math.ceil(paragraphs.length / 2)),
        ];

  const totalPages = 1 + Math.max(1, paraGroups.length);

  function fillBg() {
    pdf.setFillColor(254, 250, 246);
    pdf.rect(0, 0, W, H, "F");
  }

  function accentLine(y: number) {
    pdf.setDrawColor(150, 100, 210);
    pdf.setLineWidth(0.22);
    pdf.line(M + 10, y, W - M - 10, y);
  }

  function footer(pageNum: number) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(120, 100, 145);
    pdf.text("✦  Dreamtime Stories  ✦", W / 2, H - 8, { align: "center" });
    pdf.text(`${pageNum} / ${totalPages}`, W - M, H - 8, { align: "right" });
  }

  // ── PAGE 1: COVER ──
  fillBg();

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(150, 120, 180);
  pdf.text("D R E A M T I M E  S T O R I E S", W / 2, M - 5, { align: "center" });

  const coverIllH = 145;
  if (jpegDataUrls[0]) {
    pdf.addImage(jpegDataUrls[0], "JPEG", M, M, CW, coverIllH);
  }

  const divY = M + coverIllH + 7;
  accentLine(divY);

  pdf.setFont("times", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(150, 100, 200);
  pdf.text("✦", W / 2, divY + 5.5, { align: "center" });

  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(28, 22, 42);
  const titleLines = pdf.splitTextToSize(title, CW - 12);
  const titleBlockH = titleLines.length * 9;
  pdf.text(titleLines, W / 2, divY + 14, { align: "center" });

  pdf.setFont("times", "italic");
  pdf.setFontSize(11.5);
  pdf.setTextColor(110, 90, 130);
  pdf.text(`A bedtime story for ${childName}`, W / 2, divY + 14 + titleBlockH + 5, {
    align: "center",
  });

  accentLine(H - 16);
  footer(1);

  // ── STORY PAGES ──
  const illH = 118;
  const textY = M + illH + 12;
  const lineH = 6.6;
  const paraGap = 4;
  const maxTextY = H - 20;

  for (let pi = 0; pi < Math.max(1, paraGroups.length); pi++) {
    pdf.addPage();
    fillBg();

    const img = storyImages[pi];
    if (img) {
      pdf.addImage(img, "JPEG", M, M, CW, illH);
    }

    accentLine(M + illH + 5);

    pdf.setFont("times", "normal");
    pdf.setFontSize(12.5);
    pdf.setTextColor(28, 22, 42);

    let y = textY + 2;
    const group = paraGroups[pi] ?? [];
    for (const para of group) {
      const lines = pdf.splitTextToSize(para, CW);
      const needed = lines.length * lineH;
      if (y + needed > maxTextY) break;
      pdf.text(lines, M, y);
      y += needed + paraGap;
    }

    footer(2 + pi);
  }

  return pdf;
}

export function usePdfExport() {
  const [status, setStatus] = useState<PdfExportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: generateIllustrations } = useGenerateIllustrations();

  const download = async (storyData: StoryData) => {
    setStatus("illustrating");
    setError(null);
    try {
      const { images } = await generateIllustrations({ data: storyData });
      setStatus("building");
      const jpegDataUrls = await Promise.all(images.map(pngBase64ToJpegDataUrl));
      const pdf = buildStorybookPdf(storyData, jpegDataUrls);
      const safeTitle = storyData.title.replace(/[^a-z0-9 ]/gi, "").trim() || "Dreamtime Story";
      pdf.save(`${safeTitle}.pdf`);
      setStatus("idle");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong — please try again.";
      setError(msg);
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setError(null);
  };

  return { download, status, error, reset };
}
