export const metadata = {
  title: "How It Works | BUTTON",
}

import HowClient from "./HowClient"
import { Suspense } from "react"

export default function Page() {
  return(
    <Suspense fallback={<div>Loading...</div>}>
      <HowClient />
    </Suspense>
  )
}
