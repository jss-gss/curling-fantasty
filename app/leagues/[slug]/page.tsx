import CompletedLeagueClient from "./CompletedLeagueClient"

export const metadata = {
  title: "Fantasy League Results | BUTTON",
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <CompletedLeagueClient params={params} />
  )
}