import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const WEEKDAYS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const todayWeekday = new Date().getDay();

  const where =
    session.user.role === "ADMIN"
      ? { isActive: true }
      : { isActive: true, teachers: { some: { userId: session.user.id } } };

  const classes = await prisma.class.findMany({
    where,
    include: {
      teachers: { include: { user: { select: { name: true } } } },
      _count: { select: { studentLinks: { where: { isActive: true } } } },
    },
    orderBy: [{ weekday: "asc" }, { name: "asc" }],
  });

  // Check today's session completion status for each class
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todaySessions = await prisma.classSession.findMany({
    where: {
      classId: { in: classes.map((c) => c.id) },
      sessionDate: today,
    },
  });
  const todaySessionMap = new Map(todaySessions.map((s) => [s.classId, s]));

  const todayClasses = classes.filter((c) => c.weekday === todayWeekday);
  const otherClasses = classes.filter((c) => c.weekday !== todayWeekday);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>
              {session.user.name} 老師，您好
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--unmarked)" }}>
              今天 {WEEKDAYS[todayWeekday]}
            </p>
          </div>
          {session.user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-sm px-3 py-1.5 rounded-lg border"
              style={{ borderColor: "var(--card-border)", color: "var(--accent)" }}
            >
              管理後台
            </Link>
          )}
        </div>

        {todayClasses.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--unmarked)" }}>
              今天的課
            </h2>
            <div className="space-y-3">
              {todayClasses.map((cls) => {
                const todaySession = todaySessionMap.get(cls.id);
                const completed = !!todaySession?.completedAt;
                return (
                  <div
                    key={cls.id}
                    className="bg-white rounded-xl border p-4"
                    style={{ borderColor: "var(--card-border)" }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text-dark)" }}>{cls.name}</p>
                        <p className="text-sm mt-0.5" style={{ color: "var(--unmarked)" }}>
                          {cls.campus} · {cls.subject} · {cls.scheduleText}
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: "var(--unmarked)" }}>
                          {cls._count.studentLinks} 位學生
                        </p>
                      </div>
                      {completed && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: "#DCEFD3", color: "var(--present)" }}>
                          已完成
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/class/${cls.id}`}
                        className="flex-1 text-center py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: "var(--accent)" }}
                      >
                        {completed ? "查看點名" : "開始點名"}
                      </Link>
                      <Link
                        href={`/class/${cls.id}/report`}
                        className="px-4 py-2 rounded-lg text-sm border"
                        style={{ borderColor: "var(--card-border)", color: "var(--text-dark)" }}
                      >
                        月報表
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {otherClasses.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--unmarked)" }}>
              其他課程時段
            </h2>
            <div className="space-y-2">
              {otherClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white rounded-xl border p-4 flex items-center justify-between"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--text-dark)" }}>{cls.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--unmarked)" }}>
                      {WEEKDAYS[cls.weekday]} · {cls.campus} · {cls.subject}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/class/${cls.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border"
                      style={{ borderColor: "var(--card-border)", color: "var(--accent)" }}
                    >
                      點名
                    </Link>
                    <Link
                      href={`/class/${cls.id}/report`}
                      className="text-xs px-3 py-1.5 rounded-lg border"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-dark)" }}
                    >
                      月報表
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {classes.length === 0 && (
          <div className="text-center py-16">
            <p style={{ color: "var(--unmarked)" }}>尚未被指派任何課程時段</p>
            <p className="text-sm mt-1" style={{ color: "var(--unmarked)" }}>請聯繫管理者進行設定</p>
          </div>
        )}
      </div>
    </div>
  );
}
