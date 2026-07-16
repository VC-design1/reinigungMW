import { TemplateEditor } from "./template-editor";

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Neue Checklisten-Vorlage</h1>
      <TemplateEditor error={error} />
    </div>
  );
}
