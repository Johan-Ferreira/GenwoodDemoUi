import type { Metadata } from 'next';

import { ApiReferenceView } from '@/components/api-reference/ApiReferenceView';
import { PageHeader } from '@/components/app-shell/PageHeader';
import { API_REFERENCE_SUBTITLE } from '@/components/api-reference/api-endpoints';
import { curveDataServiceUrl } from '@/lib/api/service-address';

export const metadata: Metadata = { title: 'API' };

/** API: the live service's curve endpoints and an example request and response. */
export default function ApiReferencePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="API" subtitle={API_REFERENCE_SUBTITLE} />
      <ApiReferenceView serviceBase={curveDataServiceUrl()} />
    </div>
  );
}
