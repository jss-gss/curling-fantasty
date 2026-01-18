import ProfileClient from "./ProfileClient"

export const metadata = {
  title: "Profile | BUTTON",
}

export default function Page() {
  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat bg-fixed pt-10"
      style={{ backgroundImage: "url('/webpage/profile-page.png')" }}
    >
      <ProfileClient />
    </div>
  )
}
