import { PageHeader } from "../components/PageHeader";

const topics = ["ActivityPub", "Fedify", "Hono", "Bun", "PostgreSQL"];

export function ExplorePage() {
  return (
    <section className="page">
      <PageHeader
        title="Explore"
        description="Topics and public conversations on this instance."
      />
      <Flex gap="small" wrap>
        {topics.map((topic) => (
          <Card key={topic} size="small">
            <a href={`/explore?tag=${topic}`}>
              <Tag color="green">#{topic}</Tag>
            </a>
          </Card>
        ))}
      </Flex>
    </section>
  );
}
import { Card, Flex, Tag } from "antd";
