import ProfilePublicClient from "./ProfilePublicClient";

export const metadata = {
  title: "Profile | BUTTON",
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat bg-fixed pt-10"
      style={{ backgroundImage: "url('/webpage/profile-page.png')" }}
    >
      <ProfilePublicClient username={username}/>
    </div>
  )
}

