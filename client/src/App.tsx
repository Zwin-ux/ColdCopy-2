import { useMemo, useState } from "react";

type Tone = "friendly" | "professional" | "aggressive" | "minimalist";
type AngleKey = "value_angle" | "curiosity_angle" | "social_angle";

interface TargetProfile {
  industry: string | null;
  role: string | null;
  company: string | null;
  recent_achievements: string | null;
  notable_products_or_services: string | null;
  public_pain_points: string | null;
  writing_tone: string | null;
  values_or_preferences: string | null;
}

interface TargetSignals {
  buying_reason: string;
  credibility_hook: string;
  emotional_hook: string;
}

interface OutreachAngles {
  value_angle: string;
  curiosity_angle: string;
  social_angle: string;
}

interface DeliverabilityInsight {
  riskLevel: "low" | "medium" | "high";
  cues: string;
  recommends: string;
}

interface FinalEmail {
  body: string;
  meta: {
    selected_angle: AngleKey;
    deliverability: DeliverabilityInsight;
  };
}

interface ResearchSnapshot {
  profile: TargetProfile;
  signals: TargetSignals;
  angles: OutreachAngles;
  deliverability: DeliverabilityInsight;
}

interface GenerationRequest {
  offer: string;
  targetText?: string;
  tone: Tone;
  selectedAngle?: AngleKey;
  cachedProfile?: TargetProfile;
  cachedSignals?: TargetSignals;
  cachedAngles?: OutreachAngles;
}

type RowStatus = "idle" | "pending" | "success" | "error";

interface BatchRow {
  id: string;
  offer: string;
  targetText: string;
  tone: Tone;
  preferredAngle?: AngleKey;
  status: RowStatus;
  error?: string;
  research?: ResearchSnapshot;
  email?: FinalEmail;
  previewOpen?: boolean;
}

const rowStatusLabel: Record<RowStatus, string> = {
  idle: "Idle",
  pending: "Running",
  success: "Ready",
  error: "Error",
};

const makeBatchId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const createBatchRow = (): BatchRow => ({
  id: makeBatchId(),
  offer: "",
  targetText: "",
  tone: "friendly",
  status: "idle",
});

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const angleOrder: AngleKey[] = ["value_angle", "curiosity_angle", "social_angle"];

const getNextAngle = (current: AngleKey): AngleKey => {
  const currentIndex = angleOrder.indexOf(current);
  return angleOrder[(currentIndex + 1) % angleOrder.length];
};

const formatAngleLabel = (angle: AngleKey) => angle.replace("_", " ");

const getRiskLabel = (level: DeliverabilityInsight["riskLevel"]) => {
  switch (level) {
    case "low":
      return "Low Risk";
    case "medium":
      return "Medium Risk";
    case "high":
      return "High Risk";
  }
};

interface StageLogEntry {
  stage: string;
  output: string;
  timestamp: string;
}

interface ScoutSuggestion {
  name: string;
  role: string;
  detail: string;
  source?: string;
}

interface ComposePanelProps {
  offer: string;
  targetText: string;
  tone: Tone;
  ready: boolean;
  loading: boolean;
  error: string | null;
  onOfferChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onToneChange: (value: Tone) => void;
  onGenerate: () => void;
}

const ComposePanel = ({
  offer,
  targetText,
  tone,
  ready,
  loading,
  error,
  onOfferChange,
  onTargetChange,
  onToneChange,
  onGenerate,
}: ComposePanelProps) => (
  <section className="panel input-panel glass-panel">
    <div className="panel-header">
      <h2>Compose</h2>
      <span className="tone-chip">Tone: {tone}</span>
    </div>

    <label>
      <span>Offer</span>
      <textarea rows={3} value={offer} onChange={(event) => onOfferChange(event.target.value)} />
    </label>

    <label>
      <span>Target info (link, context, or pitch)</span>
      <textarea rows={5} value={targetText} onChange={(event) => onTargetChange(event.target.value)} />
    </label>

    <label className="tone-select">
      <span>Tone</span>
      <select value={tone} onChange={(event) => onToneChange(event.target.value as Tone)}>
        <option value="friendly">Friendly</option>
        <option value="professional">Professional</option>
        <option value="aggressive">Aggressive</option>
        <option value="minimalist">Minimalist</option>
      </select>
    </label>

    <button className="generate" onClick={onGenerate} disabled={!ready || loading}>
      {loading ? "Composingâ€¦" : "Generate cold email"}
    </button>
    {error && <p className="error">{error}</p>}
  </section>
);

