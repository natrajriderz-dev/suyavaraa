const trustSignals = [
  "Gmail verification before login",
  "Mobile OTP onboarding",
  "Selfie or video identity checks",
  "Optional ID card review by admin team",
];

const adminCapabilities = [
  "Verification review queue",
  "Executive read-only access",
  "Admin moderation controls",
  "Audit-friendly activity tracking",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f7efe5_45%,#ead7bf_100%)] text-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
        <header className="mb-14 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-deep">
              Suyavaraa
            </p>
            <p className="mt-2 text-sm text-muted">
              Dating and matrimony with verification-first trust.
            </p>
          </div>
          <a
            href="#deploy"
            className="rounded-full border border-accent/20 bg-surface px-4 py-2 text-sm font-semibold text-accent-deep shadow-sm transition hover:-translate-y-0.5"
          >
            Deployment Notes
          </a>
        </header>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-accent/20 bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
              Ready For Vercel Preview
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              Trusted matchmaking for people who want a safer first hello.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              This web entrypoint is prepared for deployment while the core mobile
              trust flow stays centered on Gmail verification, mobile OTP, selfie
              review, optional ID upload, and role-based admin operations.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#trust"
                className="rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_18px_40px_rgba(180,83,9,0.25)] transition hover:-translate-y-0.5 hover:bg-accent-deep"
              >
                Explore Trust Layers
              </a>
              <a
                href="#admin"
                className="rounded-full border border-accent/20 bg-surface px-6 py-3 text-center text-sm font-semibold text-accent-deep transition hover:-translate-y-0.5"
              >
                View Admin Scope
              </a>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,250,244,0.92),rgba(249,235,219,0.92))] p-6 shadow-[0_24px_70px_rgba(124,45,18,0.12)] backdrop-blur">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/80 p-5">
                <p className="text-sm text-muted">Verification</p>
                <p className="mt-2 text-3xl font-semibold">4-layer</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Email, phone, selfie/video, and optional ID review.
                </p>
              </div>
              <div className="rounded-3xl bg-[#fff4e8] p-5">
                <p className="text-sm text-muted">Ops Access</p>
                <p className="mt-2 text-3xl font-semibold">3 roles</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Executive, admin, and super admin separation.
                </p>
              </div>
              <div className="rounded-3xl bg-[#fff4e8] p-5 sm:col-span-2">
                <p className="text-sm text-muted">Current Deployment Intent</p>
                <p className="mt-2 text-xl font-semibold">
                  Launch a stable branded web presence on Vercel first, then attach
                  <span className="text-accent-deep"> suyavaraa.in</span>.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section id="trust" className="mx-auto max-w-6xl px-6 pb-10 sm:px-10 lg:px-12">
        <div className="rounded-[2rem] bg-surface px-6 py-8 shadow-[0_18px_60px_rgba(29,20,15,0.08)] sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
            Trust Layers
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {trustSignals.map((signal) => (
              <div
                key={signal}
                className="rounded-3xl border border-[#ead7bf] bg-white px-5 py-5 text-base font-medium shadow-sm"
              >
                {signal}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="admin" className="mx-auto max-w-6xl px-6 pb-10 sm:px-10 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] bg-[#2a1b14] px-6 py-8 text-white shadow-[0_18px_60px_rgba(42,27,20,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f8c58a]">
              Admin Console
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Review identity submissions without mixing executive and moderator powers.
            </h2>
          </div>
          <div className="grid gap-4">
            {adminCapabilities.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-[#ead7bf] bg-surface px-5 py-5 text-base font-medium text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="deploy" className="mx-auto max-w-6xl px-6 pb-16 sm:px-10 lg:px-12">
        <div className="rounded-[2rem] border border-accent/15 bg-white px-6 py-8 shadow-[0_18px_60px_rgba(29,20,15,0.08)] sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-deep">
            Deploy Checklist
          </p>
          <div className="mt-5 space-y-3 text-base leading-7 text-muted">
            <p>Import the repository into Vercel and set the project Root Directory to <code>apps/web</code>.</p>
            <p>Use the generated preview deployment to verify the web version before mapping <code>suyavaraa.in</code>.</p>
            <p>After preview looks right, add <code>suyavaraa.in</code> and <code>www.suyavaraa.in</code> in Vercel Domains and update DNS at your registrar.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
