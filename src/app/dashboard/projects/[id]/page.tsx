import Link from 'next/link';
import { Alert, Card, Typography } from 'antd';
import { ProjectDetailsClient } from '@/components/dashboard/ProjectDetailsClient';
import { fetchProjectDetails } from '@/lib/api';

const { Title } = Typography;

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const data = await fetchProjectDetails(id);
    return (
      <div>
        <Link href="/dashboard/projects" className="text-sm text-blue-500 hover:text-blue-700 mb-2 inline-block">
          &larr; Back to Projects
        </Link>
        <Card>
          <ProjectDetailsClient data={data} />
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <div>
        <Link href="/dashboard/projects" className="text-sm text-blue-500 hover:text-blue-700 mb-2 inline-block">
          &larr; Back to Projects
        </Link>
        <Card>
          <Title level={3}>Project Details</Title>
          <Alert
            type="warning"
            showIcon
            title="Unable to load project details"
            description={error instanceof Error ? error.message : 'Something went wrong'}
          />
        </Card>
      </div>
    );
  }
}
