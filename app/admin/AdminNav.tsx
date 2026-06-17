"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/users", label: "老師帳號" },
  { href: "/admin/classes", label: "課程時段" },
  { href: "/admin/enrollment-labels", label: "班別管理" },
  { href: "/admin/students", label: "學生名單" },
  { href: "/admin/settings", label: "系統設定" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {links.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="block px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: active ? "var(--bg)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-dark)",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
