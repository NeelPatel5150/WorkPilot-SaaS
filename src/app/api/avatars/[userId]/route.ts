import { getUserAvatar } from "@/services/profile.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  if (!userId) {
    return new Response("Not found", { status: 404 });
  }

  const avatar = await getUserAvatar(userId);
  if (!avatar) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(avatar.data), {
    status: 200,
    headers: {
      "Content-Type": avatar.mime,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
