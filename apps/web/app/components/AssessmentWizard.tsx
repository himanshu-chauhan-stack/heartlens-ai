"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HeartMonitor } from "./HeartMonitor";
import { restoreAssessment } from "../lib/assessmentStorage";
import {
  Activity,
  BadgeCheck,
  Ban,
  CircleHelp,
  Cigarette,
  FileUp,
  HeartPulse,
  LoaderCircle,
  ShieldCheck,
  Timer,
  UserRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  mapAssessmentToPredictionRequest,
  validateAssessment,
} from "../lib/predictApi";
import {
  type ActivityLevel,
  type AssessmentData,
  type FamilyHistoryType,
  type SmokingStatus,
  createEmptyAssessment,
} from "../lib/risk";
import {
  extractFromDocument,
  extractionToAssessmentPatch,
  ExtractionApiError,
} from "../lib/extractApi";

const STORAGE_KEY = "cardio_assessment_v1";
const DRAFT_KEY = "cardio_assessment_draft_v1";

type StepConfig = {
  title: string;
  subtitle: string;
};

const steps: StepConfig[] = [
  { title: "Welcome", subtitle: "A considered starting point." },
  { title: "Demographics", subtitle: "Age and sex help anchor baseline risk." },
  { title: "Vitals", subtitle: "Blood pressure and lipid context." },
  { title: "Lifestyle", subtitle: "Behavioral factors with major impact." },
  { title: "History", subtitle: "Medical history and treatment context." },
  { title: "Review", subtitle: "Confirm details before analysis." },
  { title: "Analysis", subtitle: "Requesting a genuine model prediction." },
];

function numberValidity(value: number | null, min: number, max: number) {
  if (value === null) return false;
  return value >= min && value <= max;
}

function round(value: number, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function FloatingInput(props: {
  label: string;
  id: string;
  value: number | null;
  unit?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  helper?: string;
  onChange: (value: number | null) => void;
}) {
  const { label, id, value, unit, min, max, disabled, helper, onChange } =
    props;
  const isValid =
    value !== null &&
    (min === undefined || max === undefined || numberValidity(value, min, max));

  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {min !== undefined && max !== undefined && (
          <span className="field-range">
            {min} - {max}
          </span>
        )}
      </div>
      <div className={`floating ${disabled ? "disabled" : ""}`}>
        <input
          id={id}
          className="floating-input"
          type="number"
          inputMode="decimal"
          step="any"
          value={value ?? ""}
          min={min}
          max={max}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => {
            const next = event.target.value;
            if (!next) {
              onChange(null);
              return;
            }
            onChange(Number(next));
          }}
        />

        {unit ? <span className="floating-suffix">{unit}</span> : null}
        {isValid ? (
          <BadgeCheck className="floating-check" size={16} aria-hidden="true" />
        ) : null}
      </div>
      {helper ? <p className="helper-inline">{helper}</p> : null}
    </div>
  );
}

