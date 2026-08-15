import {
  Star,
  Home,
  Globe,
  Briefcase,
  GraduationCap,
  Wrench,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export interface DepartmentMember {
  id: string;
  name: string;
  position: string;
  photo: string;
  contact?: string;
  order_index: number;
}

export interface DepartmentPeriod {
  id: string;
  department_id: string;
  period_label: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  members: DepartmentMember[];
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: LucideIcon;
  periods: DepartmentPeriod[];
}

export const departments: Department[] = [
  {
    id: "dept-bph",
    name: "Badan Pengurus Harian",
    slug: "bph",
    description:
      "Badan Pengurus Harian (BPH) merupakan pengurus inti HIMA TL UNTAN yang terdiri dari Ketua, Sekretaris, dan Bendahara. BPH bertanggung jawab atas koordinasi seluruh kegiatan organisasi dan pengambilan keputusan strategis.",
    icon: Star,
    periods: [
      {
        id: "period-bph-1",
        department_id: "dept-bph",
        period_label: "2025/2026",
        is_active: true,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        members: [
          { id: "bph1", name: "Ketua HIMA", position: "Ketua", photo: "/placeholder-avatar.png", order_index: 1 },
          { id: "bph2", name: "Sekretaris HIMA", position: "Sekretaris", photo: "/placeholder-avatar.png", order_index: 2 },
          { id: "bph3", name: "Bendahara HIMA", position: "Bendahara", photo: "/placeholder-avatar.png", order_index: 3 },
        ],
      },
    ],
  },
  {
    id: "dept-1",
    name: "Dalam Negeri",
    slug: "dagri",
    description:
      "Departemen Dalam Negeri bertanggung jawab dalam mengelola hubungan internal organisasi, membangun solidaritas antar anggota, serta menyelenggarakan kegiatan yang mempererat kebersamaan mahasiswa Teknik Lingkungan UNTAN.",
    icon: Home,
    periods: [
      {
        id: "period-1",
        department_id: "dept-1",
        period_label: "2025/2026",
        is_active: true,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        members: [
          { id: "m1", name: "Ahmad Rizki", position: "Ketua Departemen", photo: "/placeholder-avatar.png", order_index: 1 },
          { id: "m2", name: "Siti Nurhaliza", position: "Wakil Ketua", photo: "/placeholder-avatar.png", order_index: 2 },
          { id: "m3", name: "Budi Santoso", position: "Staff", photo: "/placeholder-avatar.png", order_index: 3 },
          { id: "m4", name: "Dewi Lestari", position: "Staff", photo: "/placeholder-avatar.png", order_index: 4 },
        ],
      },
      {
        id: "period-2",
        department_id: "dept-1",
        period_label: "2024/2025",
        is_active: false,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        members: [
          { id: "m5", name: "Rudi Hartono", position: "Ketua Departemen", photo: "/placeholder-avatar.png", order_index: 1 },
          { id: "m6", name: "Ani Wijaya", position: "Wakil Ketua", photo: "/placeholder-avatar.png", order_index: 2 },
        ],
      },
    ],
  },
  {
    id: "dept-2",
    name: "Luar Negeri",
    slug: "lugri",
    description:
      "Departemen Luar Negeri bertugas menjalin dan memperkuat hubungan eksternal HIMA TL UNTAN dengan organisasi mahasiswa lain, instansi pemerintah, serta pihak-pihak terkait di luar kampus.",
    icon: Globe,
    periods: [
      {
        id: "period-3",
        department_id: "dept-2",
        period_label: "2025/2026",
        is_active: true,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        members: [
          { id: "m7", name: "Fajar Nugraha", position: "Ketua Departemen", photo: "/placeholder-avatar.png", order_index: 1 },
          { id: "m8", name: "Maya Putri", position: "Wakil Ketua", photo: "/placeholder-avatar.png", order_index: 2 },
          { id: "m9", name: "Rizal Firmansyah", position: "Staff", photo: "/placeholder-avatar.png", order_index: 3 },
        ],
      },
    ],
  },
  {
    id: "dept-3",
    name: "Kewirausahaan",
    slug: "kwu",
    description:
      "Departemen Kewirausahaan mengelola kegiatan wirausaha HIMA TL UNTAN, termasuk merchandise resmi, bazar, dan program pengembangan jiwa kewirausahaan mahasiswa.",
    icon: Briefcase,
    periods: [
      {
        id: "period-4",
        department_id: "dept-3",
        period_label: "2025/2026",
        is_active: true,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        members: [
          { id: "m10", name: "Dian Permata", position: "Ketua Departemen", photo: "/placeholder-avatar.png", order_index: 1 },
          { id: "m11", name: "Eko Prasetyo", position: "Wakil Ketua", photo: "/placeholder-avatar.png", order_index: 2 },
          { id: "m12", name: "Fitri Handayani", position: "Staff", photo: "/placeholder-avatar.png", order_index: 3 },
          { id: "m13", name: "Gilang Ramadhan", position: "Staff", photo: "/placeholder-avatar.png", order_index: 4 },
        ],
      },
    ],
  },
  {
    id: "dept-4",
    name: "Pendidikan",
    slug: "depdik",
    description:
      "Departemen Pendidikan fokus pada peningkatan kualitas akademik mahasiswa melalui tutorial, seminar, workshop, dan kegiatan ilmiah lainnya.",
    icon: GraduationCap,
    periods: [
      {
        id: "period-5",
        department_id: "dept-4",
        period_label: "2025/2026",
        is_active: true,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        members: [
          { id: "m14", name: "Hana Safira", position: "Ketua Departemen", photo: "/placeholder-avatar.png", order_index: 1 },
          { id: "m15", name: "Irfan Maulana", position: "Wakil Ketua", photo: "/placeholder-avatar.png", order_index: 2 },
        ],
      },
    ],
  },
  {
    id: "dept-5",
    name: "Rumah Tangga",
    slug: "rumah-tangga",
    description:
      "Departemen Rumah Tangga bertanggung jawab atas logistik, inventaris, dan kebutuhan operasional organisasi sehari-hari.",
    icon: Wrench,
    periods: [
      {
        id: "period-6",
        department_id: "dept-5",
        period_label: "2025/2026",
        is_active: true,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        members: [
          { id: "m16", name: "Joko Widodo", position: "Ketua Departemen", photo: "/placeholder-avatar.png", order_index: 1 },
          { id: "m17", name: "Kartika Sari", position: "Staff", photo: "/placeholder-avatar.png", order_index: 2 },
        ],
      },
    ],
  },
  {
    id: "dept-6",
    name: "Kominfo",
    slug: "kominfo",
    description:
      "Departemen Komunikasi dan Informasi mengelola media sosial, website, dokumentasi kegiatan, dan seluruh publikasi informasi HIMA TL UNTAN kepada publik.",
    icon: Megaphone,
    periods: [
      {
        id: "period-7",
        department_id: "dept-6",
        period_label: "2025/2026",
        is_active: true,
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        members: [
          { id: "m18", name: "Lina Marlina", position: "Ketua Departemen", photo: "/placeholder-avatar.png", order_index: 1 },
          { id: "m19", name: "Muhammad Aldi", position: "Wakil Ketua", photo: "/placeholder-avatar.png", order_index: 2 },
          { id: "m20", name: "Nadia Putri", position: "Staff", photo: "/placeholder-avatar.png", order_index: 3 },
        ],
      },
    ],
  },
];
