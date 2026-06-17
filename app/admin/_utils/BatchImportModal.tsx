"use client";
import { useRef, useState } from "react";
import { parseFileToRows } from "./parseExcel";

type Props = {
  title: string;
  templateText: string;
  templateHint: string;
  onImport: (rows: string[][]) => Promise<string>;
  onClose: () => void;
};

export default function BatchImportModal({ title, templateText, templateHint, onImport, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [previewText, setPreviewText] = useState("");
  const [result, setResult] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult("");
    const parsed = await parseFileToRows(file);
    setRows(parsed);
    setPreviewText(parsed.map((r) => r.join(",")).join("\n"));
    e.target.value = "";
  }

  function handlePaste(text: string) {
    setPreviewText(text);
    const parsed = text
      .trim()
      .split("\n")
      .map((row) => row.split(",").map((c) => c.trim()));
    setRows(parsed);
    setResult("");
  }

  async function handleSubmit() {
    if (rows.length === 0) { setResult("請先上傳或貼上資料"); return; }
    setSubmitting(true);
    const msg = await onImport(rows);
    setResult(msg);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-dark)" }}>{title}</h2>

        <div>
          <p className="text-xs mb-1" style={{ color: "var(--unmarked)" }}>{templateHint}</p>
          <pre
            className="text-xs p-3 rounded-lg border"
            style={{ backgroundColor: "var(--bg)", borderColor: "var(--card-border)", color: "var(--unmarked)" }}
          >
            {templateText}
          </pre>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-sm border font-medium"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            上傳 Excel / CSV
          </button>
          <span className="text-xs" style={{ color: "var(--unmarked)" }}>或直接貼上↓</span>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        </div>

        <textarea
          value={previewText}
          onChange={(e) => handlePaste(e.target.value)}
          rows={8}
          placeholder="貼上 CSV 內容，或點上方按鈕上傳檔案…"
          className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none font-mono"
          style={{ borderColor: "var(--card-border)" }}
        />

        {result && (
          <p className="text-sm" style={{ color: result.startsWith("成功") ? "var(--present)" : "var(--absent)" }}>
            {result}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm border"
            style={{ borderColor: "var(--card-border)", color: "var(--text-dark)" }}
          >
            關閉
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || rows.length === 0}
            className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {submitting ? "匯入中…" : "匯入"}
          </button>
        </div>
      </div>
    </div>
  );
}
