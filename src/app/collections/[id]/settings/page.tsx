import { redirect } from 'next/navigation';

export default function CollectionSettingsIndexPage({ params }: { params: { id: string } }) {
  redirect(`/collections/${params.id}/settings/figma`);
}
