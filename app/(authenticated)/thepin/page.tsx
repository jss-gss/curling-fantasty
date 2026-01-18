import { Suspense } from "react";
import ThePinClient from "./ThePinClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ThePinClient />
    </Suspense>
  );
}
