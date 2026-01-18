import LeagueClient from "./LeagueClient"

export const metadata = {
  title: "League | BUTTON",
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <LeagueClient params={params} />
  )
}