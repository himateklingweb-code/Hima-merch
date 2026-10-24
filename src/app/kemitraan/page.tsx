import { Metadata } from "next";
import { getPartners, getSiteMeta } from "@/lib/content-repo";
import type { Partner } from "@/data/partners";
import { SITE, waLink } from "@/lib/site";
import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import PartnerLogoImg from "@/components/PartnerLogoImg";

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/kemitraan");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/kemitraan" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
    },
  };
}

// Read fresh at most once a minute so new partners appear without a redeploy.
export const revalidate = 60;

/** Logo mitra selalu lingkaran; logo persegi memenuhi lingkaran (lihat PartnerLogoImg). */
function PartnerLogo({ partner }: { partner: Partner }) {
  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-[rgba(32,30,29,.14)] bg-white sm:h-20 sm:w-20">
      <PartnerLogoImg src={partner.logo} alt={partner.logo ? `Logo ${partner.name}` : ""} />
    </span>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const body = (
    <>
      <PartnerLogo partner={partner} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold leading-snug text-[#201e1d] [overflow-wrap:anywhere] sm:text-lg">
            {partner.name}
          </span>
          <span
            className={`rounded-sm px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[.12em] ${
              partner.type === "sponsor"
                ? "bg-[#ffd985] text-[#201e1d]"
                : "bg-[#626b3f] text-white"
            }`}
          >
            {partner.type === "sponsor" ? "Sponsor" : "Mitra"}
          </span>
        </span>
        {partner.description && (
          <span className="mt-1.5 block text-sm leading-relaxed text-[#605d5d]">
            {partner.description}
          </span>
        )}
        {partner.website && (
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[.14em] text-[#626b3f]">
            Kunjungi situs
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
    </>
  );

  const cls =
    "flex items-start gap-4 rounded-sm border border-[rgba(32,30,29,.14)] bg-white p-4 transition-colors sm:gap-5 sm:p-6";

  return partner.website ? (
    <a
      href={partner.website}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`${cls} hover:border-[#7a8450]`}
    >
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Group({ title, items }: { title: string; items: Partner[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10 sm:mb-14">
      <div className="mb-4 flex items-center gap-4 sm:mb-6">
        <h2 className="shrink-0 text-[11px] uppercase tracking-[.22em] text-[#626b3f]">
          {title} · {items.length}
        </h2>
        <span className="h-px flex-1 bg-[rgba(32,30,29,.14)]" />
      </div>
      <div className="grid gap-3 sm:gap-5 md:grid-cols-2">
        {items.map((p) => (
          <PartnerCard key={p.id} partner={p} />
        ))}
      </div>
    </section>
  );
}

export default async function KemitraanPage() {
  const partners = await getPartners();
  const mitra = partners.filter((p) => p.type !== "sponsor");
  const sponsor = partners.filter((p) => p.type === "sponsor");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <header className="mb-8 max-w-2xl sm:mb-12">
        <p className="mb-2 text-[11px] uppercase tracking-[.22em] text-[#626b3f]">
          Mitra &amp; Sponsor
        </p>
        <h1 className="text-[28px] font-bold leading-tight text-[#201e1d] sm:text-4xl">
          Kemitraan
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#605d5d] sm:text-lg">
          Instansi, organisasi, dan pelaku usaha yang bekerja sama dengan HMTL UNTAN
          dalam program lingkungan, kegiatan mahasiswa, dan pengembangan anggota.
        </p>
      </header>

      {partners.length === 0 ? (
        <p className="mb-10 rounded-sm border border-dashed border-[rgba(32,30,29,.3)] p-6 text-sm leading-relaxed text-[#605d5d] sm:mb-14 sm:p-8">
          Daftar mitra dan sponsor sedang diperbarui. Untuk menjajaki kerja sama,
          hubungi kami melalui kontak di bawah.
        </p>
      ) : (
        <>
          <Group title="Mitra" items={mitra} />
          <Group title="Sponsor" items={sponsor} />
        </>
      )}

      <section className="rounded-sm bg-[#201e1d] px-5 py-8 text-white sm:px-10 sm:py-12">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold leading-snug sm:text-2xl">
            Tertarik bermitra dengan HMTL UNTAN?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-base">
            Kami terbuka untuk sponsorship acara, kolaborasi program lingkungan,
            pengabdian masyarakat, dan publikasi bersama. Kirim proposal atau
            ajukan pertemuan melalui email maupun WhatsApp.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={`mailto:${SITE.email}?subject=${encodeURIComponent("Pengajuan Kerja Sama — HMTL UNTAN")}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[#ffd985] px-5 text-sm font-semibold text-[#201e1d] transition-colors hover:bg-white [overflow-wrap:anywhere]"
            >
              <Mail className="h-4 w-4 shrink-0" />
              Kirim email
            </a>
            <a
              href={waLink("Halo HMTL UNTAN, saya ingin menjajaki kerja sama.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#201e1d]"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              WhatsApp {SITE.whatsappLabel}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
