import DraftClient from "./DraftClient"

export const metadata = {
  title: "Draft Room | BUTTON",
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <DraftClient slug={slug} />
}
