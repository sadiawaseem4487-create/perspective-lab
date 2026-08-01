import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { fetchInvite, submitInviteAnswer } from "@/api";
import BrandLogo from "@/components/BrandLogo";
import { PageAlert } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";
import { displayQuestion } from "@/utils/uniqueReports";

const emptyForm = () => ({
  name: "",
  role: "",
  organization: "",
  email: "",
  answer: "",
});

export default function GuestInvitePage() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchInvite(token)
      .then((data) => {
        setInvite(data);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await submitInviteAnswer(token, form);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="workspace-canvas min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              PerspectiveLab
            </p>
            <h1 className="font-display text-xl font-bold text-white">
              {t("invite.title")}
            </h1>
          </div>
        </header>

        {loading && <p className="text-slate-400">{t("invite.loading")}</p>}
        {error && <PageAlert>{error}</PageAlert>}

        {!loading && invite && (
          <>
            {invite.case_title && (
              <p className="text-sm text-slate-400">
                <FlaskConical className="mr-1 inline h-3.5 w-3.5" />
                {invite.case_title}
                {invite.label ? ` · ${invite.label}` : ""}
              </p>
            )}

            <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">
                {t("invite.questionLabel")}
              </p>
              <p className="mt-2 font-display text-lg font-semibold leading-snug text-white">
                {displayQuestion(invite.question)}
              </p>
            </section>

            {done ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                <p className="mt-3 font-display text-xl font-semibold text-white">
                  {t("invite.thanks")}
                </p>
                <p className="mt-2 text-sm text-slate-400">{t("invite.thanksBody")}</p>
              </div>
            ) : !invite.open ? (
              <PageAlert>{invite.closed_reason || t("invite.closed")}</PageAlert>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5 sm:p-6"
              >
                <p className="text-sm text-slate-400">{t("invite.formIntro")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder={t("invite.namePh")}
                    className="page-input"
                  />
                  <input
                    value={form.role}
                    onChange={(e) => update("role", e.target.value)}
                    placeholder={t("invite.rolePh")}
                    className="page-input"
                  />
                  <input
                    value={form.organization}
                    onChange={(e) => update("organization", e.target.value)}
                    placeholder={t("invite.orgPh")}
                    className="page-input"
                  />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder={t("invite.emailPh")}
                    className="page-input"
                  />
                </div>
                <textarea
                  required
                  minLength={5}
                  rows={8}
                  value={form.answer}
                  onChange={(e) => update("answer", e.target.value)}
                  placeholder={t("invite.answerPh")}
                  className="page-input w-full"
                />
                <button type="submit" disabled={saving} className="page-btn-primary w-full sm:w-auto">
                  {saving ? t("invite.sending") : t("invite.submit")}
                </button>
              </form>
            )}
          </>
        )}

        <p className="text-center text-xs text-slate-600">
          <Link to="/" className="hover:text-slate-400">
            PerspectiveLab
          </Link>
        </p>
      </div>
    </div>
  );
}
