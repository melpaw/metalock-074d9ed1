import { createFileRoute, redirect } from "@tanstack/react-router";

// Agents share the same panel as Admin (with Team hidden). Redirect legacy /agent URLs.
export const Route = createFileRoute("/_authenticated/agent")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  component: () => null,
});
