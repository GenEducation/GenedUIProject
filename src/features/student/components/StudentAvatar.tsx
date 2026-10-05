import Image from "next/image";
import { studentAvatarSrc, type StudentAvatarId } from "@/constants/studentAvatars";

interface StudentAvatarProps {
  id: StudentAvatarId;
  /** Rendered pixel size, so next/image can serve an appropriately sized file. */
  size: number;
  alt?: string;
}

/**
 * The student's chosen profile icon. Fills its container, which is expected
 * to be a fixed-size circle with overflow hidden. Scaled a touch so the
 * icon's baked-in white edge falls outside that clip.
 */
export function StudentAvatar({ id, size, alt = "Student avatar" }: StudentAvatarProps) {
  return (
    <Image
      src={studentAvatarSrc(id)}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scale(1.035)" }}
    />
  );
}
