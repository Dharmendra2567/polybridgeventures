import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  ArrowRightLeft,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Info,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  Calculator,
  Download,
  AlertCircle,
  Lock,
} from "lucide-react";
import {
  fetchGlobalCountriesList,
  MASTER_WORLD_COUNTRIES,
  GlobalCountryOption,
} from "../../data/worldCountries";
import { API_BASE } from "../../utils/apiConfig.js";

export interface MarketCountry {
  id: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  exchangeRateToUsd: number;
  usdPerUnit: number;
  isBaseCurrency: boolean;
  isActive: boolean;
  notes?: string;
  updatedAt: string;
}

export interface MatrixData {
  countries: Array<{
    id: string;
    countryCode: string;
    countryName: string;
    currencyCode: string;
    currencySymbol: string;
    exchangeRateToUsd: number;
  }>;
  matrix: Record<
    string,
    Record<string, { rate: number; isCustomOverride: boolean }>
  >;
}

// Static fallback countries list matching the 11 export markets + India
const FALLBACK_MARKETS: MarketCountry[] = [
  {
    id: "c-us",
    countryCode: "US",
    countryName: "United States",
    currencyCode: "USD",
    currencyName: "US Dollar",
    currencySymbol: "$",
    exchangeRateToUsd: 1.0,
    usdPerUnit: 1.0,
    isBaseCurrency: true,
    isActive: true,
    notes: "Corporate Base Currency & primary settlement benchmark.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-ae",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    currencyCode: "AED",
    currencyName: "UAE Dirham",
    currencySymbol: "AED",
    exchangeRateToUsd: 3.6725,
    usdPerUnit: 0.272294,
    isBaseCurrency: false,
    isActive: true,
    notes: "Major Middle East commodity trading & re-export hub.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-lk",
    countryCode: "LK",
    countryName: "Sri Lanka",
    currencyCode: "LKR",
    currencyName: "Sri Lankan Rupee",
    currencySymbol: "Rs",
    exchangeRateToUsd: 331.06,
    usdPerUnit: 0.003021,
    isBaseCurrency: false,
    isActive: true,
    notes: "South Asian export market for agro-commodities and bulk spices.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-jp",
    countryCode: "JP",
    countryName: "Japan",
    currencyCode: "JPY",
    currencyName: "Japanese Yen",
    currencySymbol: "¥",
    exchangeRateToUsd: 158.04,
    usdPerUnit: 0.006328,
    isBaseCurrency: false,
    isActive: true,
    notes: "East Asia premium quality food & organic spice destination.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-sa",
    countryCode: "SA",
    countryName: "Saudi Arabia",
    currencyCode: "SAR",
    currencyName: "Saudi Riyal",
    currencySymbol: "SAR",
    exchangeRateToUsd: 3.751,
    usdPerUnit: 0.266596,
    isBaseCurrency: false,
    isActive: true,
    notes: "GCC key trade partner with USD pegged exchange parity.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-om",
    countryCode: "OM",
    countryName: "Oman",
    currencyCode: "OMR",
    currencyName: "Omani Rial",
    currencySymbol: "OMR",
    exchangeRateToUsd: 0.385,
    usdPerUnit: 2.597403,
    isBaseCurrency: false,
    isActive: true,
    notes: "High-value Gulf currency with strict central bank USD peg.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-kw",
    countryCode: "KW",
    countryName: "Kuwait",
    currencyCode: "KWD",
    currencyName: "Kuwaiti Dinar",
    currencySymbol: "KWD",
    exchangeRateToUsd: 0.311,
    usdPerUnit: 3.215434,
    isBaseCurrency: false,
    isActive: true,
    notes: "Highest valued currency worldwide; key trading partner.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-cl",
    countryCode: "CL",
    countryName: "Chile",
    currencyCode: "CLP",
    currencyName: "Chilean Peso",
    currencySymbol: "CLP$",
    exchangeRateToUsd: 981.76,
    usdPerUnit: 0.001019,
    isBaseCurrency: false,
    isActive: true,
    notes: "Latin American trade hub for agricultural counter-flows.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-ca",
    countryCode: "CA",
    countryName: "Canada",
    currencyCode: "CAD",
    currencyName: "Canadian Dollar",
    currencySymbol: "CA$",
    exchangeRateToUsd: 1.422,
    usdPerUnit: 0.703235,
    isBaseCurrency: false,
    isActive: true,
    notes: "North American market for pulses, specialty grains, and spices.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-br",
    countryCode: "BR",
    countryName: "Brazil",
    currencyCode: "BRL",
    currencyName: "Brazilian Real",
    currencySymbol: "R$",
    exchangeRateToUsd: 5.092,
    usdPerUnit: 0.196386,
    isBaseCurrency: false,
    isActive: true,
    notes: "Mercosur agricultural commodities partner.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-au",
    countryCode: "AU",
    countryName: "Australia",
    currencyCode: "AUD",
    currencyName: "Australian Dollar",
    currencySymbol: "A$",
    exchangeRateToUsd: 1.442,
    usdPerUnit: 0.693481,
    isBaseCurrency: false,
    isActive: true,
    notes: "Oceania hub for bulk agro supply and counter-seasonal crops.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c-in",
    countryCode: "IN",
    countryName: "India",
    currencyCode: "INR",
    currencyName: "Indian Rupee",
    currencySymbol: "₹",
    exchangeRateToUsd: 94.95,
    usdPerUnit: 0.010532,
    isBaseCurrency: false,
    isActive: true,
    notes:
      "Primary procurement and sourcing origin for spices, grains, and commodities.",
    updatedAt: new Date().toISOString(),
  },
];

