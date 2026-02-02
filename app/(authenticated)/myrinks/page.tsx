export const metadata = {
  title: "My Rinks | BUTTON",
}

import MyRinksClient from "./MyRinksClient"
import { Suspense } from "react"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MyRinksClient />
    </Suspense>
  )
}
