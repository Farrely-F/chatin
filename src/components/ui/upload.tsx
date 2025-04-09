"use client";

export function UploadPdfForm({
  agentId,
  knowledgeBaseId,
}: {
  agentId: string;
  knowledgeBaseId: string;
}) {
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fileInput = e.currentTarget.elements.namedItem(
      "file",
    ) as HTMLInputElement;

    if (!fileInput.files?.[0]) return;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("knowledgeBaseId", knowledgeBaseId);

    const res = await fetch(`/api/agents/${agentId}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    alert(`Uploaded and embedded ${data.chunks} chunks!`);
  };

  return (
    <form onSubmit={handleUpload}>
      <input type="file" name="file" accept="application/pdf" />
      <button type="submit">Upload PDF</button>
    </form>
  );
}
