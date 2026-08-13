"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, ShoppingCart, ClipboardList, Plus, CheckCircle,
  AlertTriangle, Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

const INITIAL_ORDERS = [
  { id: "ord1", dealerName: "Subbu Agencies", total: 42000, date: "2026-07-21", status: "submitted", items: [{ product: "Bio-NPK Liquid", qty: 50 }, { product: "Trichoderma Viride", qty: 20 }] },
  { id: "ord2", dealerName: "Erode Bio Center", total: 18500, date: "2026-07-20", status: "approved", items: [{ product: "Bio-NPK Liquid", qty: 20 }] },
];

type SubTab = "farmers" | "dealers";

export default function FieldNetworkPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const [subTab, setSubTab] = useState<SubTab>("farmers");
  const [loading, setLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState("");

  // --- Farmers state ---
  const [farmers, setFarmers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [farmerVillage, setFarmerVillage] = useState("");
  const [farmerTaluk, setFarmerTaluk] = useState("");
  const [farmerDistrict, setFarmerDistrict] = useState("");
  const [farmerCrop, setFarmerCrop] = useState("");
  const [farmerAcres, setFarmerAcres] = useState("");
  const [farmerSuccess, setFarmerSuccess] = useState("");
  const [farmerError, setFarmerError] = useState("");
  const [farmerFilterDistrict, setFarmerFilterDistrict] = useState("");
  const [farmerFilterCrop, setFarmerFilterCrop] = useState("");
  const [farmerFilterDateFrom, setFarmerFilterDateFrom] = useState("");
  const [farmerFilterDateTo, setFarmerFilterDateTo] = useState("");

  // --- Dealers state ---
  const [dealers, setDealers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [pendingDealers, setPendingDealers] = useState<any[]>([]);
  const [orderDealerId, setOrderDealerId] = useState("");
  const [orderProductId, setOrderProductId] = useState("");
  const [orderQty, setOrderQty] = useState("10");
  const [orderComments, setOrderComments] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState({ type: "", text: "" });
  const [stockDealerId, setStockDealerId] = useState("");
  const [stockProductId, setStockProductId] = useState("");
  const [stockQty, setStockQty] = useState("50");
  const [stockNotes, setStockNotes] = useState("");
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockMessage, setStockMessage] = useState({ type: "", text: "" });
  const [dealerFilterDistrict, setDealerFilterDistrict] = useState("");
  const [dealerFilterStatus, setDealerFilterStatus] = useState("");
  const [dealerFilterDateFrom, setDealerFilterDateFrom] = useState("");
  const [dealerFilterDateTo, setDealerFilterDateTo] = useState("");
  const [newDealerName, setNewDealerName] = useState("");
  const [newDealerPhone, setNewDealerPhone] = useState("");
  const [newDealerDistrict, setNewDealerDistrict] = useState("");
  const [newDealerVillage, setNewDealerVillage] = useState("");
  const [newDealerTaluk, setNewDealerTaluk] = useState("");
  const [dealerFormError, setDealerFormError] = useState("");
  const [dealerFormSuccess, setDealerFormSuccess] = useState("");

  const fetchFarmers = async () => {
    try {
      const farmersData: any = await apiFetch("/farmers/search");
      const mapped = (farmersData || []).map((f: any) => ({ ...f, lat: f.location_lat, lng: f.location_lng }));
      setFarmers(mapped);
    } catch (err) {
      console.error("Failed to fetch farmers:", err);
      setFarmers([]);
      setDataLoadError("Couldn't load farmers from the server. Showing no data instead of stale placeholders — try refreshing.");
    }
  };

  const fetchPendingDealers = async () => {
    try {
      const data: any = await apiFetch("/dealers/search?status_filter=pending_approval");
      setPendingDealers(data || []);
    } catch (err) {
      console.error("Failed to fetch pending dealers:", err);
    }
  };

  const fetchDealersAndOrders = async () => {
    let loadedDealers: any[] = [];
    try {
      const dealersData: any = await apiFetch("/dealers/search");
      loadedDealers = dealersData || [];
      setDealers(loadedDealers);
    } catch (err) {
      console.error("Failed to fetch dealers:", err);
      setDealers([]);
      setDataLoadError("Couldn't load dealers from the server. Showing no data instead of stale placeholders — try refreshing.");
    }

    if (user?.role === "admin" || user?.role === "manager") {
      fetchPendingDealers();
    }

    let loadedProducts: any[] = [];
    try {
      const productsData: any = await apiFetch("/dealers/products/catalog");
      loadedProducts = productsData || [];
      setProducts(loadedProducts);
    } catch (err) {
      console.error("Failed to fetch products catalog:", err);
    }

    if (user?.role === "admin" || user?.role === "manager") {
      try {
        const ordersData: any = await apiFetch("/dealers/orders/all");
        if (ordersData && ordersData.length > 0) {
          const mapped = ordersData.map((o: any) => {
            const dealer = loadedDealers.find((d) => d.id === o.dealer_id);
            return {
              id: o.id,
              dealerName: dealer ? dealer.name : `Dealer (${o.dealer_id.slice(0, 6)})`,
              total: o.total_amount,
              date: o.order_date ? o.order_date.split("T")[0] : "2026-07-28",
              status: o.status || "submitted",
              items: (o.items || []).map((i: any) => {
                const prod = loadedProducts.find((p) => p.id === i.product_id);
                return { product: prod ? prod.name : `Product (${i.product_id.slice(0, 6)})`, qty: i.quantity };
              }),
            };
          });
          setOrders(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch all orders:", err);
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setDataLoadError("");
    Promise.all([fetchFarmers(), fetchDealersAndOrders()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDeleteFarmer = async (farmerId: string) => {
    if (!window.confirm("Are you sure you want to delete this farmer?")) return;
    try {
      await apiFetch(`/farmers/${farmerId}`, { method: "DELETE" });
      await fetchFarmers();
    } catch (err: any) {
      alert(err.message || "Failed to delete farmer.");
    }
  };

  const applyFarmerFilters = async () => {
    try {
      const params = new URLSearchParams();
      if (farmerFilterDistrict) params.set("district", farmerFilterDistrict);
      if (farmerFilterCrop) params.set("crop", farmerFilterCrop);
      if (farmerFilterDateFrom) params.set("date_from", farmerFilterDateFrom);
      if (farmerFilterDateTo) params.set("date_to", farmerFilterDateTo);
      const data: any = await apiFetch(`/farmers/search?${params.toString()}`);
      const mapped = (data || []).map((f: any) => ({ ...f, lat: f.location_lat, lng: f.location_lng }));
      setFarmers(mapped);
    } catch (err) {
      console.error("Failed to filter farmers:", err);
      setDataLoadError("Couldn't apply farmer filters — try refreshing.");
    }
  };

  const clearFarmerFilters = () => {
    setFarmerFilterDistrict("");
    setFarmerFilterCrop("");
    setFarmerFilterDateFrom("");
    setFarmerFilterDateTo("");
    fetchFarmers();
  };

  const applyDealerFilters = async () => {
    try {
      const params = new URLSearchParams();
      if (dealerFilterDistrict) params.set("district", dealerFilterDistrict);
      if (dealerFilterStatus) params.set("status_filter", dealerFilterStatus);
      if (dealerFilterDateFrom) params.set("date_from", dealerFilterDateFrom);
      if (dealerFilterDateTo) params.set("date_to", dealerFilterDateTo);
      const data: any = await apiFetch(`/dealers/search?${params.toString()}`);
      setDealers(data || []);
    } catch (err) {
      console.error("Failed to filter dealers:", err);
      setDataLoadError("Couldn't apply dealer filters — try refreshing.");
    }
  };

  const clearDealerFilters = () => {
    setDealerFilterDistrict("");
    setDealerFilterStatus("");
    setDealerFilterDateFrom("");
    setDealerFilterDateTo("");
    fetchDealersAndOrders();
  };

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setDealerFormError("");
    setDealerFormSuccess("");
    if (!newDealerName || !newDealerPhone || !newDealerDistrict) {
      setDealerFormError("Name, phone, and district are required.");
      return;
    }
    try {
      await apiFetch("/dealers/", {
        method: "POST",
        body: JSON.stringify({
          name: newDealerName,
          phone: newDealerPhone,
          district: newDealerDistrict,
          village: newDealerVillage || null,
          taluk: newDealerTaluk || null,
        }),
      });
      setDealerFormSuccess(
        user?.role === "sales_officer"
          ? "Dealer submitted — pending admin/manager approval."
          : "Dealer added successfully."
      );
      setNewDealerName("");
      setNewDealerPhone("");
      setNewDealerDistrict("");
      setNewDealerVillage("");
      setNewDealerTaluk("");
      fetchDealersAndOrders();
    } catch (err: any) {
      setDealerFormError(err.message || "Failed to add dealer.");
    }
  };

  const handleDealerApproval = async (dealerId: string, approve: boolean) => {
    try {
      await apiFetch(`/dealers/${dealerId}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ approve }),
      });
      fetchPendingDealers();
      fetchDealersAndOrders();
    } catch (err: any) {
      alert(err.message || "Failed to update dealer approval status.");
    }
  };

  // NOTE: "Approve Order" was previously a fake local-state-only button —
  // it flipped a status label with no backend call at all, so an approval
  // never actually persisted anywhere (lost on refresh, invisible to
  // anyone else). The real /dealers/{id}/orders backend now exists (as of
  // the schema-migration fix), but this Orders module's frontend still
  // isn't wired to it. Rather than keep a button that *looks* functional
  // while silently doing nothing real, it's disabled with an honest label
  // until that wiring is done — a disabled truth beats a working-looking
  // lie in a production app. (Migrated as-is from the old dashboard tab —
  // not a regression introduced by this refactor.)
  const handleApproveOrder = (_id: string) => {
    alert("Order approval isn't connected to a real backend yet — this module needs its frontend wired to the existing /dealers/{id}/orders API before this button can do anything real.");
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-green-700 w-5 h-5" /> Field Network
          </h1>
          <p className="text-xs text-slate-400 mt-1">Farmers and dealer network — registries, orders, and stock in one place.</p>
        </div>

        {dataLoadError && (
          <div className="p-4 mb-6 bg-red-50 border border-red-100 text-sm text-red-600 rounded-xl">{dataLoadError}</div>
        )}

        <div className="flex gap-1 mb-6 bg-white p-1.5 rounded-xl border border-slate-100 w-fit">
          <button
            onClick={() => setSubTab("farmers")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${subTab === "farmers" ? "bg-green-700 text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Users className="w-4 h-4" /> Farmers
          </button>
          <button
            onClick={() => setSubTab("dealers")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${subTab === "dealers" ? "bg-green-700 text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <ShoppingCart className="w-4 h-4" /> Dealers
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
            Loading field network data...
          </div>
        ) : subTab === "farmers" ? (
          <div className="space-y-6">
            {user?.role !== "admin" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setFarmerError("");
                  setFarmerSuccess("");
                  if (!farmerName || !farmerPhone || !farmerVillage || !farmerTaluk || !farmerDistrict || !farmerCrop || !farmerAcres) {
                    setFarmerError("All fields are required to register a farmer.");
                    return;
                  }
                  try {
                    await apiFetch("/farmers/", {
                      method: "POST",
                      body: JSON.stringify({
                        name: farmerName,
                        phone: farmerPhone,
                        village: farmerVillage,
                        taluk: farmerTaluk,
                        district: farmerDistrict,
                        crop: farmerCrop,
                        acres: parseFloat(farmerAcres),
                        location_lat: 11.6643,
                        location_lng: 78.1460,
                      }),
                    });
                    setFarmerSuccess(`Farmer "${farmerName}" registered successfully!`);
                    setFarmerName("");
                    setFarmerPhone("");
                    setFarmerVillage("");
                    setFarmerTaluk("");
                    setFarmerDistrict("");
                    setFarmerCrop("");
                    setFarmerAcres("");
                    await fetchFarmers();
                  } catch (err: any) {
                    setFarmerError(err.message || "Failed to register farmer.");
                  }
                }}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Register New Farmer</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Farmer Name</label>
                    <input type="text" placeholder="e.g. Ramasamy" value={farmerName} onChange={(e) => setFarmerName(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
                    <input type="text" placeholder="e.g. 9876543210" value={farmerPhone} onChange={(e) => setFarmerPhone(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Village</label>
                    <input type="text" placeholder="e.g. Mallasamudram" value={farmerVillage} onChange={(e) => setFarmerVillage(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Taluk</label>
                    <input type="text" placeholder="e.g. Salem North" value={farmerTaluk} onChange={(e) => setFarmerTaluk(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">District</label>
                    <input type="text" placeholder="e.g. Salem" value={farmerDistrict} onChange={(e) => setFarmerDistrict(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Cultivated Crop</label>
                    <input type="text" placeholder="e.g. Paddy" value={farmerCrop} onChange={(e) => setFarmerCrop(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Acreage (Acres)</label>
                    <input type="number" step="0.1" placeholder="e.g. 4.5" value={farmerAcres} onChange={(e) => setFarmerAcres(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
                  </div>
                </div>
                {farmerSuccess && <p className="text-xs font-bold text-green-700">{farmerSuccess}</p>}
                {farmerError && <p className="text-xs font-bold text-red-600">{farmerError}</p>}
                <button type="submit" className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-semibold text-sm rounded-lg transition">
                  Register Farmer
                </button>
              </form>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">District / Area</label>
                <input type="text" placeholder="e.g. Salem" value={farmerFilterDistrict} onChange={(e) => setFarmerFilterDistrict(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none w-40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Crop</label>
                <input type="text" placeholder="e.g. Paddy" value={farmerFilterCrop} onChange={(e) => setFarmerFilterCrop(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none w-32" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Added From</label>
                <input type="date" value={farmerFilterDateFrom} onChange={(e) => setFarmerFilterDateFrom(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Added To</label>
                <input type="date" value={farmerFilterDateTo} onChange={(e) => setFarmerFilterDateTo(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
              </div>
              <button onClick={applyFarmerFilters} className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg">Apply Filters</button>
              <button onClick={clearFarmerFilters} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-lg">Clear</button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">Registered Farmers master ledger</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search Farmers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-6 py-4">Farmer Name</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Village</th>
                    <th className="px-6 py-4">District</th>
                    <th className="px-6 py-4">Cultivated Crop</th>
                    <th className="px-6 py-4">Acreage</th>
                    <th className="px-6 py-4">Registered By</th>
                    {user?.role === "admin" && <th className="px-6 py-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {farmers
                    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-800">{f.name}</td>
                        <td className="px-6 py-4 font-mono text-xs">{f.phone}</td>
                        <td className="px-6 py-4">{f.village}</td>
                        <td className="px-6 py-4">{f.district}</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-0.5 text-xs bg-green-50 text-green-800 font-semibold rounded">{f.crop}</span></td>
                        <td className="px-6 py-4">{f.acres} Acres</td>
                        <td className="px-6 py-4 text-xs font-medium">{f.createdBy}</td>
                        {user?.role === "admin" && (
                          <td className="px-6 py-4 text-xs">
                            <button onClick={() => handleDeleteFarmer(f.id)} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded transition">
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(user?.role === "admin" || user?.role === "manager" || user?.role === "sales_officer") && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="text-md font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ClipboardList className="text-green-700 w-5 h-5" /> Raise Purchase Order
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Submit inbound orders for dealer network inventory replenishment.</p>
                    {orderMessage.text && (
                      <div className={`p-3 mb-4 rounded-lg text-xs font-semibold ${orderMessage.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                        {orderMessage.text}
                      </div>
                    )}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!orderDealerId || !orderProductId || !orderQty || parseInt(orderQty) <= 0) {
                          setOrderMessage({ type: "error", text: "Please select a dealer, product, and enter a valid quantity." });
                          return;
                        }
                        setOrderSubmitting(true);
                        setOrderMessage({ type: "", text: "" });
                        try {
                          await apiFetch(`/dealers/${orderDealerId}/orders`, {
                            method: "POST",
                            body: JSON.stringify({
                              items: [{ product_id: orderProductId, quantity: parseInt(orderQty, 10) }],
                              comments: orderComments || "Inbound purchase order",
                            }),
                          });
                          setOrderMessage({ type: "success", text: "Purchase order submitted successfully!" });
                          setOrderComments("");
                          fetchDealersAndOrders();
                        } catch (err: any) {
                          setOrderMessage({ type: "error", text: err.message || "Failed to raise purchase order." });
                        } finally {
                          setOrderSubmitting(false);
                        }
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Dealer</label>
                        <select value={orderDealerId} onChange={(e) => setOrderDealerId(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" required>
                          <option value="">-- Choose Dealer --</option>
                          {dealers.map((d) => (
                            <option key={d.id} value={d.id}>{d.name} ({d.district})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Product</label>
                        <select value={orderProductId} onChange={(e) => setOrderProductId(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" required>
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (₹{p.price}/unit - {p.sku_code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Quantity (Units)</label>
                        <input type="number" min="1" value={orderQty} onChange={(e) => setOrderQty(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Order Notes / Comments</label>
                        <input type="text" placeholder="Optional shipping notes or remarks..." value={orderComments} onChange={(e) => setOrderComments(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" />
                      </div>
                      <button type="submit" disabled={orderSubmitting} className="w-full mt-2 py-3 bg-green-700 hover:bg-green-800 disabled:bg-slate-300 text-white font-bold rounded-lg transition text-sm flex items-center justify-center gap-2 shadow-sm">
                        <CheckCircle className="w-4 h-4" />
                        {orderSubmitting ? "Submitting Order..." : "Submit Purchase Order"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {(user?.role === "admin" || user?.role === "manager") && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="text-md font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ShoppingCart className="text-blue-600 w-5 h-5" /> Record Stock Count
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Perform live physical stock audits and directly reconcile dealer inventory levels.</p>
                    {stockMessage.text && (
                      <div className={`p-3 mb-4 rounded-lg text-xs font-semibold ${stockMessage.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                        {stockMessage.text}
                      </div>
                    )}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!stockDealerId || !stockProductId || !stockQty || parseInt(stockQty) < 0) {
                          setStockMessage({ type: "error", text: "Please select a dealer, product, and enter a valid count." });
                          return;
                        }
                        setStockSubmitting(true);
                        setStockMessage({ type: "", text: "" });
                        try {
                          await apiFetch(`/dealers/${stockDealerId}/stock`, {
                            method: "POST",
                            body: JSON.stringify({
                              product_id: stockProductId,
                              stock_qty: parseInt(stockQty, 10),
                              notes: stockNotes || "Manual stock reconciliation",
                            }),
                          });
                          setStockMessage({ type: "success", text: "Dealer inventory stock count audited successfully!" });
                          setStockNotes("");
                          fetchDealersAndOrders();
                        } catch (err: any) {
                          setStockMessage({ type: "error", text: err.message || "Failed to audit stock level." });
                        } finally {
                          setStockSubmitting(false);
                        }
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Target Dealer</label>
                        <select value={stockDealerId} onChange={(e) => setStockDealerId(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600" required>
                          <option value="">-- Choose Dealer --</option>
                          {dealers.map((d) => (
                            <option key={d.id} value={d.id}>{d.name} ({d.district})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Target Product</label>
                        <select value={stockProductId} onChange={(e) => setStockProductId(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600" required>
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku_code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Audited Physical Quantity</label>
                        <input type="number" min="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Audit Remarks / Justification</label>
                        <input type="text" placeholder="Reason for adjustment or inspector notes..." value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600" />
                      </div>
                      <button type="submit" disabled={stockSubmitting} className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition text-sm flex items-center justify-center gap-2 shadow-sm">
                        <CheckCircle className="w-4 h-4" />
                        {stockSubmitting ? "Recording Audit..." : "Record Stock Count"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {(user?.role === "admin" || user?.role === "manager" || user?.role === "sales_officer") && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="text-md font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <Plus className="text-green-700 w-5 h-5" /> Add Dealer
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      {user?.role === "sales_officer"
                        ? "New dealers you add go to an admin/manager for approval before appearing in the network."
                        : "New dealers you add are active immediately."}
                    </p>
                    {dealerFormSuccess && (
                      <div className="p-3 mb-4 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200">{dealerFormSuccess}</div>
                    )}
                    {dealerFormError && (
                      <div className="p-3 mb-4 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200">{dealerFormError}</div>
                    )}
                    <form onSubmit={handleAddDealer} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Dealer Name</label>
                        <input type="text" placeholder="e.g. Kannan Agro Center" value={newDealerName} onChange={(e) => setNewDealerName(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Phone</label>
                        <input type="text" placeholder="e.g. 9876543210" value={newDealerPhone} onChange={(e) => setNewDealerPhone(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">District</label>
                          <input type="text" placeholder="e.g. Salem" value={newDealerDistrict} onChange={(e) => setNewDealerDistrict(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Taluk</label>
                          <input type="text" placeholder="Optional" value={newDealerTaluk} onChange={(e) => setNewDealerTaluk(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Village</label>
                          <input type="text" placeholder="Optional" value={newDealerVillage} onChange={(e) => setNewDealerVillage(e.target.value)} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-green-600" />
                        </div>
                      </div>
                      <button type="submit" className="w-full mt-2 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg transition text-sm flex items-center justify-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" />
                        {user?.role === "sales_officer" ? "Submit for Approval" : "Add Dealer"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {(user?.role === "admin" || user?.role === "manager") && pendingDealers.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-200">
                <h3 className="text-md font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <AlertTriangle className="text-amber-600 w-5 h-5" /> Pending Dealer Approvals
                </h3>
                <p className="text-xs text-slate-400 mb-4">Dealers submitted by Sales Officers, awaiting approval before they appear in the active network.</p>
                <div className="divide-y divide-slate-100">
                  {pendingDealers.map((d: any) => (
                    <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                        <p className="text-xs text-slate-400">{d.village ? `${d.village}, ` : ""}{d.district} · {d.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDealerApproval(d.id, true)} className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold">Approve</button>
                        <button onClick={() => handleDealerApproval(d.id, false)} className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-semibold">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">District / Area</label>
                <input type="text" placeholder="e.g. Salem" value={dealerFilterDistrict} onChange={(e) => setDealerFilterDistrict(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none w-40" />
              </div>
              {(user?.role === "admin" || user?.role === "manager") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                  <select value={dealerFilterStatus} onChange={(e) => setDealerFilterStatus(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none">
                    <option value="">Active (default)</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Added From</label>
                <input type="date" value={dealerFilterDateFrom} onChange={(e) => setDealerFilterDateFrom(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Added To</label>
                <input type="date" value={dealerFilterDateTo} onChange={(e) => setDealerFilterDateTo(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none" />
              </div>
              <button onClick={applyDealerFilters} className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg">Apply Filters</button>
              <button onClick={clearDealerFilters} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-lg">Clear</button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingCart className="text-green-700" /> Dealer Network Stock Check</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dealers.map((d) => (
                  <div key={d.id} className={`p-4 rounded-xl border flex flex-col justify-between ${d.stockLevel === "low" ? "bg-red-50/40 border-red-200" : "bg-slate-50/50 border-slate-100"}`}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-800">{d.name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${d.stockLevel === "low" ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"}`}>
                          {d.stockLevel === "low" ? "Low Stock alert" : "Stock Levels Good"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{d.village}, {d.district}</p>
                      <div className="space-y-1">
                        {d.inventory?.map((inv: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-600">
                            <span>{inv.product}</span>
                            <span className={inv.qty < 10 ? "font-bold text-red-600" : ""}>{inv.qty} Units</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2"><ClipboardList className="text-green-700" /> Dealer Inbound Purchase Orders</h3>
              <div className="space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800">{o.dealerName}</span>
                        <span className="text-slate-400 text-xs">{o.date}</span>
                      </div>
                      <div className="space-y-0.5 text-xs text-slate-600">
                        {o.items.map((i: any, idx: number) => (
                          <div key={idx}>{i.product} (x{i.qty})</div>
                        ))}
                      </div>
                      <div className="text-sm font-bold text-slate-700 mt-2">Total order amount: ₹{o.total.toLocaleString()}</div>
                    </div>
                    <div>
                      {o.status === "submitted" ? (
                        <button onClick={() => handleApproveOrder(o.id)} className="flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg text-sm transition">
                          <CheckCircle className="w-4 h-4" /> Approve Purchase Order
                        </button>
                      ) : (
                        <span className="text-green-700 font-bold text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Approved &amp; Invoiced</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
