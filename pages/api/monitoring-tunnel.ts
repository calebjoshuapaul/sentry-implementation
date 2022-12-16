import { withSentry, captureException } from "@sentry/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

// Change host appropriately if you run your own Sentry instance.
const sentryHost = "sentry.io";

// Set knownProjectIds to an array with your Sentry project IDs which you
// want to accept through this proxy.
const knownProjectIds: string[] = [
  "javascript-nextjs",
  "sentry-implementation",
  "prj_ZB6Gu0RH1crGhkX9LDjEZf9B30DM",
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const envelope = req.body;
    const pieces = envelope?.split("\n");
    console.log("**********PIECES**************", pieces);
    const header = JSON.parse(pieces[0]);
    console.log("**********HEADER**************", header);

    // DSNs are of the form `https://<key>@o<orgId>.ingest.sentry.io/<projectId>`
    const { host, pathname } = new URL(header.dsn);
    // Remove leading slash
    const projectId = pathname.substring(1);

    if (host !== sentryHost) {
      throw new Error(`invalid host: ${host}`);
    }

    if (!knownProjectIds.includes(projectId)) {
      throw new Error(`invalid project id: ${projectId}`);
    }

    const sentryIngestURL = `https://${sentryHost}/api/${projectId}/envelope/`;
    const sentryResponse = await fetch(sentryIngestURL, {
      method: "POST",
      body: envelope,
    });

    console.log(
      "*******************SENTRY_RES*********************",
      sentryResponse.headers
    );

    // Relay response from Sentry servers to front end
    sentryResponse.headers.forEach((header: any) => {
      const [key, value] = header;
      res.setHeader(key, value);
    });
    res.status(sentryResponse.status).send(sentryResponse.body);
  } catch (e) {
    captureException(e);
    return res.status(400).json({ status: "invalid request" });
  }
}

export default withSentry(handler);
