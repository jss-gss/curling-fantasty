export const metadata = {
  title: "League Play | BUTTON",
}

import LeaguePlayClient from "./LeaguePlayClient"
import { Suspense } from "react"

export default function Page() {
  return(
  <Suspense fallback={<div>Loading...</div>}>
    <LeaguePlayClient />
  </Suspense>
  )
}