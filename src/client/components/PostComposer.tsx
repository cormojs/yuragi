import { Alert, Button, Card, Flex, Input, Typography } from "antd";
import { type FormEvent, useState } from "react";
import { createStatus } from "../api/client";

export function PostComposer({ onPosted }: { onPosted: () => Promise<void> }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remainingCharacters = 500 - content.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (content.trim().length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createStatus(content);
      setContent("");
      await onPosted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to publish post.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <form onSubmit={handleSubmit}>
        <Flex gap="middle" vertical>
          <Typography.Text strong>Write a post</Typography.Text>
          <Input.TextArea
            maxLength={500}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What's happening?"
            required
            rows={4}
            value={content}
          />
          <Flex align="center" justify="space-between">
            <Typography.Text type="secondary">
              {remainingCharacters} characters remaining
            </Typography.Text>
            <Button
              disabled={content.trim().length === 0}
              htmlType="submit"
              loading={isSubmitting}
              type="primary"
            >
              Post
            </Button>
          </Flex>
          {error != null ? <Alert message={error} showIcon type="error" /> : null}
        </Flex>
      </form>
    </Card>
  );
}
