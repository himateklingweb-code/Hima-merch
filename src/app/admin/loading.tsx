import Loader from "@/components/Loader";

export default function Loading() {
  return (
    <Loader
      label="Memuat data"
      hint="Mengambil data dashboard dari basis data."
    />
  );
}
