import { Suspense } from "react"
import ThePinClient from "./ThePinClient"

export const metadata = {
  title: "The Pin | BUTTON",
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ThePinClient />
    </Suspense>
  )
}
