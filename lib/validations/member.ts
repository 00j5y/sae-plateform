import { z } from "zod";

export const activateMemberSchema = z.object({
  profileId: z.string().uuid()
});
