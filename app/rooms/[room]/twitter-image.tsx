import { contentType, generateRoomSocialImage, size } from "./social-image";

export { contentType, size };

export default async function TwitterImage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return generateRoomSocialImage(room);
}
