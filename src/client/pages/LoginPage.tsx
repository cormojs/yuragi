import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { login } from "../api/authApi";
import { PageHeader } from "../components/PageHeader";

export function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const account = await login(identifier, password);
      window.dispatchEvent(new Event("yuragi-auth-change"));
      navigate(`/users/${account.username}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page">
      <PageHeader title="Log in" description="Sign in to your yuragi account." />
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Account identifier
          <input
            autoComplete="username"
            onChange={(event) => setIdentifier(event.target.value)}
            required
            value={identifier}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error != null ? <p className="form-error">{error}</p> : null}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </section>
  );
}
