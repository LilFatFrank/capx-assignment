import { redirect } from "next/navigation";
import { firestoreDB } from "@/utils/firebaseAdmin";
import EntriesList from "../../../../components/EntriesList";
import { isAuthenticated } from "@/utils/serverAuth";

export default async function TopicEntriesPage(
  props: Awaited<ReturnType<() => Promise<{ params: { topicId: string } }>>>
) {
  const { params } = props;
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  const topicDoc = await firestoreDB
    .collection("topics")
    .doc(params.topicId)
    .get();

  if (!topicDoc.exists) {
    redirect("/admin");
  }

  const topic = topicDoc.data();

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <a
          href="/admin"
          className="text-blue-500 hover:text-blue-700 mb-6 inline-block"
        >
          ← Back to Dashboard
        </a>
        <h1 className="text-2xl font-bold mb-2">{topic?.name}</h1>
        <p className="text-gray-600 mb-4">{topic?.description}</p>
      </div>
      <EntriesList topicId={params.topicId} topicName={topic?.name || ""} />
    </div>
  );
}
