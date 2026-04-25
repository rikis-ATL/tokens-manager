import { redirect } from 'next/navigation';

/** Legacy URL: `/config` now lives at `/output`. */
export default function CollectionConfigRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/collections/${params.id}/output`);
}
