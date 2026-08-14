"use client";

import { products, getProductBadge, formatPrice } from "@/data/products";
import { Plus, Pencil, Eye } from "lucide-react";
import Link from "next/link";

export default function AdminProdukPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola merchandise HIMA TL UNTAN</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          Tambah Produk
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Produk</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Tipe</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Harga</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Stok/Kuota</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => {
                const badge = getProductBadge(product);
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">/{product.slug}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          product.stock_type === "pre_order"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {product.stock_type === "pre_order" ? "Pre-Order" : "Ready Stock"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{formatPrice(product.price)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {product.stock_type === "ready_stock"
                        ? `${product.stock - product.stock_reserved} / ${product.stock}`
                        : `${(product.po_filled ?? 0) + (product.po_reserved ?? 0)} / ${product.po_quota}`}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          badge.color === "green"
                            ? "bg-green-100 text-green-700"
                            : badge.color === "yellow"
                            ? "bg-yellow-100 text-yellow-700"
                            : badge.color === "red"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {badge.emoji} {badge.color === "green" ? "Tersedia" : badge.color === "yellow" ? "PO Dibuka" : badge.color === "red" ? "PO Ditutup" : "Habis"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/merchandise/${product.slug}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
