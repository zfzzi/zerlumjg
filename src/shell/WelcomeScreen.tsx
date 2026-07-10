import { ArrowUp } from "@phosphor-icons/react";

export type WelcomeScreenProps = {
  actionLabel?: string;
  onOpenLogin: () => void;
};

export default function WelcomeScreen({
  actionLabel = "进入 Zerlum",
  onOpenLogin,
}: WelcomeScreenProps) {
  return (
    <section className="welcome-screen">
      <div className="welcome-landscape-field" aria-hidden="true" />
      <div className="welcome-card">
        <img
          className="logo-mark-image"
          src="/brand/zerlum-logo-mark.png"
          alt="Zerlum"
        />
        <div className="welcome-copy">
          <h1>从场地到方案</h1>
          <p>理解场地，推演方向，完成表达。</p>
        </div>
        <button
          className="welcome-primary-action"
          type="button"
          onClick={onOpenLogin}
        >
          {actionLabel}
          <ArrowUp size={18} weight="bold" />
        </button>
      </div>
    </section>
  );
}
