/**
 * The illustrated profile icons shared by the student portal (the avatar a
 * student picks on their "Me" page) and the parent portal (the face shown for
 * each linked child). Files live in public/avatars/students/.
 *
 * Order matters: the parent portal hashes student IDs into this list, so
 * reordering it changes which icon each child gets there.
 */
export const STUDENT_AVATAR_IDS = [
  "boy_01_green_hoodie",
  "girl_01_yellow_hoodie",
  "boy_02_blue_hoodie_glasses",
  "girl_02_pink_hoodie_braids",
  "boy_03_yellow_hoodie",
  "girl_03_purple_hoodie_ponytail",
  "boy_04_red_hoodie",
  "girl_04_blue_hoodie",
  "boy_05_cap_teal_hoodie",
  "girl_05_pink_hoodie_headband",
] as const;

export type StudentAvatarId = (typeof STUDENT_AVATAR_IDS)[number];

export const studentAvatarSrc = (id: StudentAvatarId) => `/avatars/students/${id}.png`;

export const isStudentAvatarId = (value: unknown): value is StudentAvatarId =>
  (STUDENT_AVATAR_IDS as readonly unknown[]).includes(value);
