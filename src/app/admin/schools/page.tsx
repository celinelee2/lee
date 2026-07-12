"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type School = {
  id: string;
  fullName: string;
  shortName: string;
  address: string | null;
  website: string | null;
  contactPerson: string | null;
  taxId: string | null;
  cooperationDate: string | null;
  isActive: boolean;
  legalEntity: { id: string; name: string } | null;
};

const emptyForm = {
  fullName: "", shortName: "", address: "", website: "",
  contactPerson: "", taxId: "", cooperationDate: "", legalEntityId: "",
};

const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { border: "1px solid #E0D5C2", background: "#FDFAF6" };
const labelCls = "block text-sm font-medium mb-1";
const labelStyle = { color: "#4A3B2A" };

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"none" | "add" | "edit">("none");
  const [editSchool, setEditSchool] = useState<School | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: string[] } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/schools");
    setSchools(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function f(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (mode === "edit" && editSchool) {
      await fetch(`/api/admin/schools/${editSchool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "新增失敗");
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setMode("none");
    setEditSchool(null);
    setForm(emptyForm);
    load();
  }

  function openEdit(s: School) {
    setEditSchool(s);
    setForm({
      fullName: s.fullName,
      shortName: s.shortName,
      address: s.address ?? "",
      website: s.website ?? "",
      contactPerson: s.contactPerson ?? "",
      taxId: s.taxId ?? "",
      cooperationDate: s.cooperationDate ? s.cooperationDate.slice(0, 10) : "",
      legalEntityId: s.legalEntity?.id ?? "",
    });
    setMode("edit");
  }

  async function toggleActive(s: School) {
    await fetch(`/api/admin/schools/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, isActive: !s.isActive }),
    });
    load();
  }

  async function handleBatchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/schools/batch", { method: "POST", body: fd });
    setUploadResult(await res.json());
    setUploading(false);
    e.target.value = "";
    load();
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F2EA" }}>
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: "#E0D5C2" }}>
        <Link href="/admin" className="text-sm" style={{ color: "#8A7A63" }}>← 後台首頁</Link>
        <h1 className="font-bold text-lg" style={{ color: "#4A3B2A" }}>學校 / 園所管理</h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm" style={{ color: "#8A7A63" }}>共 {schools.filter(s => s.isActive).length} 所合作機構</p>
          <div className="flex gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/admin/schools/template" className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>
              下載範本
            </a>
            <label className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>
              {uploading ? "上傳中..." : "批次上傳 CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleBatchUpload} disabled={uploading} />
            </label>
            <button
              onClick={() => { setMode(mode === "add" ? "none" : "add"); setEditSchool(null); setForm(emptyForm); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "#8A6D3F" }}>
              {mode === "add" ? "取消" : "+ 新增學校"}
            </button>
          </div>
        </div>

        {uploadResult && (
          <div className="rounded-xl p-4 mb-6 text-sm" style={{
            background: uploadResult.errors.length === 0 ? "#F0F7EC" : "#FEF3F2",
            border: `1px solid ${uploadResult.errors.length === 0 ? "#C8DFB8" : "#FECDCA"}`,
          }}>
            <p className="font-medium mb-1" style={{ color: uploadResult.errors.length === 0 ? "#3B6D11" : "#A32D2D" }}>
              成功匯入 {uploadResult.success} 筆{uploadResult.errors.length > 0 && `，${uploadResult.errors.length} 筆失敗`}
            </p>
            {uploadResult.errors.map((err, i) => (
              <p key={i} className="text-xs mt-0.5" style={{ color: "#A32D2D" }}>{err}</p>
            ))}
            <button onClick={() => setUploadResult(null)} className="mt-2 text-xs underline" style={{ color: "#8A7A63" }}>關閉</button>
          </div>
        )}

        {(mode === "add" || mode === "edit") && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm" style={{ border: "1px solid #E0D5C2" }}>
            <h2 className="font-semibold mb-4" style={{ color: "#4A3B2A" }}>
              {mode === "edit" ? `編輯：${editSchool?.fullName}` : "新增學校 / 園所"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={labelStyle}>學校全名 *</label>
                  <input required value={form.fullName} onChange={e => f("fullName", e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>學校統編</label>
                  <input value={form.taxId} maxLength={8} placeholder="8 位數字"
                    onChange={e => { if (/^\d{0,8}$/.test(e.target.value)) f("taxId", e.target.value); }}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>學校簡稱 *</label>
                  <input required value={form.shortName} onChange={e => f("shortName", e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>業務管理人</label>
                  <input value={form.contactPerson} onChange={e => f("contactPerson", e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>合作日期</label>
                  <input type="date" value={form.cooperationDate} onChange={e => f("cooperationDate", e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>機構地址</label>
                  <input value={form.address} onChange={e => f("address", e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls} style={labelStyle}>機構網址</label>
                  <input value={form.website} onChange={e => f("website", e.target.value)}
                    placeholder="https://" className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button"
                  onClick={() => { setMode("none"); setEditSchool(null); setForm(emptyForm); }}
                  className="px-4 py-2 rounded-lg text-sm" style={{ border: "1px solid #E0D5C2", color: "#8A7A63" }}>
                  取消
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "#8A6D3F" }}>
                  {saving ? "儲存中..." : mode === "edit" ? "儲存" : "新增"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #E0D5C2" }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "#8A7A63" }}>載入中...</div>
          ) : schools.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "#8A7A63" }}>尚無學校資料</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E0D5C2", background: "#FDFAF6" }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "#8A7A63" }}>學校全名</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "#8A7A63" }}>簡稱</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "#8A7A63" }}>業務管理人</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "#8A7A63" }}>合作日期</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "#8A7A63" }}>狀態</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < schools.length - 1 ? "1px solid #E0D5C2" : undefined }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "#4A3B2A" }}>{s.fullName}</td>
                    <td className="px-4 py-3" style={{ color: "#8A7A63" }}>{s.shortName}</td>
                    <td className="px-4 py-3" style={{ color: "#8A7A63" }}>{s.contactPerson ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "#8A7A63" }}>
                      {s.cooperationDate ? new Date(s.cooperationDate).toLocaleDateString("zh-TW") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs" style={{
                        background: s.isActive ? "#F0F7EC" : "#F7F2EA",
                        color: s.isActive ? "#3B6D11" : "#8A7A63",
                      }}>
                        {s.isActive ? "合作中" : "停用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(s)}
                          className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: "#8A6D3F" }}>
                          編輯
                        </button>
                        <button onClick={() => toggleActive(s)}
                          className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: s.isActive ? "#A32D2D" : "#3B6D11" }}>
                          {s.isActive ? "停用" : "啟用"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
