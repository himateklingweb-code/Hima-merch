/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { iconFromName } from "@/lib/icons";
import { Metadata } from "next";
import { getDepartments, getSiteMeta } from "@/lib/content-repo";
import { Department, DepartmentMember } from "@/data/departments";
import { ArrowRight, User } from "lucide-react";

function hasPhoto(member: DepartmentMember) {
  return Boolean(member.photo) && member.photo !== "/placeholder-avatar.png";
}

// A department's "head" is whoever holds the leading position in its
// active period — matched by title rather than assumed to be
// order_index 1, since staff can reorder members freely in admin.
function departmentHead(dept: Department) {
  const activePeriod = dept.periods.find((p) => p.is_active);
  if (!activePeriod) return null;
  const members = [...activePeriod.members].sort(
    (a, b) => a.order_index - b.order_index
  );
  return (
    members.find((m) => m.position.toLowerCase().includes("kepala")) ??
    members[0] ??
    null
  );
}

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/departemen");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/departemen" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
    },
  };
}

// BPH is the executive board, not a department — it sits above the
// departments as its own block. Identified by its stable slug.
const BPH_SLUG = "bph";

// Read fresh at most once a minute so stock and new content appear
// without a redeploy.
export const revalidate = 60;

export default async function KepengurusanPage() {
  const all = await getDepartments();
  const bph = all.find((d) => d.slug === BPH_SLUG);
  const departments = all.filter((d) => d.slug !== BPH_SLUG);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <div className="max-w-2xl mb-5 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">
          Kepengurusan
        </h1>
        <p className="text-gray-500 mt-1 sm:mt-3 text-sm sm:text-lg">
          Badan Pengurus Harian bersama {departments.length} departemen yang
          menjalankan program kerja organisasi.
        </p>
      </div>

      {/* Org chart — Ketua at the top, Sekretaris & Bendahara level below
          it, department heads at the bottom, so the reporting structure
          reads at a glance before the detail sections beneath. */}
      {bph &&
        (() => {
          const activePeriod = bph.periods.find((p) => p.is_active);
          const bphMembers = [...(activePeriod?.members ?? [])].sort(
            (a, b) => a.order_index - b.order_index
          );
          // "Ketua" leads the chart alone; everyone else in BPH (Sekretaris,
          // Bendahara, and any other core roles) sits one level below,
          // side by side. "Wakil Ketua" is excluded from the ketua match
          // so a deputy chair doesn't get mistaken for the chair.
          const ketua =
            bphMembers.find(
              (m) => /ketua/i.test(m.position) && !/wakil/i.test(m.position)
            ) ?? bphMembers[0] ?? null;
          const secondTier = bphMembers.filter((m) => m.id !== ketua?.id);

          const heads = departments
            .map((d) => ({ dept: d, head: departmentHead(d) }))
            .filter((x): x is { dept: Department; head: NonNullable<ReturnType<typeof departmentHead>> } => !!x.head);

          if (!ketua && heads.length === 0) return null;

          return (
            <div className="mb-10 sm:mb-14">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">
                  Bagan Struktur Organisasi
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-8 overflow-x-auto">
                <div className="min-w-[560px] flex flex-col items-center">
                  {/* Level 1 — Ketua */}
                  {ketua && (
                    <div className="w-36 sm:w-44 rounded-xl border-2 border-emerald-300 bg-emerald-100 p-3 sm:p-4 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-600 text-white mx-auto mb-2 flex items-center justify-center overflow-hidden">
                        {hasPhoto(ketua) ? (
                          <img
                            src={ketua.photo}
                            alt={ketua.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                        {ketua.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-emerald-700 mt-0.5">
                        {ketua.position}
                      </p>
                    </div>
                  )}

                  {/* Connector */}
                  {ketua && secondTier.length > 0 && (
                    <div className="w-px h-6 sm:h-8 bg-gray-300" />
                  )}

                  {/* Level 2 — Sekretaris & Bendahara (and any other BPH members) */}
                  {secondTier.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                      {secondTier.map((m) => (
                        <div
                          key={m.id}
                          className="w-32 sm:w-40 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 sm:p-4 text-center"
                        >
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-emerald-600 text-white mx-auto mb-2 flex items-center justify-center overflow-hidden">
                            {hasPhoto(m) ? (
                              <img
                                src={m.photo}
                                alt={m.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                            {m.name}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-emerald-700 mt-0.5">
                            {m.position}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Connector */}
                  {(ketua || secondTier.length > 0) && heads.length > 0 && (
                    <div className="w-px h-6 sm:h-8 bg-gray-300" />
                  )}

                  {/* Level 3 — Department heads */}
                  {heads.length > 0 && (
                    <div className="w-full">
                      <div className="mx-auto h-px bg-gray-300" style={{ maxWidth: `${Math.min(heads.length, 6) * 130}px` }} />
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-5 sm:gap-x-4 mt-0">
                        {heads.map(({ dept, head }) => (
                          <div key={dept.id} className="flex flex-col items-center">
                            <div className="w-px h-4 sm:h-5 bg-gray-300" />
                            <Link
                              href={`/departemen/${dept.slug}`}
                              className="w-28 sm:w-36 rounded-xl border border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50 transition-colors p-2.5 sm:p-3.5 text-center"
                            >
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-gray-200 mx-auto mb-1.5 sm:mb-2 flex items-center justify-center overflow-hidden">
                                {hasPhoto(head) ? (
                                  <img
                                    src={head.photo}
                                    alt={head.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                                )}
                              </div>
                              <h4 className="font-medium text-gray-900 text-[11px] sm:text-xs truncate">
                                {head.name}
                              </h4>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                                {dept.name}
                              </p>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Badan Pengurus Harian — the executive board, above the departments */}
      {bph &&
        (() => {
          const activePeriod = bph.periods.find((p) => p.is_active);
          const Icon = iconFromName(bph.icon);
          return (
            <div className="mb-8 sm:mb-12">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">
                  Badan Pengurus Harian
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <Link
                href={`/departemen/${bph.slug}`}
                className="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-7 hover:border-emerald-300 hover:shadow-lg active:scale-[0.99] transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                    {bph.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                    {bph.description}
                  </p>
                  <div className="mt-2 sm:mt-3 flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-400">
                    <span>{activePeriod?.members.length ?? 0} pengurus inti</span>
                    <span>Periode {activePeriod?.period_label}</span>
                  </div>
                </div>
                <ArrowRight className="hidden sm:block w-5 h-5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          );
        })()}

      {/* Departments */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">
          Departemen
        </span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        {departments.map((dept) => {
          const activePeriod = dept.periods.find((p) => p.is_active);
          const Icon = iconFromName(dept.icon);
          return (
            <Link
              key={dept.id}
              href={`/departemen/${dept.slug}`}
              className="group bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:border-emerald-300 active:scale-[0.98] hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                    {dept.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 line-clamp-2">{dept.description}</p>
                  <div className="mt-2 sm:mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-400">
                      <span>{activePeriod?.members.length ?? 0} pengurus</span>
                      <span>Periode {activePeriod?.period_label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
