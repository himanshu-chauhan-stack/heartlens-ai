import Link from "next/link";
import { HeartMonitor } from "./components/HeartMonitor";
import {
  ArrowUpRight,
  ArrowRight,
  SlidersHorizontal,
  ShieldCheck,
  FileText,
  Check,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "./components/SiteShell";
export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="landing-hero" id="content">
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-dot" /> A LITTLE CLARITY GOES A LONG WAY
            </div>
            <h1>
              Understand your
              <br />
              cardiovascular
              <br />
              <span>profile.</span>
            </h1>
            <p>
              Your health is more than a number. Explore your measurements,
              understand a model estimate, and make room for better
              conversations.
            </p>
            <div className="cta-row">
              <Link className="btn btn-lime" href="/assess">
                Start assessment <ArrowUpRight size={20} />
              </Link>
              <Link className="hero-text-link" href="/about">
                Meet the methodology <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-footnote">
              <ShieldCheck size={16} /> No account needed. Your inputs, your
              control.
            </div>
          </div>
          <div className="specimen">
            <div className="specimen-top">
              <span>YOUR PROFILE, IN FOCUS</span>
              <span className="specimen-status">
                <span className="tiny-dot" /> Example
              </span>
            </div>
            <div className="specimen-body">
              <span className="specimen-label">
                Model-estimated CVD likelihood
              </span>
              <div className="specimen-score">
                28<span>.4%</span>
              </div>
              <div className="specimen-band">
                Low model category <ArrowUpRight size={16} />
              </div>
              <div className="spectrum">
                <i />
              </div>
              <div className="spectrum-labels">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
              <div className="specimen-divider" />
              <div className="specimen-row">
                <span>
                  <span className="specimen-icon">
                    <SlidersHorizontal size={17} />
                  </span>{" "}
                  Explore a different input
                </span>
                <span>→</span>
              </div>
              <div className="specimen-input">
                <span>Systolic blood pressure</span>
                <strong>
                  120 <small>mmHg</small>
                </strong>
              </div>
              <div className="mock-slider">
                <span />
              </div>
              <HeartMonitor compact />
            </div>
            <div className="specimen-caption">
              Example — not your result. Illustrative interface only.
            </div>
            <div className="specimen-stamp">
              <Check size={19} />
              <div>
                Transparent by design
                <small>Inputs. Assumptions. Model source.</small>
              </div>
            </div>
          </div>
        </div>
        <div className="container hero-bottom">
          <span>
            SEE THE PROFILE.
            <br />
            UNDERSTAND THE CONTEXT.
          </span>
          <span>
            Built for curiosity.
            <br />
            Designed for clarity.
          </span>
          <span className="hero-scroll">EXPLORE BELOW ↓</span>
        </div>
      </section>
      <section className="section journey" id="how-it-works">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FROM INPUT TO INSIGHT</span>
              <h2>
                A more considered
                <br />
                way to understand.
              </h2>
            </div>
            <p>
              Real model inference, with the context that makes it useful. No
              hidden assumptions. No instant diagnoses.
            </p>
          </div>
          <div className="journey-grid">
            {[
              {
                n: "01",
                title: "Bring your numbers.",
                body: "Add your age, blood pressure, measurements, lab categories and everyday habits.",
                icon: FileText,
              },
              {
                n: "02",
                title: "See the full picture.",
                body: "Read the model estimate alongside its source, inputs and any assumptions you chose.",
                icon: ShieldCheck,
              },
              {
                n: "03",
                title: "Make space for what if.",
                body: "Explore supported input changes using the same model. Take a report to your next conversation.",
                icon: SlidersHorizontal,
              },
            ].map((x) => (
              <article key={x.n}>
                <div className="journey-top">
                  <span>{x.n}</span>
                  <x.icon size={23} />
                </div>
                <h3>{x.title}</h3>
                <p>{x.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section prepare">
        <div className="container prepare-layout">
          <div>
            <span className="eyebrow">BEFORE YOU BEGIN</span>
            <h2>
              A few details.
              <br />A clearer starting point.
            </h2>
            <p className="lead">
              Have recent measurements nearby. Missing a value? You can review
              explicit assumptions before proceeding.
            </p>
            <Link href="/assess" className="btn btn-primary">
              Build your profile <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="preparation-list">
            {[
              "Age and sex at birth",
              "Height, weight and blood pressure",
              "Cholesterol and reported glucose category",
              "Smoking, activity and alcohol context",
            ].map((x, i) => (
              <div key={x}>
                <span>0{i + 1}</span>
                {x}
                <Check size={18} />
              </div>
            ))}
            <p>
              Educational disease-presence estimate. No future-event horizon.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
