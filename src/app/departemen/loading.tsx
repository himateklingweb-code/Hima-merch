import Loader from "@/components/Loader";

export default function Loading() {
  return (
    <Loader
      label="Memuat departemen"
      hint="Mengambil struktur kepengurusan periode aktif."
    />
  );
}
