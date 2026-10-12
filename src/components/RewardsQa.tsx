"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getRewardSkus,
  getUserRewardRedemptions,
  redeemRewardSku,
  type RewardRedemption,
  type RewardSku,
} from "@/lib/api";

interface RewardsQaProps {
  selectedUserId: string;
  onDataUpdate?: () => Promise<void>;
}

function statusHint(status: number): string {
  if (status === 200) return "redeemed + url + hp/hp_before";
  if (status === 202) return "pending_t1 (no url)";
  if (status === 409) return "in_flight";
  if (status === 503) return "store_closed";
  if (status === 400) return "insufficient_vp | out_of_stock | not_live";
  return "";
}

export default function RewardsQa({
  selectedUserId,
  onDataUpdate,
}: RewardsQaProps) {
  const [skus, setSkus] = useState<RewardSku[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [backendUrl, setBackendUrl] = useState("");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRedeem, setLastRedeem] = useState<{
    status: number;
    body: unknown;
    at: string;
  } | null>(null);

  const loadCatalog = useCallback(async () => {
    const data = await getRewardSkus();
    setBackendUrl(data.backendUrl);
    setSkus(data.skus);
    setSelectedSkuId((current) => {
      if (current && data.skus.some((sku) => sku.id === current)) return current;
      return data.skus.length === 1 ? data.skus[0].id : "";
    });
  }, []);

  const loadRedemptions = useCallback(async () => {
    if (!selectedUserId) {
      setRedemptions([]);
      return;
    }
    const data = await getUserRewardRedemptions(selectedUserId);
    setBackendUrl(data.backendUrl);
    setRedemptions(data.redemptions);
  }, [selectedUserId]);

  const inspect = useCallback(async () => {
    setLoadingKey("inspect");
    setError(null);
    try {
      await Promise.all([loadCatalog(), loadRedemptions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingKey(null);
    }
  }, [loadCatalog, loadRedemptions]);

  useEffect(() => {
    void inspect();
  }, [inspect]);

  const handleRedeem = async () => {
    if (!selectedUserId || !selectedSkuId) return;
    setLoadingKey("redeem");
    setError(null);
    try {
      const { status, body } = await redeemRewardSku(
        selectedUserId,
        selectedSkuId,
      );
      setLastRedeem({
        status,
        body,
        at: new Date().toISOString(),
      });
      await loadRedemptions();
      await loadCatalog();
      if (onDataUpdate) await onDataUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingKey(null);
    }
  };

  const busy = loadingKey !== null;
  const redeemDisabled = busy || !selectedUserId || !selectedSkuId;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Rewards QA</h2>
        <div className="text-sm text-gray-600">
          {backendUrl || "local backend"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800">
              Selected user JWT path
            </div>
            <div className="text-xs text-blue-600 mt-1 break-all">
              POST /functions/v1/redeem_reward · {selectedUserId}
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            SKU (read-only catalog)
            <select
              className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
              value={selectedSkuId}
              onChange={(e) => setSelectedSkuId(e.target.value)}
              disabled={busy || skus.length === 0}
            >
              <option value="">
                {skus.length === 0 ? "No live/paused SKUs" : "Select SKU"}
              </option>
              {skus.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.name}
                  {sku.vp_cost != null ? ` · ${sku.vp_cost} VP` : ""}
                  {` · ${sku.status}`}
                  {` · unused ${sku.unused_count}`}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void inspect()}
              disabled={busy || !selectedUserId}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                busy || !selectedUserId
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-slate-700 text-white hover:bg-slate-800"
              }`}
            >
              {loadingKey === "inspect" ? "Inspecting..." : "Inspect redemptions"}
            </button>
            <button
              type="button"
              onClick={() => void handleRedeem()}
              disabled={redeemDisabled}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                redeemDisabled
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-emerald-700 text-white hover:bg-emerald-800"
              }`}
            >
              {loadingKey === "redeem" ? "Redeeming..." : "Redeem selected SKU"}
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {lastRedeem && (
            <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Redeem status:</span>{" "}
                {lastRedeem.status}
                {statusHint(lastRedeem.status)
                  ? ` — ${statusHint(lastRedeem.status)}`
                  : ""}
              </div>
              <div className="text-xs text-gray-500">{lastRedeem.at}</div>
              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                {JSON.stringify(lastRedeem.body, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            loyalty.reward_redemptions (in-flight + redeemed)
          </h3>
          <p className="text-xs text-gray-500">
            Super/service sees full url. This dashboard queries with
            service_role.
          </p>
          <div className="overflow-x-auto border rounded-lg">
            {redemptions.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 italic">
                No locked, pending_t1, or redeemed rows
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">SKU</th>
                    <th className="text-left px-3 py-2">VP</th>
                    <th className="text-left px-3 py-2">URL</th>
                    <th className="text-left px-3 py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {row.status}
                        {row.needs_attention ? " · attn" : ""}
                      </td>
                      <td className="px-3 py-2">{row.reward_name}</td>
                      <td className="px-3 py-2">{row.vp_cost}</td>
                      <td className="px-3 py-2 break-all max-w-[220px]">
                        {row.url_visible ? row.url || "—" : "••••"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.redeemed_at || row.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