interface BatchQueueProps {
  batchRows: BatchRow[];
  readyToGenerateBatch: boolean;
  batchProcessing: boolean;
  exportingBatch: boolean;
  hasBatchSuccess: boolean;
  batchMessage: string | null;
  handleAddRow: () => void;
  handleRemoveRow: (id: string) => void;
  updateBatchRow: (id: string, updater: (row: BatchRow) => BatchRow) => void;
  handleBatchGenerate: (rowsOverride?: BatchRow[]) => Promise<void>;
  handleExportCsv: () => Promise<void>;
  handleRegenerateRow: (row: BatchRow) => Promise<void>;
  handleTogglePreview: (id: string) => void;
  handleReRunLastBatch: () => void;
  savedBatchRowsAvailable: boolean;
}

const BatchQueue = ({
  batchRows,
  readyToGenerateBatch,
  batchProcessing,
  exportingBatch,
  hasBatchSuccess,
  batchMessage,
  handleAddRow,
  handleRemoveRow,
  updateBatchRow,
  handleBatchGenerate,
  handleExportCsv,
  handleRegenerateRow,
  handleTogglePreview,
  handleReRunLastBatch,
  savedBatchRowsAvailable,
}: BatchQueueProps) => {
  const getRowValidity = (row: BatchRow) => {
    const offerValid = row.offer.trim().length >= 5;
    const targetValid = row.targetText.trim().length >= 5;
    return { offerValid, targetValid, isValid: offerValid && targetValid };
  };

  return (
    <section className="panel batch-panel glass-panel">
      <div className="panel-header">
        <h2>Batch queue</h2>
        <button type="button" className="batch-add-row" onClick={handleAddRow}>
          + Add target
        </button>
      </div>

      <div className="batch-rows">
        {batchRows.map((row) => {
          const validity = getRowValidity(row);
          return (
            <div
              className={`batch-row glass-panel${validity.isValid ? "" : " batch-row-invalid"}`}
              key={row.id}
            >
              <div className="batch-row-header">
                <span className={`batch-status-badge ${row.status}`}>{rowStatusLabel[row.status]}</span>
                <div className="batch-row-header-actions">
                  <button type="button" disabled={batchRows.length === 1} onClick={() => handleRemoveRow(row.id)}>
                    Remove
                  </button>
                </div>
              </div>

              <label>
                <span>Offer</span>
                <textarea
                  rows={2}
                  value={row.offer}
                  onChange={(event) => updateBatchRow(row.id, (prev) => ({ ...prev, offer: event.target.value }))}
                />
                {!validity.offerValid && (
                  <small className="helper-text">Offer must be at least 5 characters.</small>
                )}
              </label>

              <label>
                <span>Target info</span>
                <textarea
                  rows={3}
                  value={row.targetText}
                  onChange={(event) =>
                    updateBatchRow(row.id, (prev) => ({ ...prev, targetText: event.target.value }))
                  }
                />
                {!validity.targetValid && (
                  <small className="helper-text">Target info must be at least 5 characters.</small>
                )}
              </label>

              <div className="batch-row-controls">
                <label>
                  <span>Tone</span>
                  <select
                    value={row.tone}
                    onChange={(event) =>
                      updateBatchRow(row.id, (prev) => ({ ...prev, tone: event.target.value as Tone }))
                    }
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="aggressive">Aggressive</option>
                    <option value="minimalist">Minimalist</option>
                  </select>
                </label>
                <label>
                  <span>Preferred angle</span>
                  <select
                    value={row.preferredAngle ?? ""}
                    onChange={(event) =>
                      updateBatchRow(row.id, (prev) => ({
                        ...prev,
                        preferredAngle: (event.target.value as AngleKey) || undefined,
                      }))
                    }
                  >
                    <option value="">Auto</option>
                    {angleOrder.map((angle) => (
                      <option key={angle} value={angle}>
                        {formatAngleLabel(angle)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {row.error && <p className="error batch-row-error">{row.error}</p>}
              <button
                type="button"
                className="batch-preview-toggle"
                onClick={() => handleTogglePreview(row.id)}
                disabled={!row.research}
              >
                {row.previewOpen ? "Hide cached research" : "Preview cached research"}
              </button>

              {row.previewOpen && (
                <div className="preview-card">
                  {row.research ? (
                    <>
                      <p>
                        <strong>Industry:</strong> {row.research.profile.industry ?? "Unknown"}
                      </p>
                      <p>
                        <strong>Role:</strong> {row.research.profile.role ?? "Unknown"}
                      </p>
                      <p>
                        <strong>Angle:</strong> {" "}
                        {row.email?.meta.selected_angle
                          ? row.email.meta.selected_angle.replace("_", " " )
                          : "Not set"}
                      </p>
                      <p className="helper-text">{row.research.deliverability.cues}</p>
                    </>
                  ) : (
                    <p className="helper-text">Generate this row once to cache research.</p>
                  )}
                </div>
              )}

              {row.status === "success" && row.research && row.email && (
                <div className="batch-row-result">
                  <div className="card deliverability-card batch-deliverability-card">
                    <div className="card-header">
                      <h3>Deliverability</h3>
                      <span className={`risk-badge risk-${row.research.deliverability.riskLevel}`}>
                        {getRiskLabel(row.research.deliverability.riskLevel)}
                      </span>
                    </div>
                    <p className="deliverability-cues">{row.research.deliverability.cues}</p>
                    <p className="deliverability-recommends">{row.research.deliverability.recommends}</p>
                  </div>
                  <pre>{row.email.body}</pre>
                  <div className="batch-row-footer">
                    <button type="button" onClick={() => handleRegenerateRow(row)} disabled={batchProcessing}>
                      Regenerate with another angle
                    </button>
                    <span>
                      Angle {angleOrder.indexOf(row.email.meta.selected_angle) + 1} of {angleOrder.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="batch-footer">
        <button
          className="generate"
          type="button"
          onClick={handleBatchGenerate}
          disabled={!readyToGenerateBatch || batchProcessing}
        >
          {batchProcessing ? "Generating batch…" : "Generate batch"}
        </button>
        <button
          className="batch-export"
          type="button"
          onClick={handleExportCsv}
          disabled={!hasBatchSuccess || exportingBatch}
        >
          {exportingBatch ? "Exporting CSV…" : "Export CRM CSV"}
        </button>
        <button
          className="batch-rerun"
          type="button"
          onClick={handleReRunLastBatch}
          disabled={!savedBatchRowsAvailable || batchProcessing}
        >
          Re-run last batch
        </button>
        {batchMessage && <p className="batch-message">{batchMessage}</p>}
      </div>
    </section>
  );
};interface ResearchPanelProps {
  research: ResearchSnapshot | null;
  researchSummary: string;
  currentAngleLabel: string;
  stageLog: StageLogEntry[];
}

const ResearchPanel = ({ research, researchSummary, currentAngleLabel, stageLog }: ResearchPanelProps) => {
  const [logVisible, setLogVisible] = useState(false);

  return (
    <section className="panel results-panel glass-panel">
      <div className="panel-header">
        <h2>Research snapshot</h2>
        {research && <span className="angle-tag">{currentAngleLabel}</span>}
      </div>

      {research ? (
        <>
          <div className="research-grid">
            <div className="card profile-card">
              <h3>Audience</h3>
              <p>
                <strong>Industry:</strong> {research.profile.industry ?? "Unknown"}
              </p>
              <p>
                <strong>Role:</strong> {research.profile.role ?? "Unknown"}
              </p>
              <p>
                <strong>Company:</strong> {research.profile.company ?? "Unknown"}
              </p>
              <p className="signal-summary">{researchSummary || "No summary available"}</p>
              <div className="signal-list">
                <span>{research.signals.buying_reason}</span>
                <span>{research.signals.credibility_hook}</span>
                <span>{research.signals.emotional_hook}</span>
              </div>
            </div>

            <div className="card deliverability-card">
              <div className="card-header">
                <h3>Deliverability</h3>
                <span className={`risk-badge risk-${research.deliverability.riskLevel}`}>
                  {getRiskLabel(research.deliverability.riskLevel)}
                </span>
              </div>
              <p className="deliverability-cues">{research.deliverability.cues}</p>
              <p className="deliverability-recommends">{research.deliverability.recommends}</p>
            </div>
          </div>
          <div className="stage-log-panel">
            <button
              type="button"
              className="stage-log-toggle"
              onClick={() => setLogVisible((prev) => !prev)}
              aria-expanded={logVisible}
            >
              {logVisible ? "Hide" : "Show"} stage log ({stageLog.length})
            </button>
            {logVisible && (
              <ul className="stage-log">
                {stageLog.length === 0 ? (
                  <li className="stage-log-empty">Stage data will appear after generating an email.</li>
                ) : (
                  stageLog.map((entry) => (
                    <li
                      key={`${entry.stage}-${entry.timestamp}`}
                      className={entry.stage.toLowerCase().includes("deliverability") ? "stage-log-deliverability" : ""}
                    >
                      <div className="stage-log-entry">
                        <span className="stage-name">{entry.stage}</span>
                        <span className="stage-timestamp">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p>{entry.output}</p>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </>
      ) : (
        <p className="empty">Enter the offer and some context to surface signals.</p>
      )}
    </section>
  );
};

interface EmailPanelProps {
  finalEmail: FinalEmail | null;
  onCopy: () => void;
  onRegenerate: () => void;
  isLoading: boolean;
  currentAngleIndex: number;
}

const EmailPanel = ({ finalEmail, onCopy, onRegenerate, isLoading, currentAngleIndex }: EmailPanelProps) => (
  finalEmail ? (
    <section className="panel email-panel glass-panel">
      <div className="email-header">
        <h3>Final email</h3>
        <button type="button" onClick={onCopy}>
          Copy email
        </button>
      </div>
      <pre>{finalEmail.body}</pre>
      <div className="actions">
        <button type="button" onClick={onRegenerate} disabled={isLoading}>
          Regenerate with another angle
        </button>
        <small>
          Angle {currentAngleIndex + 1} of {angleOrder.length}
        </small>
      </div>
    </section>
  ) : null
);

const App = () => {
  const [offer, setOffer] = useState("Automate compliance-friendly demos");
  const [targetText, setTargetText] = useState("" as string);
  const [tone, setTone] = useState<Tone>("friendly");
  const [research, setResearch] = useState<ResearchSnapshot | null>(null);
  const [finalEmail, setFinalEmail] = useState<FinalEmail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageLog, setStageLog] = useState<StageLogEntry[]>([]);
  const [batchRows, setBatchRows] = useState<BatchRow[]>(() => [createBatchRow()]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [exportingBatch, setExportingBatch] = useState(false);
  const [savedBatchRows, setSavedBatchRows] = useState<BatchRow[] | null>(null);
  const [scoutQuery, setScoutQuery] = useState("");
  const [scoutResults, setScoutResults] = useState<ScoutSuggestion[] | null>(null);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutError, setScoutError] = useState<string | null>(null);

  const callGenerate = async (body: GenerationRequest) => {
    const resp = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await resp.json();
    if (!resp.ok) {
      throw new Error(payload.error?.message ?? payload.error ?? "Generation failed");
    }
    return payload as { research: ResearchSnapshot; email: FinalEmail; stageLog: StageLogEntry[] };
  };

  const buildGenerationPayload = (options: {
    useCache?: boolean;
    selectedAngle?: AngleKey;
  }): GenerationRequest => {
    const payload: GenerationRequest = {
      offer,
      tone,
    };
    if (options.selectedAngle) {
      payload.selectedAngle = options.selectedAngle;
    }
    if (options.useCache) {
      if (!research) {
        throw new Error("No cached research available for regeneration.");
      }
      payload.cachedProfile = research.profile;
      payload.cachedSignals = research.signals;
      payload.cachedAngles = research.angles;
    } else {
      payload.targetText = targetText;
    }
    return payload;
  };

  const handleGenerate = async () => {
    setError(null);
    setIsLoading(true);
    setFinalEmail(null);
    try {
      const payload = await callGenerate(buildGenerationPayload({ useCache: false }));
      setResearch(payload.research);
      setFinalEmail(payload.email);
      setStageLog(payload.stageLog ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate at the moment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!research || !finalEmail) return;
    const currentAngle = finalEmail.meta.selected_angle;
    const nextIndex = (angleOrder.indexOf(currentAngle) + 1) % angleOrder.length;
    const nextAngle = angleOrder[nextIndex];
    setError(null);
    setIsLoading(true);
    try {
      const payload = await callGenerate(
        buildGenerationPayload({ useCache: true, selectedAngle: nextAngle })
      );
      setResearch(payload.research);
      setFinalEmail(payload.email);
      setStageLog(payload.stageLog ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to regenerate");
    } finally {
      setIsLoading(false);
    }
  };

  const getRowValidity = (row: BatchRow) => {
    const offerValid = row.offer.trim().length >= 5;
    const targetValid = row.targetText.trim().length >= 5;
    return { offerValid, targetValid, isValid: offerValid && targetValid };
  };

  const readyToGenerateBatch = batchRows.every((row) => getRowValidity(row).isValid);
  const hasBatchSuccess = batchRows.some((row) => row.status === "success");

  const updateBatchRow = (id: string, updater: (row: BatchRow) => BatchRow) => {
    setBatchRows((prev) => prev.map((row) => (row.id === id ? updater(row) : row)));
  };

  const handleAddRow = () => {
    setBatchRows((prev) => [...prev, createBatchRow()]);
  };

  const handleRemoveRow = (id: string) => {
    setBatchRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
  };

  const handleBatchGenerate = async (rowsOverride?: BatchRow[]) => {
    const rowsSnapshot = rowsOverride ?? batchRows;
    if (!rowsOverride && !readyToGenerateBatch) {
      setBatchMessage("Fill out every row before running the batch.");
      return;
    }
    setBatchMessage(null);
    setBatchProcessing(true);
    setBatchRows(rowsSnapshot.map((row) => ({ ...row, status: "pending", error: undefined })));

    try {
      const resp = await fetch(`${baseUrl}/api/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: rowsSnapshot.map((row) => ({
            offer: row.offer.trim(),
            targetText: row.targetText.trim(),
            tone: row.tone,
            selectedAngle: row.preferredAngle,
          })),
        }),
      });
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error(payload.error?.message ?? payload.error ?? "Batch generation failed");
      }
      const exportsList: { research: ResearchSnapshot; email: FinalEmail; stageLog: StageLogEntry[] }[] =
        payload.exports ?? [];

      const updatedRows = rowsSnapshot.map((row, index) => {
        const result = exportsList[index];
        if (!result) {
          return { ...row, status: "error", error: "Missing batch response" };
        }
        return {
          ...row,
          research: result.research,
          email: result.email,
          status: "success",
          error: undefined,
        };
      });

      setBatchRows(updatedRows);
      setSavedBatchRows(updatedRows);
      setStageLog(exportsList[0]?.stageLog ?? []);
      setBatchMessage("Batch complete with deliverability insights.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Batch generation failed.";
      setBatchRows(rowsSnapshot.map((row) => ({ ...row, status: "error", error: message })));
      setBatchMessage(message);
      setStageLog([]);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleReRunLastBatch = async () => {
    if (!savedBatchRows?.length) {
      setBatchMessage("No batch to rerun yet.");
      return;
    }
    await handleBatchGenerate(savedBatchRows);
  };

  const handleTogglePreview = (id: string) => {
    setBatchRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, previewOpen: !row.previewOpen } : row))
    );
  };

  const handleScoutSearch = async () => {
    if (!scoutQuery.trim()) {
      setScoutResults(null);
      return;
    }
    setScoutLoading(true);
    setScoutError(null);
    try {
      const resp = await fetch(`${baseUrl}/api/serp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: scoutQuery.trim(),
          company: scoutQuery.trim(),
          context: scoutQuery.trim(),
        }),
      });
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error(payload.error?.message ?? "SERP lookup failed");
      }
      setScoutResults(payload.suggestions ?? []);
      if (payload.fallback) {
        setScoutError("Using fallback suggestions; the SERP provider could not be reached.");
      }
    } catch (err) {
      setScoutResults(null);
      setScoutError(err instanceof Error ? err.message : "Unable to fetch scout suggestions.");
    } finally {
      setScoutLoading(false);
    }
  };

  const handleExportCsv = async () => {
    const readyRows = batchRows.filter((row) => row.research && row.email);
    if (!readyRows.length) {
      setBatchMessage("Generate at least one row before exporting.");
      return;
    }
    setExportingBatch(true);
    try {
      const resp = await fetch(`${baseUrl}/api/crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: readyRows.map((row) => ({
            offer: row.offer,
            tone: row.tone,
            research: {
              profile: row.research!.profile,
              signals: row.research!.signals,
              angles: row.research!.angles,
              deliverability: row.research!.deliverability,
            },
            email: {
              body: row.email!.body,
              meta: {
                selected_angle: row.email!.meta.selected_angle,
                deliverability: row.email!.meta.deliverability,
              },
            },
          })),
        }),
      });
      const csv = await resp.text();
      if (!resp.ok) {
        throw new Error(csv || "CRM export failed");
      }
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `coldcopy-batch-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setBatchMessage("CRM export ready.");
    } catch (err) {
      setBatchMessage(err instanceof Error ? err.message : "CRM export failed.");
    } finally {
      setExportingBatch(false);
    }
  };

  const handleRegenerateRow = async (row: BatchRow) => {
    if (!row.research || !row.email) return;
    const currentAngle = row.email.meta.selected_angle;
    const nextAngle = getNextAngle(currentAngle);
    updateBatchRow(row.id, (prev) => ({ ...prev, status: "pending", error: undefined }));
    try {
      const payload: GenerationRequest = {
        offer: row.offer,
        tone: row.tone,
        selectedAngle: nextAngle,
        cachedProfile: row.research.profile,
        cachedSignals: row.research.signals,
        cachedAngles: row.research.angles,
      };
      const result = await callGenerate(payload);
      updateBatchRow(row.id, (prev) => ({
        ...prev,
        research: result.research,
        email: result.email,
        status: "success",
      }));
      setBatchMessage("Regenerated angle with cached research.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Regeneration failed.";
      updateBatchRow(row.id, (prev) => ({ ...prev, status: "error", error: message }));
      setBatchMessage(message);
    }
  };

  const readyToGenerate = offer.trim().length > 5 && targetText.trim().length > 10;

  const researchSummary = useMemo(() => {
    if (!research) return "";
    const { buying_reason, emotional_hook } = research.signals;
    return `${buying_reason.trim()} ${emotional_hook.trim()}`.trim();
  }, [research]);

  const currentAngleIndex = finalEmail
    ? angleOrder.indexOf(finalEmail.meta.selected_angle)
    : 0;

  const currentAngleLabel = finalEmail
    ? finalEmail.meta.selected_angle.replace("_", " ")
    : "value angle";

  const copyToClipboard = async () => {
    if (!finalEmail) return;
    await navigator.clipboard.writeText(finalEmail.body);
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <div className="logo-block">
            <img src="/logo.png" alt="ColdCopy logo" className="logo" />
            <div>
              <h1>ColdCopy</h1>
              <p className="tagline">
                Compliance-aware, multi-channel cold email writer for founders who need measurable ROI.
              </p>
            </div>
          </div>
          <div className="status-chip">Live mode</div>
        </header>

        <p className="insight">
          Focus on niches like GDPR/CAN-SPAM compliance, multi-channel resonance, and disciplined deliverability mindful of Gmail AI filters.
        </p>

        <main className="app-grid">
          <div className="control-column">
            <ComposePanel
              offer={offer}
              targetText={targetText}
              tone={tone}
              ready={readyToGenerate}
              loading={isLoading}
              error={error}
              onOfferChange={setOffer}
              onTargetChange={setTargetText}
              onToneChange={(value) => setTone(value)}
              onGenerate={handleGenerate}
            />

            <BatchQueue
              batchRows={batchRows}
              readyToGenerateBatch={readyToGenerateBatch}
              batchProcessing={batchProcessing}
              exportingBatch={exportingBatch}
              hasBatchSuccess={hasBatchSuccess}
              batchMessage={batchMessage}
              handleAddRow={handleAddRow}
              handleRemoveRow={handleRemoveRow}
              updateBatchRow={updateBatchRow}
              handleBatchGenerate={handleBatchGenerate}
              handleExportCsv={handleExportCsv}
              handleRegenerateRow={handleRegenerateRow}
              handleTogglePreview={handleTogglePreview}
              handleReRunLastBatch={handleReRunLastBatch}
              savedBatchRowsAvailable={!!savedBatchRows}
            />
            <section className="panel scout-panel glass-panel">
              <div className="panel-header">
                <h3>Scout prompt</h3>
              </div>
              <label className="scout-label">
                <span>Company or target context</span>
                <input
                  value={scoutQuery}
                  onChange={(event) => setScoutQuery(event.target.value)}
                  placeholder="e.g., compliance automation for fintech"
                />
              </label>
              <button
                type="button"
                className="scout-button"
                onClick={handleScoutSearch}
                disabled={!scoutQuery.trim() || scoutLoading}
              >
                {scoutLoading ? "Searchingâ€¦" : "Generate scout suggestions"}
              </button>
              {scoutError && <p className="error">{scoutError}</p>}
              {scoutResults && scoutResults.length ? (
                <ul className="scout-results">
                  {scoutResults.map((result) => (
                    <li key={`${result.name}-${result.role}`}>
                      <strong>{result.name}</strong>
                      <p>{result.role}</p>
                      <p>{result.detail}</p>
                      {result.source && <small className="helper-text">Source: {result.source}</small>}
                    </li>
                  ))}
                </ul>
              ) : !scoutLoading ? (
                <p className="helper-text">Use the prompt to surface suggested people to scout.</p>
              ) : null}
            </section>
          </div>

          <div className="panel-column">
            <ResearchPanel
              research={research}
              researchSummary={researchSummary}
              currentAngleLabel={currentAngleLabel}
              stageLog={stageLog}
            />
            <EmailPanel
              finalEmail={finalEmail}
              onCopy={copyToClipboard}
              onRegenerate={handleRegenerate}
              isLoading={isLoading}
              currentAngleIndex={currentAngleIndex}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