export const FxMarketsModule: React.FC = () => {
  const [markets, setMarkets] = useState<MarketCountry[]>(FALLBACK_MARKETS);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [activeTab, setActiveTab] = useState<
    "directory" | "matrix" | "converter"
  >("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPill, setSelectedPill] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Modals
  const [showAddCountryModal, setShowAddCountryModal] = useState(false);
  const [showEditRateModal, setShowEditRateModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<MarketCountry | null>(
    null,
  );
  const [editRateValue, setEditRateValue] = useState<string>("");

  // Pair Override Modal
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairFromCountry, setPairFromCountry] = useState<MarketCountry | null>(
    null,
  );
  const [pairToCountry, setPairToCountry] = useState<MarketCountry | null>(
    null,
  );
  const [pairCustomRate, setPairCustomRate] = useState<string>("");
  const [isSubmittingPair, setIsSubmittingPair] = useState(false);

  // Global Country & Currency Registry State (Free API + Comprehensive Fallback)
  const [globalCountries, setGlobalCountries] = useState<GlobalCountryOption[]>(
    MASTER_WORLD_COUNTRIES,
  );
  const [selectedCountryKey, setSelectedCountryKey] = useState<string>("ZA");
  const [countryFilterText, setCountryFilterText] = useState<string>("");
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);

  // New Country Form State
  const [newCountryName, setNewCountryName] = useState("South Africa");
  const [newCountryCode, setNewCountryCode] = useState("ZA");
  const [newCurrencyCode, setNewCurrencyCode] = useState("ZAR");
  const [newCurrencyName, setNewCurrencyName] = useState("South African Rand");
  const [newCurrencySymbol, setNewCurrencySymbol] = useState("R");
  const [newRateToUsd, setNewRateToUsd] = useState("18.25");
  const [newNotes, setNewNotes] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Converter State
  const [convertAmount, setConvertAmount] = useState<string>("10000");
  const [convertFromCode, setConvertFromCode] = useState<string>("USD");
  const [convertToCode, setConvertToCode] = useState<string>("AED");
  const [converterResult, setConverterResult] = useState<{
    convertedAmount: number;
    amountInUsd: number;
    effectiveRate: number;
    triangulationFormula: string;
  } | null>(null);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [resMarkets, resMatrix] = await Promise.all([
        fetch(`${API_BASE}/fx/markets`),
        fetch(`${API_BASE}/fx/matrix`),
      ]);

      if (resMarkets.ok) {
        const data = await resMarkets.json();
        if (
          data.markets &&
          Array.isArray(data.markets) &&
          data.markets.length > 0
        ) {
          setMarkets(data.markets);
        }
      }

      if (resMatrix.ok) {
        const data = await resMatrix.json();
        setMatrixData(data);
      }
    } catch (err) {
      console.warn("[FX Module] Using local cache:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch live global countries, currencies, and authentic symbols from open API
  useEffect(() => {
    setIsLoadingCountries(true);
    fetchGlobalCountriesList()
      .then((list) => {
        if (list && list.length > 0) {
          setGlobalCountries(list);
        }
      })
      .catch((err) => {
        console.warn("[FX Registry] Could not fetch global countries:", err);
      })
      .finally(() => {
        setIsLoadingCountries(false);
      });
  }, []);

  // Filtered global registry countries for dropdown
  const filteredGlobalCountries = useMemo(() => {
    if (!countryFilterText.trim()) return globalCountries;
    const q = countryFilterText.toLowerCase().trim();
    return globalCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q) ||
        c.currencyName.toLowerCase().includes(q) ||
        c.currencySymbol.toLowerCase().includes(q),
    );
  }, [globalCountries, countryFilterText]);

  const handleSelectCountry = (countryCode: string) => {
    setSelectedCountryKey(countryCode);
    const found = globalCountries.find((c) => c.code === countryCode);
    if (found) {
      setNewCountryName(found.name);
      setNewCountryCode(found.code);
      setNewCurrencyCode(found.currencyCode);
      setNewCurrencyName(found.currencyName);
      setNewCurrencySymbol(found.currencySymbol);
      if (found.defaultRateToUsd) {
        setNewRateToUsd(String(found.defaultRateToUsd));
      }
    }
  };

  const handleOpenAddMarket = () => {
    const target =
      globalCountries.find((c) => c.code === selectedCountryKey) ||
      globalCountries.find((c) => c.code === "ZA") ||
      globalCountries[0];
    if (target) {
      handleSelectCountry(target.code);
    }
    setCountryFilterText("");
    setShowAddCountryModal(true);
  };

  // Filtered markets
  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      const matchesSearch =
        m.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.countryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.currencyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.currencyName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPill = selectedPill ? m.countryCode === selectedPill : true;

      return matchesSearch && matchesPill;
    });
  }, [markets, searchQuery, selectedPill]);

  // Recalculate converter dynamically
  useEffect(() => {
    const fromM = markets.find((m) => m.currencyCode === convertFromCode);
    const toM = markets.find((m) => m.currencyCode === convertToCode);

    if (!fromM || !toM) return;

    const amt = parseFloat(convertAmount) || 0;
    const fromRate = Number(fromM.exchangeRateToUsd);
    const toRate = Number(toM.exchangeRateToUsd);

    // Triangulated cross rate: toRate / fromRate
    const effectiveRate = fromRate > 0 ? toRate / fromRate : 1.0;
    const converted = amt * effectiveRate;
    const inUsd = fromRate > 0 ? amt / fromRate : amt;

    setConverterResult({
      convertedAmount: Number(converted.toFixed(2)),
      amountInUsd: Number(inUsd.toFixed(2)),
      effectiveRate: Number(effectiveRate.toFixed(6)),
      triangulationFormula: `1 ${fromM.currencyCode} = (${toRate} / ${fromRate}) = ${effectiveRate.toFixed(6)} ${toM.currencyCode}`,
    });
  }, [convertAmount, convertFromCode, convertToCode, markets]);

  const handleOpenEditRate = (country: MarketCountry) => {
    setEditingCountry(country);
    setEditRateValue(String(country.exchangeRateToUsd));
    setShowEditRateModal(true);
  };

  const handleSaveEditRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCountry) return;

    const numRate = parseFloat(editRateValue);
    if (isNaN(numRate) || numRate <= 0) {
      notify("Please enter a valid positive exchange rate", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/fx/markets/${editingCountry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeRateToUsd: numRate }),
      });

      if (res.ok) {
        notify(
          `Successfully updated rate for ${editingCountry.countryName} (1 USD = ${numRate} ${editingCountry.currencyCode})`,
        );
        setShowEditRateModal(false);
        setEditingCountry(null);
        await fetchData();
      } else {
        const err = await res.json();
        notify(err.error || "Failed to update rate", "error");
      }
    } catch (err) {
      notify("Network error updating rate", "error");
    }
  };

  const handleCreateCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newCountryName ||
      !newCountryCode ||
      !newCurrencyCode ||
      !newCurrencyName
    ) {
      notify(
        "Please fill in all required country and currency fields",
        "error",
      );
      return;
    }

    setIsSubmittingNew(true);
    try {
      const payload = {
        countryName: newCountryName.trim(),
        countryCode: newCountryCode.trim().toUpperCase(),
        currencyCode: newCurrencyCode.trim().toUpperCase(),
        currencyName: newCurrencyName.trim(),
        currencySymbol: newCurrencySymbol.trim() || "$",
        exchangeRateToUsd: parseFloat(newRateToUsd) || 1.0,
        notes: newNotes.trim(),
      };

      const res = await fetch(`${API_BASE}/fx/markets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify(
          `New export market ${payload.countryName} (${payload.currencyCode}) added successfully!`,
        );
        setShowAddCountryModal(false);
        // Reset form
        setNewCountryName("");
        setNewCountryCode("");
        setNewCurrencyCode("");
        setNewCurrencyName("");
        setNewCurrencySymbol("$");
        setNewRateToUsd("1.0");
        setNewNotes("");
        await fetchData();
      } else {
        const err = await res.json();
        notify(err.error || "Failed to add export market", "error");
      }
    } catch (err) {
      notify("Network error adding market", "error");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleCellClick = (fromC: MarketCountry, toC: MarketCountry) => {
    setPairFromCountry(fromC);
    setPairToCountry(toC);
    const existingRate =
      matrixData?.matrix?.[fromC.id]?.[toC.id]?.rate ||
      (fromC.exchangeRateToUsd > 0
        ? toC.exchangeRateToUsd / fromC.exchangeRateToUsd
        : 1.0);
    setPairCustomRate(String(Number(existingRate.toFixed(6))));
    setShowPairModal(true);
  };

  const handleSavePairOverride = async (
    e: React.FormEvent,
    resetToTriangulated: boolean = false,
  ) => {
    e.preventDefault();
    if (!pairFromCountry || !pairToCountry) return;

    setIsSubmittingPair(true);
    try {
      const payload = {
        fromCountryId: pairFromCountry.id,
        toCountryId: pairToCountry.id,
        rate: parseFloat(pairCustomRate) || 1.0,
        resetToTriangulated,
      };

      const res = await fetch(`${API_BASE}/fx/matrix/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify(
          resetToTriangulated
            ? `Reset pair ${pairFromCountry.currencyCode} -> ${pairToCountry.currencyCode} to triangulated base`
            : `Set custom contractual rate ${pairFromCountry.currencyCode} -> ${pairToCountry.currencyCode} = ${payload.rate}`,
        );
        setShowPairModal(false);
        await fetchData();
      } else {
        const err = await res.json();
        notify(err.error || "Failed to save pair override", "error");
      }
    } catch (err) {
      notify("Network error setting pair rate", "error");
    } finally {
      setIsSubmittingPair(false);
    }
  };

  const exportMatrixCsv = () => {
    if (!markets.length) return;
    const headers = [
      "From Country",
      "From Currency",
      ...markets.map((m) => `${m.countryCode} (${m.currencyCode})`),
    ];
    const rows = markets.map((fromC) => {
      const cells = markets.map((toC) => {
        if (fromC.id === toC.id) return "1.000000";
        const rate =
          matrixData?.matrix?.[fromC.id]?.[toC.id]?.rate ||
          (fromC.exchangeRateToUsd > 0
            ? toC.exchangeRateToUsd / fromC.exchangeRateToUsd
            : 1.0);
        return Number(rate).toFixed(6);
      });
      return [fromC.countryName, fromC.currencyCode, ...cells];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Polybridge_Ventures_FX_Matrix_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Exported Exchange Rate Matrix to CSV");
  };

  return (
    <div className="fx-module-container" style={{ padding: "0 0.5rem 3rem" }}>
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "24px",
            zIndex: 9999,
            backgroundColor:
              feedbackMsg.type === "success" ? "#10b981" : "#ef4444",
            color: "#ffffff",
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontWeight: 500,
          }}
        >
          {feedbackMsg.type === "success" ? (
            <ShieldCheck size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 1. HERO BANNER: "Markets We Export To" (Matching User's Image) */}
      <div
        className="markets-export-banner"
        style={{
          background: "linear-gradient(180deg, #060913 0%, #0d1527 100%)",
          borderRadius: "16px",
          padding: "2.5rem 2rem 2rem",
          marginBottom: "2rem",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "450px",
            height: "160px",
            background:
              "radial-gradient(ellipse, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0) 70%)",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.6rem",
          }}
        >
          <Globe size={18} color="#818cf8" />
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#818cf8",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            International Trade Settlement & FX Architecture
          </span>
        </div>

        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "2.35rem",
            fontWeight: 700,
            color: "#f8fafc",
            margin: "0 0 0.5rem 0",
            letterSpacing: "-0.02em",
          }}
        >
          Markets We Export To
        </h2>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.95rem",
            maxWidth: "640px",
            margin: "0 auto 1.75rem",
          }}
        >
          Multi-currency commercial routing across 11 key export destinations
          with live USD base triangulation and custom contractual cross-rate
          overrides.
        </p>

        {/* The 11 Export Market Country Pills from User Image */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.65rem",
            maxWidth: "920px",
            margin: "0 auto 1.5rem",
          }}
        >
          {markets.map((m) => {
            const isSelected = selectedPill === m.countryCode;
            return (
              <button
                key={m.id}
                onClick={() =>
                  setSelectedPill(isSelected ? null : m.countryCode)
                }
                title={`Filter ${m.countryName} (${m.currencyCode}) | 1 USD = ${m.exchangeRateToUsd} ${m.currencyCode}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.45rem 0.95rem",
                  borderRadius: "9999px",
                  backgroundColor: isSelected
                    ? "#3b82f6"
                    : "rgba(30, 58, 138, 0.45)",
                  border: isSelected
                    ? "1px solid #60a5fa"
                    : "1px solid rgba(96, 165, 250, 0.25)",
                  color: isSelected ? "#ffffff" : "#bfdbfe",
                  fontSize: "0.86rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: isSelected
                    ? "0 0 16px rgba(59, 130, 246, 0.5)"
                    : "none",
                }}
              >
                <span
                  style={{
                    backgroundColor: isSelected
                      ? "#1d4ed8"
                      : "rgba(15, 23, 42, 0.7)",
                    color: isSelected ? "#ffffff" : "#93c5fd",
                    padding: "0.12rem 0.42rem",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  {m.countryCode}
                </span>
                <span>{m.countryName}</span>
                <span
                  style={{
                    fontSize: "0.74rem",
                    opacity: 0.75,
                    fontFamily: "monospace",
                  }}
                >
                  ({m.currencyCode})
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "1.25rem",
            fontSize: "0.84rem",
          }}
        >
          {selectedPill ? (
            <button
              onClick={() => setSelectedPill(null)}
              className="btn btn-outline"
              style={{
                fontSize: "0.78rem",
                padding: "0.3rem 0.75rem",
                borderRadius: "20px",
              }}
            >
              Clear Filter ({selectedPill})
            </button>
          ) : (
            <span
              style={{
                color: "#60a5fa",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
              }}
            >
              <span>11 active export corridors + base settlement origin</span>
              <ArrowUpRight size={14} />
            </span>
          )}
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid-4" style={{ marginBottom: "1.75rem" }}>
        <div
          className="stat-card"
          style={{ padding: "1.25rem", borderRadius: "12px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              Active Export Markets
            </span>
            <Globe size={18} color="var(--primary)" />
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {markets.length} Corridors
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--success)",
              marginTop: "0.35rem",
            }}
          >
            ● 11 Export Destinations + Base Origin
          </div>
        </div>

        <div
          className="stat-card"
          style={{ padding: "1.25rem", borderRadius: "12px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              Base Settlement Currency
            </span>
            <Building2 size={18} color="#10b981" />
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            USD ($1.0000)
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginTop: "0.35rem",
            }}
          >
            Triangulation & Reporting Anchor
          </div>
        </div>

        <div
          className="stat-card"
          style={{ padding: "1.25rem", borderRadius: "12px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              Pegged Parity Currencies
            </span>
            <ShieldCheck size={18} color="#f59e0b" />
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            AED, SAR, OMR
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginTop: "0.35rem",
            }}
          >
            Strict Central Bank Pegged Parities
          </div>
        </div>

        <div
          className="stat-card"
          style={{ padding: "1.25rem", borderRadius: "12px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              FX Matrix Pairs
            </span>
            <ArrowRightLeft size={18} color="#06b6d4" />
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {markets.length * markets.length} Live Pairs
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--info)",
              marginTop: "0.35rem",
            }}
          >
            Full N × N Enterprise Matrix Coverage
          </div>
        </div>
      </div>

      {/* 3. SUB-TABS & ACTION BUTTONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.75rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("directory")}
            className={`btn ${activeTab === "directory" ? "btn-primary" : "btn-outline"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Globe size={16} />
            <span>Market Countries ({filteredMarkets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`btn ${activeTab === "matrix" ? "btn-primary" : "btn-outline"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <ArrowRightLeft size={16} />
            <span>N × N Cross-Exchange Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("converter")}
            className={`btn ${activeTab === "converter" ? "btn-primary" : "btn-outline"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Calculator size={16} />
            <span>FX Triangulation Calculator</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={fetchData}
            className="btn btn-outline"
            disabled={isRefreshing}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            title="Refresh exchange rates"
          >
            <RefreshCw
              size={15}
              className={isRefreshing ? "spin-animation" : ""}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {activeTab === "matrix" && (
            <button
              onClick={exportMatrixCsv}
              className="btn btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              title="Download Exchange Rate Matrix as CSV"
            >
              <Download size={15} />
              <span>Export Matrix CSV</span>
            </button>
          )}

          <button
            onClick={handleOpenAddMarket}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Plus size={16} />
            <span>Add Export Market</span>
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: MARKET DIRECTORY TABLE */}
      {activeTab === "directory" && (
        <div
          className="table-card"
          style={{ borderRadius: "12px", overflow: "hidden" }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                width: "320px",
              }}
            >
              <div style={{ position: "relative", width: "100%" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search market, country code, or currency..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: "2.25rem", width: "100%" }}
                />
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Showing {filteredMarkets.length} of {markets.length} export market
              currencies
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              className="data-table"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th style={{ width: "80px", textAlign: "center" }}>Code</th>
                  <th>Market & Country</th>
                  <th>Currency Name</th>
                  <th style={{ width: "100px", textAlign: "center" }}>
                    Currency Code
                  </th>
                  <th style={{ width: "80px", textAlign: "center" }}>Symbol</th>
                  <th style={{ textAlign: "right" }}>
                    Direct Rate (1 USD = X)
                  </th>
                  <th style={{ textAlign: "right" }}>
                    Inverse Rate (1 Unit = $ USD)
                  </th>
                  <th>Market Role & Peg</th>
                  <th style={{ width: "110px", textAlign: "center" }}>
                    Status
                  </th>
                  <th style={{ width: "130px", textAlign: "center" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <div
                        className="table-spinner"
                        style={{ margin: "0 auto 0.75rem" }}
                      />
                      Loading export markets and live FX matrix...
                    </td>
                  </tr>
                ) : filteredMarkets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      No export markets matching query "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredMarkets.map((m) => (
                    <tr key={m.id}>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: m.isBaseCurrency
                              ? "var(--primary-subtle)"
                              : "var(--bg-tertiary)",
                            color: m.isBaseCurrency
                              ? "var(--primary-light)"
                              : "var(--text-primary)",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            letterSpacing: "0.04em",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          {m.countryCode}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {m.countryName}
                        </div>
                        {m.notes && (
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-muted)",
                              marginTop: "2px",
                            }}
                          >
                            {m.notes}
                          </div>
                        )}
                      </td>

                      <td style={{ color: "var(--text-secondary)" }}>
                        {m.currencyName}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            backgroundColor: "rgba(99, 102, 241, 0.1)",
                            color: "var(--primary-light)",
                          }}
                        >
                          {m.currencyCode}
                        </span>
                      </td>

                      <td style={{ textAlign: "center", fontWeight: 600 }}>
                        {m.currencySymbol}
                      </td>

                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          fontFamily: "monospace",
                        }}
                      >
                        {m.exchangeRateToUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{" "}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {m.currencyCode}
                        </span>
                      </td>

                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "monospace",
                          color: "var(--text-secondary)",
                        }}
                      >
                        ${m.usdPerUnit.toFixed(m.usdPerUnit < 0.01 ? 6 : 4)}
                      </td>

                      <td>
                        {m.isBaseCurrency ? (
                          <span className="badge badge-primary">
                            Base Currency (USD)
                          </span>
                        ) : ["AED", "SAR", "OMR"].includes(m.currencyCode) ? (
                          <span className="badge badge-warning">
                            USD Pegged
                          </span>
                        ) : (
                          <span className="badge badge-outline">
                            Floating Market
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span className="badge badge-success">Active</span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                          <button
                            onClick={() => handleOpenEditRate(m)}
                            className="btn btn-outline"
                            style={{
                              padding: "0.35rem 0.55rem",
                              fontSize: "0.75rem",
                            }}
                            title="Edit exchange rate"
                          >
                            <Edit2 size={13} style={{ marginRight: "3px" }} />
                            <span>Edit Rate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: N x N CROSS-EXCHANGE RATE MATRIX */}
      {activeTab === "matrix" && (
        <div
          className="table-card"
          style={{ borderRadius: "12px", overflow: "hidden" }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              backgroundColor: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  color: "var(--text-primary)",
                }}
              >
                Cross-Currency Exchange Rate Matrix (Base Triangulated)
              </h3>
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                }}
              >
                Rows denote <strong>Source Currency (1 Unit)</strong> and
                columns denote <strong>Target Currency</strong>. Click any cell
                to inspect or set a custom contractual override rate.
              </p>
            </div>
            <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem" }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: "var(--primary)",
                    borderRadius: "2px",
                  }}
                />
                <span>Diagonal (1.0 Parity)</span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: "#f59e0b",
                    borderRadius: "2px",
                  }}
                />
                <span>Custom Override</span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: "var(--bg-tertiary)",
                    borderRadius: "2px",
                  }}
                />
                <span>Triangulated</span>
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto", maxHeight: "680px" }}>
            <table
              className="data-table matrix-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "center",
              }}
            >
              <thead>
                <tr style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <th
                    style={{
                      minWidth: "130px",
                      textAlign: "left",
                      backgroundColor: "var(--bg-secondary)",
                      borderRight: "2px solid var(--border-medium)",
                    }}
                  >
                    From \ To
                  </th>
                  {markets.map((target) => (
                    <th
                      key={target.id}
                      style={{
                        minWidth: "105px",
                        textAlign: "center",
                        padding: "0.65rem 0.4rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--primary-light)",
                        }}
                      >
                        {target.currencyCode}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          fontWeight: 400,
                        }}
                      >
                        {target.countryCode}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {markets.map((fromC) => (
                  <tr key={fromC.id}>
                    <td
                      style={{
                        textAlign: "left",
                        fontWeight: 600,
                        backgroundColor: "var(--bg-surface-elevated)",
                        borderRight: "2px solid var(--border-medium)",
                        padding: "0.65rem 0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.1rem 0.35rem",
                            borderRadius: "4px",
                            backgroundColor: "rgba(99, 102, 241, 0.15)",
                            color: "var(--primary-light)",
                          }}
                        >
                          {fromC.currencyCode}
                        </span>
                        <span
                          style={{
                            fontSize: "0.84rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {fromC.countryName}
                        </span>
                      </div>
                    </td>

                    {markets.map((toC) => {
                      const isSame = fromC.id === toC.id;
                      const pairInfo = matrixData?.matrix?.[fromC.id]?.[toC.id];
                      const isOverride = pairInfo?.isCustomOverride || false;

                      // Calculated triangulated rate
                      const triangulatedRate =
                        fromC.exchangeRateToUsd > 0
                          ? toC.exchangeRateToUsd / fromC.exchangeRateToUsd
                          : 1.0;
                      const displayRate =
                        pairInfo?.rate !== undefined
                          ? pairInfo.rate
                          : triangulatedRate;

                      const formatted = isSame
                        ? "1.0000"
                        : displayRate < 0.0001
                          ? displayRate.toExponential(3)
                          : displayRate < 1
                            ? displayRate.toFixed(4)
                            : displayRate > 100
                              ? displayRate.toFixed(2)
                              : displayRate.toFixed(4);

                      return (
                        <td
                          key={toC.id}
                          onClick={() => !isSame && handleCellClick(fromC, toC)}
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.82rem",
                            padding: "0.6rem 0.4rem",
                            cursor: isSame ? "default" : "pointer",
                            backgroundColor: isSame
                              ? "rgba(99, 102, 241, 0.12)"
                              : isOverride
                                ? "rgba(245, 158, 11, 0.12)"
                                : "transparent",
                            color: isSame
                              ? "var(--primary-light)"
                              : isOverride
                                ? "#f59e0b"
                                : "var(--text-secondary)",
                            fontWeight: isSame || isOverride ? 700 : 500,
                            border: "1px solid var(--border-subtle)",
                            transition: "background-color 0.15s ease",
                          }}
                          className={!isSame ? "matrix-hover-cell" : ""}
                          title={
                            isSame
                              ? `${fromC.currencyCode} Parity`
                              : `1 ${fromC.currencyCode} = ${displayRate} ${toC.currencyCode} (${isOverride ? "Custom Override" : "Triangulated via USD"}). Click to edit.`
                          }
                        >
                          {formatted}
                          {isOverride && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "0.65rem",
                                color: "#f59e0b",
                              }}
                            >
                              override
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE TRIANGULATION CONVERTER & SOURCING CALCULATOR */}
      {activeTab === "converter" && (
        <div style={{ maxWidth: "880px", margin: "0 auto" }}>
          <div
            className="table-card"
            style={{ padding: "2rem", borderRadius: "16px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calculator size={22} color="var(--primary)" />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.25rem",
                    color: "var(--text-primary)",
                  }}
                >
                  Enterprise Multi-Currency Triangulation Calculator
                </h3>
                <p
                  style={{
                    margin: "0.2rem 0 0 0",
                    fontSize: "0.86rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Simulate commercial conversion between any 2 export markets
                  via statutory USD Base Triangulation.
                </p>
              </div>
            </div>

            <div
              className="grid-3"
              style={{ gap: "1.25rem", marginBottom: "1.75rem" }}
            >
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Transaction Amount
                </label>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="form-control"
                  style={{ fontSize: "1.1rem", fontWeight: 600 }}
                  placeholder="Enter amount..."
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  From Country / Currency
                </label>
                <select
                  value={convertFromCode}
                  onChange={(e) => setConvertFromCode(e.target.value)}
                  className="form-control"
                  style={{ fontSize: "0.95rem" }}
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.currencyCode}>
                      {m.countryName} ({m.currencyCode} - {m.currencySymbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  To Country / Currency
                </label>
                <select
                  value={convertToCode}
                  onChange={(e) => setConvertToCode(e.target.value)}
                  className="form-control"
                  style={{ fontSize: "0.95rem" }}
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.currencyCode}>
                      {m.countryName} ({m.currencyCode} - {m.currencySymbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Result Box */}
            {converterResult && (
              <div
                style={{
                  background:
                    "linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
                  borderRadius: "12px",
                  padding: "1.75rem",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Converted Amount
                    </span>
                    <div
                      style={{
                        fontSize: "2.4rem",
                        fontWeight: 700,
                        color: "#38bdf8",
                        marginTop: "0.2rem",
                      }}
                    >
                      {converterResult.convertedAmount.toLocaleString()}{" "}
                      {convertToCode}
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        color: "var(--text-secondary)",
                        marginTop: "0.25rem",
                      }}
                    >
                      Base USD Equivalent:{" "}
                      <strong>
                        ${converterResult.amountInUsd.toLocaleString()} USD
                      </strong>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      className="badge badge-info"
                      style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem" }}
                    >
                      Effective Rate: 1 {convertFromCode} ={" "}
                      {converterResult.effectiveRate} {convertToCode}
                    </span>
                  </div>
                </div>

                {/* Step-by-Step Triangulation Audit Path */}
                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1rem",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "0.4rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Info size={14} color="var(--primary-light)" />
                    <span>Statutory Enterprise Triangulation Audit Trail:</span>
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    • Leg 1 (Source to Base): {convertAmount} {convertFromCode}{" "}
                    ÷{" "}
                    {
                      markets.find((m) => m.currencyCode === convertFromCode)
                        ?.exchangeRateToUsd
                    }{" "}
                    = ${converterResult.amountInUsd} USD
                    <br />• Leg 2 (Base to Target): $
                    {converterResult.amountInUsd} USD ×{" "}
                    {
                      markets.find((m) => m.currencyCode === convertToCode)
                        ?.exchangeRateToUsd
                    }{" "}
                    = {converterResult.convertedAmount} {convertToCode}
                    <br />• Formula: {converterResult.triangulationFormula}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ADD MARKET COUNTRY MODAL */}
      {showAddCountryModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddCountryModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(4, 7, 18, 0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1.5rem",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "580px",
              width: "100%",
              margin: "auto",
              padding: "2rem",
              background: "#0d1527",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              borderRadius: "12px",
              boxShadow:
                "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(99, 102, 241, 0.2)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Add New Export Market & Currency
                </h3>
                <p
                  style={{
                    margin: "0.25rem 0 0 0",
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Select an international trade destination. ISO-2 code,
                  currency, and symbols are configured automatically from the
                  global registry.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCountryModal(false)}
                className="btn btn-outline"
                style={{
                  padding: "0.25rem 0.55rem",
                  borderRadius: "50%",
                  color: "var(--text-muted)",
                }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateCountry}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* Step 1: Searchable Dropdown for Global Countries */}
              <div>
                <label
                  className="form-label"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Select Country from Global Registry *</span>
                  {isLoadingCountries && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--primary-light)",
                      }}
                    >
                      Syncing live API...
                    </span>
                  )}
                </label>

                <div style={{ position: "relative", marginBottom: "0.45rem" }}>
                  <input
                    type="text"
                    placeholder="Search world registry (e.g. South Africa, Germany, ZAR, EUR)..."
                    value={countryFilterText}
                    onChange={(e) => setCountryFilterText(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: "2.25rem", fontSize: "0.88rem" }}
                  />
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  {countryFilterText && (
                    <button
                      type="button"
                      onClick={() => setCountryFilterText("")}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedCountryKey}
                  onChange={(e) => handleSelectCountry(e.target.value)}
                  className="form-control"
                  style={{
                    fontSize: "0.88rem",
                    height: "42px",
                    padding: "0.5rem 0.75rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid rgba(99, 102, 241, 0.35)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>
                    -- Select a Country & Currency --
                  </option>
                  {filteredGlobalCountries.map((c) => (
                    <option key={`${c.code}-${c.currencyCode}`} value={c.code}>
                      {c.flag} {c.name} ({c.code}) — {c.currencyCode} [
                      {c.currencySymbol}] • {c.currencyName}
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    fontSize: "0.74rem",
                    color: "var(--text-muted)",
                    marginTop: "0.3rem",
                  }}
                >
                  Select any country above. You do not need to type the country
                  name or currency symbol manually.
                </div>
              </div>

              {/* Step 2: Auto-Populated Country & Currency Registry Card */}
              <div
                style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.85rem 1rem",
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.2fr 1fr",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      display: "block",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Market & ISO-2
                  </span>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#f8fafc",
                      fontSize: "0.92rem",
                      marginTop: "2px",
                    }}
                  >
                    {newCountryName || "South Africa"}
                  </div>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--primary-light)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ISO Code: {newCountryCode || "ZA"}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      display: "block",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Settlement Currency
                  </span>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--primary-light)",
                      fontSize: "0.92rem",
                      fontFamily: "var(--font-mono)",
                      marginTop: "2px",
                    }}
                  >
                    {newCurrencyCode || "ZAR"}
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {newCurrencyName || "South African Rand"}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <Lock size={11} color="var(--success)" />
                    <span>Currency Symbol</span>
                  </span>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.2rem 0.75rem",
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      borderRadius: "6px",
                      color: "#34d399",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      marginTop: "3px",
                      fontFamily: "var(--font-mono)",
                    }}
                    title="Auto-detected symbol from ISO registry"
                  >
                    {newCurrencySymbol || "R"}
                  </div>
                </div>
              </div>

              {/* Step 3: Exchange Rate to USD */}
              <div>
                <label className="form-label">
                  Exchange Rate to USD (Units per 1 USD) *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    placeholder="e.g. 18.25"
                    value={newRateToUsd}
                    onChange={(e) => setNewRateToUsd(e.target.value)}
                    className="form-control"
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      paddingRight: "4.5rem",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {newCurrencyCode}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: "0.35rem",
                  }}
                >
                  1 USD = {newRateToUsd} {newCurrencyCode} (1 {newCurrencyCode}{" "}
                  ≈ {(1 / (parseFloat(newRateToUsd) || 1)).toFixed(6)} USD). All
                  N × N cross matrix rates will be triangulated automatically.
                </span>
              </div>

              {/* Step 4: Trade Notes */}
              <div>
                <label className="form-label">
                  Trade Notes / Corridor Context (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Key export corridor for direct container shipments, bulk spices, and bilateral trade..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="form-control"
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddCountryModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="btn btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Plus size={15} />
                  <span>
                    {isSubmittingNew ? "Saving..." : "Add Export Market"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT EXCHANGE RATE MODAL */}
      {showEditRateModal && editingCountry && (
        <div
          className="modal-backdrop"
          onClick={() => setShowEditRateModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(4, 7, 18, 0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1.5rem",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "460px",
              width: "100%",
              margin: "auto",
              padding: "1.75rem",
              background: "#0d1527",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              borderRadius: "12px",
              boxShadow:
                "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(99, 102, 241, 0.2)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.15rem",
                    color: "var(--text-primary)",
                    fontWeight: 700,
                  }}
                >
                  Edit Exchange Rate: {editingCountry.countryName}
                </h3>
                <span
                  style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}
                >
                  ISO: {editingCountry.countryCode} •{" "}
                  {editingCountry.currencyCode} ({editingCountry.currencySymbol}
                  )
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditRateModal(false)}
                className="btn btn-outline"
                style={{ padding: "0.2rem 0.5rem", borderRadius: "50%" }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveEditRate}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.86rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Currency:{" "}
                  <strong>
                    {editingCountry.currencyName} ({editingCountry.currencyCode}
                    )
                  </strong>
                </div>
                <label className="form-label">
                  Rate to 1 US Dollar (USD) *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={editRateValue}
                    onChange={(e) => setEditRateValue(e.target.value)}
                    className="form-control"
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      paddingRight: "4.5rem",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {editingCountry.currencyCode}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: "0.35rem",
                  }}
                >
                  Updating this value will automatically recalculate
                  triangulated cross-rates for all pairs with{" "}
                  {editingCountry.currencyCode}.
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditRateModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Exchange Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PAIR RATE OVERRIDE MODAL */}
      {showPairModal && pairFromCountry && pairToCountry && (
        <div
          className="modal-backdrop"
          onClick={() => setShowPairModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(4, 7, 18, 0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1.5rem",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "480px",
              width: "100%",
              margin: "auto",
              padding: "1.75rem",
              background: "#0d1527",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              borderRadius: "12px",
              boxShadow:
                "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(99, 102, 241, 0.2)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.15rem",
                    color: "var(--text-primary)",
                    fontWeight: 700,
                  }}
                >
                  Contractual Pair Rate Override
                </h3>
                <span
                  style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}
                >
                  Explicit bilateral rate agreement override
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className="btn btn-outline"
                style={{ padding: "0.2rem 0.5rem", borderRadius: "50%" }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                fontSize: "0.88rem",
                color: "var(--text-secondary)",
                marginBottom: "1rem",
                background: "rgba(255, 255, 255, 0.03)",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Corridor:{" "}
              <strong style={{ color: "#f8fafc" }}>
                {pairFromCountry.currencyCode} ({pairFromCountry.countryName})
              </strong>{" "}
              →{" "}
              <strong style={{ color: "var(--primary-light)" }}>
                {pairToCountry.currencyCode} ({pairToCountry.countryName})
              </strong>
            </div>

            <form
              onSubmit={(e) => handleSavePairOverride(e, false)}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label className="form-label">
                  Contractual Exchange Rate *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={pairCustomRate}
                  onChange={(e) => setPairCustomRate(e.target.value)}
                  className="form-control"
                  style={{ fontSize: "1.1rem", fontWeight: 600 }}
                />
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: "0.35rem",
                  }}
                >
                  1 {pairFromCountry.currencyCode} = {pairCustomRate}{" "}
                  {pairToCountry.currencyCode}. Overrides the standard
                  triangulated base rate for this pair.
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => handleSavePairOverride(e, true)}
                  className="btn btn-outline"
                  style={{
                    color: "var(--warning)",
                    borderColor: "rgba(245, 158, 11, 0.4)",
                  }}
                >
                  Reset to Triangulated
                </button>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowPairModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPair}
                    className="btn btn-primary"
                  >
                    {isSubmittingPair ? "Saving..." : "Set Override"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
