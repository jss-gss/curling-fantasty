import ProfilePublicClient from "./ProfilePublicClient";

export const metadata = {
  title: "Profile | BUTTON",
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  return (
    <ProfilePublicClient username={username}/>
  )
}

