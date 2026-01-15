import DraftClient from "./DraftClient"

export const metadata = {
  title: "Draft Room | BUTTON",
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <DraftClient params={params} />
  )
}