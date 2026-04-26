import { redirect } from 'next/navigation';

/** The /themes route has moved into the Tokens page. Redirect visitors seamlessly. */
export default function CollectionThemesPage({ params }: { params: { id: string } }) {
  redirect(`/collections/${params.id}/tokens`);
}