function OptionGrid<T extends string>(props: {
  label: string;
  value: T | null;
  options: { value: T; title: string; description: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">{props.label}</span>
      </div>
      <div className="option-grid" role="group" aria-label={props.label}>
        {props.options.map((option) => {
          const active = props.value === option.value;
          return (
            <button
              type="button"
              key={option.value}
              className={`option-card ${active ? "active" : ""}`}
              aria-pressed={active}

              onClick={() => props.onChange(option.value)}
            >
              <span className="option-title">{option.title}</span>
              <span className="option-desc">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SmokingCards(props: {
  value: SmokingStatus | null;
  onChange: (value: SmokingStatus) => void;
}) {
  const cards: Array<{
    value: SmokingStatus;
    title: string;
    desc: string;
    icon: ReactNode;
  }> = [
    {
      value: "never",
      title: "Never",
      desc: "No smoking history",
      icon: <Ban size={16} />,
    },
    {
      value: "former",
      title: "Former",
      desc: "Stopped smoking",
      icon: <Cigarette size={16} />,
    },
    {
      value: "current",
      title: "Current",
      desc: "Current smoking exposure",
      icon: <Cigarette size={16} />,
    },
  ];
  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">Smoking status</span>
      </div>
      <div className="option-grid smoking-grid">
        {cards.map((card) => {
          const active = props.value === card.value;
          return (
            <button
              type="button"
              key={card.value}
              className={`option-card smoking-card ${active ? "active" : ""}`}
              onClick={() => props.onChange(card.value)}
            >
              <span className="smoking-icon">{card.icon}</span>
              <span className="option-title">{card.title}</span>
              <span className="option-desc">{card.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeIndicator(props: {
  min: number;
  max: number;
  healthyMin: number;
  healthyMax: number;
  value: number | null;
}) {
  const { min, max, healthyMin, healthyMax, value } = props;
  const position = value === null ? 0 : ((value - min) / (max - min)) * 100;
  const start = ((healthyMin - min) / (max - min)) * 100;
  const width = ((healthyMax - healthyMin) / (max - min)) * 100;
  return (
    <div className="range-indicator">
      <div className="range-track">
        <span
          className="range-good"
          style={{ left: `${start}%`, width: `${width}%` }}
        />
        {value !== null ? (
          <span
            className="range-dot"
            style={{ left: `${Math.max(0, Math.min(100, position))}%` }}
          />
        ) : null}
      </div>
      <div className="range-labels">
        <span>{min}</span>
        <span>Healthy zone</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function AssessmentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisTipIndex] = useState(0);
  const [bpUnit, setBpUnit] = useState<"mmHg" | "kPa">("mmHg");
  const [cholUnit, setCholUnit] = useState<"mg/dL" | "mmol/L">("mg/dL");
  const [data, setData] = useState<AssessmentData>(createEmptyAssessment());
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractionConfidence, setExtractionConfidence] = useState<Record<
    string,
    number
  > | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadConsent, setUploadConsent] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [importNotes, setImportNotes] = useState<string | null>(null);

  const handleReportUpload = useCallback(async (file: File) => {
    setUploadStatus("uploading");
    setUploadError(null);
    try {
      const extraction = await extractFromDocument(file);
      const patch = extractionToAssessmentPatch(extraction);
      setData(() => ({
        ...createEmptyAssessment(),
        ...patch,
        importSource: extraction.sample_source
          ? "synthetic_sample"
          : "external_report",
        importNotes: extraction.report_notes,
      }));
      setExtractionConfidence(extraction.confidence ?? {});
      setImportNotes(
        [extraction.sample_source, extraction.report_notes]
          .filter(Boolean)
          .join(" · ") || null,
      );
      setUploadStatus("idle");
      setStep(5); // Review -- user confirms/edits extracted values before submitting
    } catch (err) {
      setUploadStatus("error");
      setUploadError(
        err instanceof ExtractionApiError
          ? err.message
          : "Could not process this document.",
      );
    }
  }, []);

  const analysisTips = [
    "Cardiovascular risk estimates are probabilities, not diagnoses.",
    "Lowering systolic BP by 10 mmHg can meaningfully improve outcomes.",
    "Smoking cessation is one of the fastest ways to reduce risk trajectory.",
    "Regular physical activity improves both lipid profile and vascular health.",
  ];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      try {
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          step: number;
          data: AssessmentData;
        };
        const restored = restoreAssessment(parsed?.data);
        if (restored) {
          setData(restored);
          setStep(
            Number.isInteger(parsed.step)
              ? Math.max(0, Math.min(5, parsed.step))
              : 0,
          );
        }
      } catch {
        // Ignore invalid drafts
      } finally {
        setDraftReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data }));
  }, [data, step, draftReady]);

  const completion = useMemo(
    () =>
      Math.round(
        ((Number(data.age !== null) +
          Number(data.sex !== null) +
          Number(data.smokingStatus !== null) +
          Number(data.alcohol !== null) +
          Number(data.activityLevel !== null) +
          Number(data.diabetes !== null) +
          Number(data.familyHistoryType !== null) +
          Number(data.onBpMedication !== null)) /
          8) *
          100,
      ),
    [data],
  );

  const update = <K extends keyof AssessmentData>(
    key: K,
    value: AssessmentData[K],
  ) => {
    setData((prev) => ({ ...prev, assumptionsAccepted: false, [key]: value }));
  };

  const toBpDisplay = (value: number | null) => {
    if (value === null) return null;
    return bpUnit === "mmHg" ? value : round(value / 7.50062, 1);
  };
  const fromBpDisplay = (value: number | null) => {
    if (value === null) return null;
    return bpUnit === "mmHg" ? value : round(value * 7.50062);
  };
  const toCholDisplay = (value: number | null) => {
    if (value === null) return null;
    return cholUnit === "mg/dL" ? value : round(value / 38.67, 2);
  };
  const fromCholDisplay = (value: number | null) => {
    if (value === null) return null;
    return cholUnit === "mg/dL" ? value : round(value * 38.67);
  };

  const stepValid = useCallback(() => {
    if (step === 0) return true;
    if (step === 1)
      return numberValidity(data.age, 20, 79) && data.sex !== null;
    if (step === 2) {
      const bpValid =
        data.unknownVitals.systolicBp ||
        numberValidity(data.systolicBp, 80, 240);
      const dbpValid =
        data.unknownVitals.diastolicBp ||
        data.diastolicBp === null ||
        numberValidity(data.diastolicBp, 40, 160);
      const totalCholValid =
        data.cholesterolCategory != null ||
        data.unknownVitals.totalCholesterol ||
        numberValidity(data.totalCholesterol, 100, 400);
      const hdlValid =
        data.hdlCholesterol === null ||
        data.unknownVitals.hdlCholesterol ||
        numberValidity(data.hdlCholesterol, 20, 130);
      const heightValid =
        data.heightCm === null || numberValidity(data.heightCm, 120, 220);
      const weightValid =
        data.weightKg === null || numberValidity(data.weightKg, 30, 250);
      return (
        bpValid &&
        dbpValid &&
        totalCholValid &&
        hdlValid &&
        heightValid &&
        weightValid
      );
    }
    if (step === 3)
      return (
        data.smokingStatus !== null &&
        data.activityLevel !== null &&
        data.alcohol !== null
      );
    if (step === 4)
      return (
        data.diabetes !== null &&
        data.familyHistoryType !== null &&
        data.onBpMedication !== null
      );
    if (step === 5) return validateAssessment(data).length === 0;
    return false;
  }, [data, step]);

  const moveNext = useCallback(() => {
    if (!stepValid()) {
      setErrors(["Please complete required fields before continuing."]);
      return;
    }
    setErrors([]);
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [stepValid]);

  const moveBack = useCallback(() => {
    setErrors([]);
    setStep((prev) => Math.max(0, prev - 1));
  }, []);

  const startAnalysis = useCallback(() => {
    const issues = validateAssessment(data);
    const assumptions = mapAssessmentToPredictionRequest(data).defaultedFields;
    if (assumptions.length && !data.assumptionsAccepted)
      issues.push("Accept the listed assumptions or enter the missing values.");
    if (issues.length) {
      setErrors(issues);
      return;
    }
    const normalized = {
      ...data,
      smoking: data.smokingStatus === "current",
      familyHistory: data.familyHistoryType !== "none",
    };
    setIsAnalyzing(true);
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ step: 5, data: normalized }),
    );
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ data: normalized }),
    );
    router.push("/results");
  }, [data, router]);
  useEffect(() => {
    const timer = setTimeout(
      () => document.querySelector<HTMLElement>(".wizard-main h2")?.focus(),
      50,
    );
    return () => clearTimeout(timer);
  }, [step]);

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="step-block">
          <div className="welcome-hero">
            <motion.div
              className="welcome-heart"
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <HeartPulse size={42} />
            </motion.div>
            <span className="chip">YOUR PROFILE</span>
          </div>
          <HeartMonitor />
          <h2 tabIndex={-1} className="type-h2">
            Start with a clearer picture.
          </h2>
          <p className="lead">
            This guided assessment uses your reported measurements. Drafts stay
            in your browser session. Predictions are processed by the backend.
          </p>
          <div className="alert-row">
            <div className="trust-pill">
              <ShieldCheck size={16} />
              Manual entry, no account required
            </div>
            <div className="trust-pill">
              <HeartPulse size={16} />
              Trained disease-presence classifier
            </div>
          </div>
          <div className="field-inline" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-subtle"
              disabled={uploadStatus === "uploading"}
              aria-expanded={showUpload}
              aria-controls="lab-import"
              onClick={() => setShowUpload(!showUpload)}
            >
              <FileUp size={16} />
              {uploadStatus === "uploading"
                ? "Reading document..."
                : "Upload a lab report instead"}
            </button>
          </div>
          {showUpload && (
            <div className="sample-reports" id="lab-import">
              <strong>Choose how your report is processed.</strong>
              <p id="upload-disclosure">
                Marked HeartLens synthetic samples are parsed locally. Other
                PDF/DOCX reports send extracted text to Groq when configured.
                Uploads are limited to 10 MB. Values are reviewed before any
                prediction; missing values are never invented.
              </p>
              <label className="trust-pill">
                <input
                  type="checkbox"
                  checked={uploadConsent}
                  onChange={(e) => setUploadConsent(e.target.checked)}
                />{" "}
                I understand the processing above and choose to upload.
              </label>
              <label className="field-label" htmlFor="lab-report">
                PDF or DOCX report
              </label>
              <input
                id="lab-report"
                className="report-file-input"
                type="file"
                accept=".pdf,.docx"
                aria-describedby="upload-disclosure"
                disabled={!uploadConsent || uploadStatus === "uploading"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleReportUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
          <div className="sample-reports">
            <strong>Try a synthetic sample.</strong>
            <p>
              These four files are parsed locally; personal reports use Groq
              only after consent.
            </p>
            <div className="sample-links">
              {[1, 2, 3, 4].map((i) => (
                <a
                  key={i}
                  className="btn btn-subtle"
                  href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/samples/heartlens-sample-0${i}.pdf`}
                  download
                >
                  Sample 0{i} · PDF ↓
                </a>
              ))}
            </div>
            <p>
              Download a sample, then choose it with the upload control. These
              are fictional educational profiles, not real patient records.
            </p>
          </div>
          {uploadStatus === "error" && uploadError && (
            <div className="error-box" aria-live="assertive">
              <p>{uploadError}</p>
            </div>
          )}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="step-block">
          <h2 tabIndex={-1} className="type-h2">
            Demographics
          </h2>
          <p className="lead">Baseline profile for age and sex assignment.</p>
          <FloatingInput
            id="age"
            label="Age"
            value={data.age}
            min={20}
            max={79}
            unit="years"
            onChange={(value) => update("age", value)}
          />
          <OptionGrid
            label="Sex at birth"
            value={data.sex}
            options={[
              {
                value: "female",
                title: "Female",
                description: "Model category: female",
              },
              {
                value: "male",
                title: "Male",
                description: "Model category: male",
              },
            ]}
            onChange={(value) => update("sex", value)}
          />
        </div>
      );
    }

    if (step === 2) {
      const showTooltip = "Clinical term explained in plain language.";
      const bpRange =
        bpUnit === "mmHg" ? { min: 80, max: 240 } : { min: 10.7, max: 32 };
      const cholRange =
        cholUnit === "mg/dL"
          ? { min: 100, max: 400 }
          : { min: 2.6, max: 10.35 };
      const hdlRange =
        cholUnit === "mg/dL" ? { min: 20, max: 130 } : { min: 0.52, max: 3.36 };
      return (
        <div className="step-block">
          <h2 tabIndex={-1} className="type-h2">
            Vitals & Labs
          </h2>
          <p className="lead">Add values if known, or select I do not know.</p>

          <div className="unit-toggle-row">
            <button
              type="button"
              className={`chip ${bpUnit === "mmHg" ? "active" : ""}`}
              onClick={() => setBpUnit("mmHg")}
            >
              mmHg
            </button>
            <button
              type="button"
              className={`chip ${bpUnit === "kPa" ? "active" : ""}`}
              onClick={() => setBpUnit("kPa")}
            >
              kPa
            </button>
            <button
              type="button"
              className={`chip ${cholUnit === "mg/dL" ? "active" : ""}`}
              onClick={() => setCholUnit("mg/dL")}
            >
              mg/dL
            </button>
            <button
              type="button"
              className={`chip ${cholUnit === "mmol/L" ? "active" : ""}`}
              onClick={() => setCholUnit("mmol/L")}
            >
              mmol/L
            </button>
          </div>

          <div className="field-inline">
            <span className="field-label">
              Systolic BP{" "}
              <span title={showTooltip}>
                <CircleHelp size={14} />
              </span>
            </span>
            <button
              type="button"
              className={`chip ${data.unknownVitals.systolicBp ? "active" : ""}`}
              onClick={() =>
                setData((prev) => ({
                  ...prev,
                  unknownVitals: {
                    ...prev.unknownVitals,
                    systolicBp: !prev.unknownVitals.systolicBp,
                  },
                  systolicBp: !prev.unknownVitals.systolicBp
                    ? null
                    : prev.systolicBp,
                }))
              }
            >
              I do not know
            </button>
          </div>
          <FloatingInput
            id="sbp"
            label="Systolic Blood Pressure"
            value={toBpDisplay(data.systolicBp)}
            min={bpRange.min}
            max={bpRange.max}
            unit={bpUnit}
            disabled={data.unknownVitals.systolicBp}
            helper="Top blood pressure number when your heart beats."
            onChange={(value) => update("systolicBp", fromBpDisplay(value))}
          />

          <div className="field-inline">
            <span className="field-label">
              Diastolic BP{" "}
              <span title={showTooltip}>
                <CircleHelp size={14} />
              </span>
            </span>
            <button
              type="button"
              className={`chip ${data.unknownVitals.diastolicBp ? "active" : ""}`}
              onClick={() =>
                setData((prev) => ({
                  ...prev,
                  unknownVitals: {
                    ...prev.unknownVitals,
                    diastolicBp: !prev.unknownVitals.diastolicBp,
                  },
                  diastolicBp: !prev.unknownVitals.diastolicBp
                    ? null
                    : prev.diastolicBp,
                }))
              }
            >
              I do not know
            </button>
          </div>
          <FloatingInput
            id="dbp"
            label="Diastolic Blood Pressure"
            value={toBpDisplay(data.diastolicBp)}
            min={bpUnit === "mmHg" ? 40 : 5.3}
            max={bpUnit === "mmHg" ? 160 : 21.3}
            unit={bpUnit}
            disabled={data.unknownVitals.diastolicBp}
            helper="Bottom blood pressure number when your heart rests between beats."
            onChange={(value) => update("diastolicBp", fromBpDisplay(value))}
          />

          <div className="field-inline">
            <span className="field-label">Body Metrics</span>
          </div>
          <FloatingInput
            id="height"
            label="Height"
            value={data.heightCm}
            min={120}
            max={220}
            unit="cm"
            helper="Used to calculate BMI, a factor in the clinical risk model."
            onChange={(value) => update("heightCm", value)}
          />
          <FloatingInput
            id="weight"
            label="Weight"
            value={data.weightKg}
            min={30}
            max={250}
            unit="kg"
            onChange={(value) => update("weightKg", value)}
          />

          <div className="field-inline">
            <span className="field-label">
              Total Cholesterol{" "}
              <span title={showTooltip}>
                <CircleHelp size={14} />
              </span>
            </span>
            <button
              type="button"
              className={`chip ${data.unknownVitals.totalCholesterol ? "active" : ""}`}
              onClick={() =>
                setData((prev) => ({
                  ...prev,
                  unknownVitals: {
                    ...prev.unknownVitals,
                    totalCholesterol: !prev.unknownVitals.totalCholesterol,
                  },
                  totalCholesterol: !prev.unknownVitals.totalCholesterol
                    ? null
                    : prev.totalCholesterol,
                }))
              }
            >
              I do not know
            </button>
          </div>
          <FloatingInput
            id="total-chol"
            label="Total Cholesterol"
            value={toCholDisplay(data.totalCholesterol)}
            min={cholRange.min}
            max={cholRange.max}
            unit={cholUnit}
            disabled={data.unknownVitals.totalCholesterol}
            helper="Total circulating cholesterol in your blood sample."
            onChange={(value) =>
              update("totalCholesterol", fromCholDisplay(value))
            }
          />
          <RangeIndicator
            min={cholUnit === "mg/dL" ? 100 : 2.6}
            max={cholUnit === "mg/dL" ? 400 : 10.35}
            healthyMin={cholUnit === "mg/dL" ? 125 : 3.2}
            healthyMax={cholUnit === "mg/dL" ? 200 : 5.2}
            value={toCholDisplay(data.totalCholesterol)}
          />

          <div className="field-inline">
            <span className="field-label">
              HDL Cholesterol{" "}
              <span title={showTooltip}>
                <CircleHelp size={14} />
              </span>
            </span>
            <button
              type="button"
              className={`chip ${data.unknownVitals.hdlCholesterol ? "active" : ""}`}
              onClick={() =>
                setData((prev) => ({
                  ...prev,
                  unknownVitals: {
                    ...prev.unknownVitals,
                    hdlCholesterol: !prev.unknownVitals.hdlCholesterol,
                  },
                  hdlCholesterol: !prev.unknownVitals.hdlCholesterol
                    ? null
                    : prev.hdlCholesterol,
                }))
              }
            >
              I do not know
            </button>
          </div>
          <FloatingInput
            id="hdl-chol"
            label="HDL Cholesterol"
            value={toCholDisplay(data.hdlCholesterol)}
            min={hdlRange.min}
            max={hdlRange.max}
            unit={cholUnit}
            disabled={data.unknownVitals.hdlCholesterol}
            helper="Protective cholesterol that helps remove LDL."
            onChange={(value) =>
              update("hdlCholesterol", fromCholDisplay(value))
            }
          />
          <RangeIndicator
            min={cholUnit === "mg/dL" ? 20 : 0.52}
            max={cholUnit === "mg/dL" ? 130 : 3.36}
            healthyMin={cholUnit === "mg/dL" ? 45 : 1.16}
            healthyMax={cholUnit === "mg/dL" ? 80 : 2.07}
            value={toCholDisplay(data.hdlCholesterol)}
          />
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="step-block">
          <h2 tabIndex={-1} className="type-h2">
            Lifestyle
          </h2>
          <p className="lead">
            Lifestyle risks are modifiable and high-impact.
          </p>
          <SmokingCards
            value={data.smokingStatus}
            onChange={(value) => {
              update("smokingStatus", value);
              update("smoking", value === "current");
            }}
          />
          <OptionGrid<ActivityLevel>
            label="Weekly activity level"
            value={data.activityLevel}
            options={[
              {
                value: "low",
                title: "Low",
                description: "< 60 minutes active/week",
              },
              {
                value: "moderate",
                title: "Moderate",
                description: "60-149 minutes/week",
              },
              {
                value: "high",
                title: "High",
                description: "150+ minutes/week",
              },
            ]}
            onChange={(value) => update("activityLevel", value)}
          />
          <OptionGrid
            label="Alcohol consumption"
            value={data.alcohol === null ? null : data.alcohol ? "yes" : "no"}
            options={[
              {
                value: "no",
                title: "No",
                description: "No regular alcohol intake",
              },
              {
                value: "yes",
                title: "Yes",
                description: "Regular alcohol intake",
              },
            ]}
            onChange={(value) => update("alcohol", value === "yes")}
          />
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="step-block">
          <h2 tabIndex={-1} className="type-h2">
            Medical History
          </h2>
          <OptionGrid
            label="Reported glucose category"
            value={
              data.glucoseCategory == null
                ? "unknown"
                : String(data.glucoseCategory)
            }
            options={[
              {
                value: "1",
                title: "Normal",
                description: "Reported by your laboratory",
              },
              {
                value: "2",
                title: "Above normal",
                description: "Reported category 2",
              },
              {
                value: "3",
                title: "Well above normal",
                description: "Reported category 3",
              },
              {
                value: "unknown",
                title: "I do not know",
                description: "Review a normal-category assumption",
              },
            ]}
            onChange={(v) =>
              update(
                "glucoseCategory",
                v === "unknown" ? null : (Number(v) as 1 | 2 | 3),
              )
            }
          />
          <p className="lead">
            Diabetes, family history and medication are context, not direct
            inputs to this model.
          </p>
          <OptionGrid
            label="Diabetes history"
            value={data.diabetes === null ? null : data.diabetes ? "yes" : "no"}
            options={[
              { value: "no", title: "No", description: "No known diabetes" },
              {
                value: "yes",
                title: "Yes",
                description: "Type 1, Type 2, or pre-existing diagnosis",
              },
            ]}
            onChange={(value) => update("diabetes", value === "yes")}
          />
          <OptionGrid<FamilyHistoryType>
            label="First-degree family history of early CVD"
            value={data.familyHistoryType}
            options={[
              {
                value: "none",
                title: "None",
                description: "No first-degree early CVD history",
              },
              {
                value: "male_lt55",
                title: "Male <55",
                description: "Father/brother before age 55",
              },
              {
                value: "female_lt65",
                title: "Female <65",
                description: "Mother/sister before age 65",
              },
              {
                value: "both",
                title: "Both",
                description: "Both thresholds apply",
              },
            ]}
            onChange={(value) => {
              update("familyHistoryType", value);
              update("familyHistory", value !== "none");
            }}
          />
          <OptionGrid
            label="Currently on blood pressure medication"
            value={
              data.onBpMedication === null
                ? null
                : data.onBpMedication
                  ? "yes"
                  : "no"
            }
            options={[
              {
                value: "no",
                title: "No",
                description: "Not currently prescribed antihypertensives",
              },
              {
                value: "yes",
                title: "Yes",
                description: "Currently prescribed BP medication",
              },
            ]}
            onChange={(value) => update("onBpMedication", value === "yes")}
          />
        </div>
      );
    }

    if (step === 5) {
      const rows: Array<{ label: string; value: string; extreme?: boolean }> = [
        { label: "Age", value: data.age ? `${data.age} years` : "Not set" },
        { label: "Sex", value: data.sex ?? "Not set" },
        {
          label: "Systolic BP",
          value: data.unknownVitals.systolicBp
            ? "I do not know"
            : data.systolicBp
              ? `${data.systolicBp} mmHg`
              : "Not set",
          extreme: data.systolicBp !== null && data.systolicBp >= 180,
        },
        {
          label: "Diastolic BP",
          value: data.unknownVitals.diastolicBp
            ? "I do not know"
            : data.diastolicBp
              ? `${data.diastolicBp} mmHg`
              : "Not set",
          extreme: data.diastolicBp !== null && data.diastolicBp >= 120,
        },
        {
          label: "Height / Weight",
          value:
            data.heightCm && data.weightKg
              ? `${data.heightCm} cm / ${data.weightKg} kg`
              : "Not set",
        },
        {
          label: "Total Cholesterol",
          value: data.unknownVitals.totalCholesterol
            ? "I do not know"
            : data.totalCholesterol
              ? `${data.totalCholesterol} mg/dL`
              : "Not set",
          extreme:
            data.totalCholesterol !== null && data.totalCholesterol >= 280,
        },
        {
          label: "Cholesterol category used by model",
          value: `${mapAssessmentToPredictionRequest(data).request.cholesterol} · ${["", "Normal", "Above normal", "Well above normal"][mapAssessmentToPredictionRequest(data).request.cholesterol]}${data.cholesterolCategory ? " (reported)" : data.totalCholesterol !== null && !data.unknownVitals.totalCholesterol ? " (mapped from measurement)" : " (assumed; requires consent)"}`,
        },
        {
          label: "HDL Cholesterol",
          value: data.unknownVitals.hdlCholesterol
            ? "I do not know"
            : data.hdlCholesterol
              ? `${data.hdlCholesterol} mg/dL`
              : "Not set",
          extreme: data.hdlCholesterol !== null && data.hdlCholesterol <= 30,
        },
        { label: "Smoking", value: data.smokingStatus ?? "Not set" },
        {
          label: "Alcohol",
          value:
            data.alcohol === null ? "Not set" : data.alcohol ? "Yes" : "No",
        },
        { label: "Activity", value: data.activityLevel ?? "Not set" },
        {
          label: "Glucose category",
          value: data.glucoseCategory
            ? ["", "Normal", "Above normal", "Well above normal"][
                data.glucoseCategory
              ]
            : "Unknown — assumption needed",
        },
        {
          label: "BP medication (context)",
          value:
            data.onBpMedication === null
              ? "Not set"
              : data.onBpMedication
                ? "Yes"
                : "No",
        },
        {
          label: "Diabetes",
          value:
            data.diabetes === null ? "Not set" : data.diabetes ? "Yes" : "No",
        },
        {
          label: "Family History",
          value: data.familyHistoryType
            ? data.familyHistoryType.replaceAll("_", " ")
            : "Not set",
        },
      ];

      return (
        <div className="step-block">
          <h2 tabIndex={-1} className="type-h2">
            Review & Confirm
          </h2>
          <p className="lead">
            Check all entries. HDL, diabetes, family history and BP medication
            are contextual; they do not alter the model request. Cholesterol
            uses categories mapped at 200 and 240 mg/dL. Moderate/high activity
            maps to active.
          </p>
          <div className="card-panel">
            <strong>Missing-value assumptions</strong>
            {mapAssessmentToPredictionRequest(data).defaultedFields.length ? (
              <>
                <ul className="assumption-list">
                  {mapAssessmentToPredictionRequest(data).defaultedFields.map(
                    (x) => (
                      <li key={x}>{x}</li>
                    ),
                  )}
                </ul>
                <label className="trust-pill">
                  <input
                    type="checkbox"
                    checked={data.assumptionsAccepted ?? false}
                    onChange={(e) =>
                      update("assumptionsAccepted", e.target.checked)
                    }
                  />{" "}
                  I choose to use these assumptions for this prediction.
                </label>
              </>
            ) : (
              <p className="lead">No model input assumptions needed.</p>
            )}
          </div>
          {(importNotes || data.importNotes) && (
            <p className="source-note">
              Import source / notes: {importNotes || data.importNotes}
            </p>
          )}
          {extractionConfidence && (
            <div className="alert-row">
              <div className="trust-pill">
                <FileUp size={14} />
                Values pre-filled from your uploaded document -- please review
                each one before continuing.
                {Object.values(extractionConfidence).some((c) => c < 0.5)
                  ? " Some values had low extraction confidence."
                  : ""}
              </div>
            </div>
          )}
          <div className="cta-row">
            {["Demographics", "Vitals", "Lifestyle", "History"].map(
              (name, i) => (
                <button
                  key={name}
                  type="button"
                  className="btn btn-subtle"
                  onClick={() => setStep(i + 1)}
                >
                  Edit {name}
                </button>
              ),
            )}
          </div>
          <div className="review-list">
            {rows.map((row) => (
              <div
                className={`review-row ${row.extreme ? "review-row-warn" : ""}`}
                key={row.label}
              >
                <span>{row.label}</span>
                <strong>{row.value}</strong>
                {row.extreme ? (
                  <em className="review-note">Confirm this value is correct</em>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="step-block">
        <h2 tabIndex={-1} className="type-h2">
          Running Risk Analysis
        </h2>
        <p className="lead">
          Building your personalized dashboard and recommendations.
        </p>
        <div className="analysis-card" aria-live="polite">
          <LoaderCircle className="spin" size={28} />
          <p>{analysisTips[analysisTipIndex]}</p>
        </div>
      </div>
    );
  };

  const canGoBack = step > 0 && step < 6;
  const isReviewStep = step === 5;
  const canContinue = step > 0 && step < 5;
  const progressWidth = `${((step + 1) / 7) * 100}%`;

  return (
    <section className="section">
      <h1 className="sr-only">HeartLens AI cardiovascular assessment</h1>
      <div id="content" className="container wizard-progress-shell card-panel">
        <div className="wizard-progress-head">
          <span className="mono">Step {step + 1}/7</span>
          <span>{steps[step]?.title}</span>
        </div>
        <div className="wizard-progress-track">
          <span
            className="wizard-progress-fill"
            style={{ width: progressWidth }}
          />
        </div>
        <div className="wizard-stage-list">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={`wizard-stage ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}
            >
              {item.title}
            </span>
          ))}
        </div>
      </div>

      <div className="container wizard-grid">
        <aside className="wizard-side card-panel">
          <h2 className="type-h1">Cardiovascular Assessment</h2>
          <p className="lead">
            Your measurements. Clear assumptions. A model result you can
            explore.
          </p>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${completion}%` }} />
          </div>
          <p className="meter-label mono">{completion}% profile complete</p>
          <div className="step-list">
            {steps.map((item, index) => (
              <div
                key={item.title}
                className={`step-item ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}
              >
                <span className="step-index">{index + 1}</span>
                <div>
                  <div className="step-title">{item.title}</div>
                  <div className="step-sub">{item.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <motion.div
          className="card-panel wizard-main"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="wizard-head">
            <div className="head-left">
              {step <= 1 ? (
                <UserRound size={18} />
              ) : step === 0 ? (
                <Timer size={18} />
              ) : (
                <Activity size={18} />
              )}
              <span>{steps[step]?.title}</span>
            </div>
            <span className="mono">Autosaved in this tab</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {errors.length > 0 && (
            <div className="error-box" aria-live="assertive">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          <div className="action-bar">
            {step === 0 ? (
              <button
                type="button"
                className="btn btn-subtle"
                onClick={() => {
                  setData(createEmptyAssessment());
                  setStep(0);
                  window.sessionStorage.removeItem(DRAFT_KEY);
                }}
              >
                Clear draft
              </button>
            ) : canGoBack ? (
              <button
                type="button"
                className="btn btn-subtle"
                onClick={moveBack}
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {canContinue && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={moveNext}
              >
                Continue
              </button>
            )}
            {isReviewStep && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={startAnalysis}
                disabled={isAnalyzing}
              >
                Analyze Risk
              </button>
            )}
            {step === 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={moveNext}
              >
                Start
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
