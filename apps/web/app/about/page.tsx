import Link from "next/link";
import { SiteHeader, SiteFooter } from "../components/SiteShell";
export default function AboutPage() {
  return (
    <main>
      <SiteHeader />
      <section className="section" id="content">
        <div className="container stack">
          <div className="card-panel">
            <span className="eyebrow">THE SCIENCE, IN CONTEXT</span>
            <h1 className="type-h1" style={{ marginTop: 20 }}>
              Clarity begins with
              <br />
              knowing the limits.
            </h1>
            <p className="lead">
              HeartLens AI explores model-estimated cardiovascular disease
              likelihood. The dataset target records disease presence, with no
              prediction horizon. The output is an educational model estimate,
              not a clinical diagnosis.
            </p>
          </div>
          <div className="results-layout">
            <div className="card-panel">
              <h2 className="type-h3">Eleven inputs. One learned pattern.</h2>
              <p className="lead">
                Age in years; sex category; height in cm; weight in kg; systolic
                and diastolic blood pressure in mmHg; reported cholesterol and
                glucose categories; smoking, alcohol and physical activity.
              </p>
              <p className="lead">
                The backend derives BMI and additional features using the shared
                training pipeline. A selected estimator is calibrated before
                serving. Each live result identifies its actual model and
                artifact version.
              </p>
            </div>
            <div className="card-panel">
              <h2 className="type-h3">Every assumption stays visible.</h2>
              <p className="lead">
                Missing model values need explicit approval before prediction. A
                diabetes diagnosis never substitutes for a reported glucose
                category. HDL, family history and BP medication are collected as
                context and do not affect model inference.
              </p>
              <p className="lead">
                Scenarios re-run the same model with supported changed inputs.
                Their differences are not causal treatment effects.
              </p>
            </div>
          </div>
          <div className="card-panel">
            <h2 className="type-h3">Honest explanations.</h2>
            <p className="lead">
              Raw estimator SHAP values may explain a different scale from the
              served calibrated probability. When a truthful calibrated
              explanation is unavailable, HeartLens AI says so rather than
              inventing drivers or displaying raw contributions as percentage
              points.
            </p>
            <h2 className="type-h3" style={{ marginTop: 32 }}>
              Data & provenance.
            </h2>
            <p className="lead">
              The training pipeline uses the Kaggle Cardiovascular Disease
              dataset. Population coverage, self-reported inputs, data cleaning
              and calibration limit generalization. Historical upstream metrics
              are not presented as measurements of the current artifact. See the
              local model card and provenance documentation for training
              details.
            </p>
            <a
              className="btn btn-subtle"
              href="https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset"
              target="_blank"
              rel="noreferrer"
            >
              Dataset source ↗
            </a>
          </div>
          <div className="card-panel">
            <h2 className="type-h3">Built with care. Credited honestly.</h2>
            <p className="lead">
              Interface redesign and adaptation by{" "}
              <strong>Himanshu Chauhan</strong>. The adaptation adds an original
              responsive interface, truthful prediction contracts, explicit
              assumptions, same-model scenarios and safer sharing.
            </p>
            <p className="lead">
              Based on{" "}
              <a
                href="https://github.com/shlokkvaishnav/cardiovascular-risk"
                target="_blank"
                rel="noreferrer"
              >
                <u>the upstream cardiovascular-risk project</u>
              </a>
              , audited at commit 1308460473b9f67eeb8fe5513c1540cbad393a8f.
              Upstream MIT license and permission notices are preserved.
            </p>
            <Link className="btn btn-primary" href="/assess">
              Explore your profile →
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
