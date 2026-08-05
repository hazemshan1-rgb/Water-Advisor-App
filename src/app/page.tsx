import { SiteList } from "@/components/SiteList";

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Water Advisor</h1>
      <SiteList />
    </main>
  );
}
