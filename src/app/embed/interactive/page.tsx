import { headers } from "next/headers";
import InteractiveEmbedClient from "./InteractiveEmbedClient";

export default async function InteractiveEmbedPage(props: {
  searchParams: Promise<{ directiveId?: string; sessionId?: string; meta?: string }>;
}) {
  const reqHeaders = await headers();
  const authHeader = reqHeaders.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const userId = reqHeaders.get("x-user-id") || "";
  const resolvedParams = await props.searchParams;

  return (
    <InteractiveEmbedClient
      directiveId={resolvedParams.directiveId || ""}
      sessionId={resolvedParams.sessionId || ""}
      metaStr={resolvedParams.meta || ""}
      token={token}
      userId={userId}
    />
  );
}
