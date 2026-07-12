import { Alert, Button, Card, Form, Input } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import { login } from "../api/client";
import { PageHeader } from "../components/PageHeader";

type LoginValues = {
  identifier: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit({ identifier, password }: LoginValues) {
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
    <section className="page login-page">
      <PageHeader title="Log in" description="Sign in to your yuragi account." />
      <Card>
        <Form<LoginValues> layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Account identifier" name="identifier" rules={[{ required: true }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          {error != null ? <Alert message={error} showIcon style={{ marginBottom: 16 }} type="error" /> : null}
          <Button htmlType="submit" loading={isSubmitting} type="primary">
            Log in
          </Button>
        </Form>
      </Card>
    </section>
  );
}
