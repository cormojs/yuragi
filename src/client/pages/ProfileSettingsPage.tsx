import { Alert, Button, Card, Flex, Input, Spin, Switch, Typography } from "antd";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  getCurrentAccount,
  type AuthenticatedAccount,
  updateProfile,
} from "../api/client";
import { PageHeader } from "../components/PageHeader";

type ProfileForm = Omit<AuthenticatedAccount, "username">;

function getProfileForm(account: AuthenticatedAccount): ProfileForm {
  return {
    displayName: account.displayName,
    note: account.note,
    discoverable: account.discoverable,
    indexable: account.indexable,
  };
}

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getCurrentAccount()
      .then((account) => {
        if (account == null) {
          navigate("/login", { replace: true });
          return;
        }
        setProfile(getProfileForm(account));
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load profile.");
      });
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profile == null || isSaving) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateProfile(profile);
      setProfile(getProfileForm(updated));
      setSuccess("Profile updated.");
      window.dispatchEvent(new Event("yuragi-auth-change"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  if (profile == null) {
    return (
      <section className="page">
        <PageHeader title="Edit profile" description="Update your public profile." />
        {error == null ? <Spin tip="Loading profile..." /> : null}
        {error != null ? <Alert message={error} showIcon type="error" /> : null}
      </section>
    );
  }

  return (
    <section className="page">
      <PageHeader title="Edit profile" description="Update your public profile." />
      <Card>
        <form onSubmit={handleSubmit}>
          <Flex gap="middle" vertical>
            <label htmlFor="display-name">
              <Typography.Text strong>Display name</Typography.Text>
            </label>
            <Input
              id="display-name"
              maxLength={30}
              onChange={(event) =>
                setProfile((current) =>
                  current == null ? current : { ...current, displayName: event.target.value },
                )
              }
              value={profile.displayName}
            />
            <label htmlFor="profile-note">
              <Typography.Text strong>Bio</Typography.Text>
            </label>
            <Input.TextArea
              id="profile-note"
              maxLength={500}
              onChange={(event) =>
                setProfile((current) =>
                  current == null ? current : { ...current, note: event.target.value },
                )
              }
              rows={5}
              value={profile.note}
            />
            <Flex align="center" justify="space-between">
              <div>
                <Typography.Text strong>Discoverable</Typography.Text>
                <Typography.Paragraph type="secondary">
                  Include this account in public discovery.
                </Typography.Paragraph>
              </div>
              <Switch
                checked={profile.discoverable}
                onChange={(discoverable) =>
                  setProfile((current) =>
                    current == null ? current : { ...current, discoverable },
                  )
                }
              />
            </Flex>
            <Flex align="center" justify="space-between">
              <div>
                <Typography.Text strong>Search indexing</Typography.Text>
                <Typography.Paragraph type="secondary">
                  Allow search engines to index this profile.
                </Typography.Paragraph>
              </div>
              <Switch
                checked={profile.indexable}
                onChange={(indexable) =>
                  setProfile((current) =>
                    current == null ? current : { ...current, indexable },
                  )
                }
              />
            </Flex>
            <Button htmlType="submit" loading={isSaving} type="primary">
              Save changes
            </Button>
            {success != null ? <Alert message={success} showIcon type="success" /> : null}
            {error != null ? <Alert message={error} showIcon type="error" /> : null}
          </Flex>
        </form>
      </Card>
    </section>
  );
}
