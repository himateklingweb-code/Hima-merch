import { Metadata } from "next";
import DeptIcon from "@/components/DeptIcon";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDepartments, getDepartmentBySlug } from "@/lib/content-repo";
import { ArrowLeft, User } from "lucide-react";

export async function generateStaticParams() {
  const departments = await getDepartments();
  return departments.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dept = await getDepartmentBySlug(slug);
  if (!dept) return {};
  return {
    title: dept.slug === "bph" ? dept.name : `Departemen ${dept.name}`,
    description: dept.description,
  };
}

export default async function DepartemenDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = await getDepartmentBySlug(slug);
  if (!dept) notFound();

  // BPH is the executive board, not a department — don't prefix it "Dept."
  const isBph = dept.slug === "bph";
  const activePeriod = dept.periods.find((p) => p.is_active);
  const pastPeriods = dept.periods.filter((p) => !p.is_active);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-12 lg:py-16">
      <Link
        href="/departemen"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 hover:underline mb-4 sm:mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Kepengurusan
      </Link>

      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <DeptIcon name={dept.icon} className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-xl sm:text-4xl font-bold text-gray-900">
            {isBph ? dept.name : `Dept. ${dept.name}`}
          </h1>
          <p className="text-xs sm:text-base text-gray-500 mt-0.5">HIMA Teknik Lingkungan UNTAN</p>
        </div>
      </div>

      <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-10">
        <h2 className="font-semibold text-emerald-800 text-sm sm:text-base mb-1.5">Deskripsi & Program Kerja</h2>
        <p className="text-xs sm:text-base text-gray-700 leading-relaxed">{dept.description}</p>
      </div>

      {/* Active Period */}
      {activePeriod && (
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-bold text-gray-900">Pengurus Aktif</h2>
            <span className="text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {activePeriod.period_label}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {activePeriod.members
              .sort((a, b) => a.order_index - b.order_index)
              .map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-xl border border-gray-200 p-3.5 sm:p-5 text-center"
                >
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gray-100 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{member.name}</h3>
                  <p className="text-[10px] sm:text-xs text-emerald-600 mt-0.5">{member.position}</p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Past Periods */}
      {pastPeriods.length > 0 && (
        <section>
          <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Pengurus Terdahulu</h2>
          {pastPeriods.map((period) => (
            <div key={period.id} className="mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2.5 pb-2 border-b border-gray-200">
                Periode {period.period_label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {period.members
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((member) => (
                    <div key={member.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gray-200 mx-auto mb-1.5 flex items-center justify-center">
                        <User className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
                      </div>
                      <h4 className="font-medium text-gray-700 text-[11px] sm:text-sm">{member.name}</h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{member.position}</p>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
