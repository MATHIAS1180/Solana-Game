import { contentType, generateRoomSocialImage, size } from "./social-image";

export { contentType, size };

export default async function OpenGraphImage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  return generateRoomSocialImage(room);
}
