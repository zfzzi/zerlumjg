import { ShieldCheck } from "@phosphor-icons/react";
import type { FormEvent } from "react";

export type AuthMode = "login" | "register";

export type AuthForm = {
  username: string;
  phone: string;
  email: string;
  password: string;
};

export type AuthDialogProps = {
  authMode: AuthMode;
  authForm: AuthForm;
  onModeChange: (mode: AuthMode) => void;
  onFormChange: (form: AuthForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function AuthField({
  label,
  value,
  type = "text",
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function AuthDialog({
  authMode,
  authForm,
  onModeChange,
  onFormChange,
  onClose,
  onSubmit,
}: AuthDialogProps) {
  return (
    <div className="modal-layer soft-backdrop" role="presentation">
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="进入 Zerlum"
      >
        <header>
          <h2>进入 Zerlum</h2>
          <button className="icon-button" onClick={onClose} type="button">
            关闭
          </button>
        </header>
        <div className="auth-brand">
          <img src="/brand/zerlum-logo-mark.png" alt="Zerlum" />
          <div>
            <h3>进入 Zerlum</h3>
            <p>登录或注册后进入景观设计工作台。</p>
          </div>
        </div>
        <div className="segmented-control" role="tablist" aria-label="登录方式">
          <button
            className={authMode === "login" ? "active" : ""}
            onClick={() => onModeChange("login")}
            type="button"
          >
            登录
          </button>
          <button
            className={authMode === "register" ? "active" : ""}
            onClick={() => onModeChange("register")}
            type="button"
          >
            注册
          </button>
        </div>
        <form className="form-stack" onSubmit={onSubmit}>
          {authMode === "register" && (
            <>
              <AuthField
                label="用户名"
                value={authForm.username}
                onChange={(username) => onFormChange({ ...authForm, username })}
                autoComplete="username"
              />
              <AuthField
                label="手机号"
                value={authForm.phone}
                onChange={(phone) => onFormChange({ ...authForm, phone })}
                autoComplete="tel"
              />
            </>
          )}
          <AuthField
            label={authMode === "login" ? "邮箱或手机号" : "邮箱号"}
            value={authForm.email}
            onChange={(email) => onFormChange({ ...authForm, email })}
            autoComplete="email"
          />
          <AuthField
            label="账户密码"
            value={authForm.password}
            type="password"
            onChange={(password) => onFormChange({ ...authForm, password })}
            autoComplete={authMode === "login" ? "current-password" : "new-password"}
          />
          <button className="primary-button full monochrome" type="submit">
            <ShieldCheck size={18} weight="bold" />
            {authMode === "login" ? "登录" : "注册并继续"}
          </button>
        </form>
      </section>
    </div>
  );
}
