import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma.js";

export const sharesRouter = Router();

/** POST /api/shares */
sharesRouter.post("/", async (req: Request, res: Response) => {
  const { workspaceId, label, snapshotJson, expiresAt } = req.body as {
    workspaceId: string;
    label?: string;
    snapshotJson: Record<string, unknown>;
    expiresAt?: string;
  };

  if (!workspaceId || !snapshotJson) {
    res.status(400).json({ error: "workspaceId and snapshotJson are required" });
    return;
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const token = randomBytes(24).toString("base64url");
  const share = await prisma.shareLink.create({
    data: {
      workspaceId,
      token,
      label,
      snapshotJson,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  res.status(201).json(share);
});

/** GET /api/shares/workspace/:workspaceId */
sharesRouter.get("/workspace/:workspaceId", async (req: Request, res: Response) => {
  const shares = await prisma.shareLink.findMany({
    where: { workspaceId: req.params.workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      label: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  res.json(shares);
});

/** GET /api/shares/:token */
sharesRouter.get("/:token", async (req: Request, res: Response) => {
  const share = await prisma.shareLink.findUnique({ where: { token: req.params.token } });
  if (!share) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }
  if (share.revokedAt) {
    res.status(403).json({ error: "Share link has been revoked" });
    return;
  }
  if (share.expiresAt && share.expiresAt < new Date()) {
    res.status(403).json({ error: "Share link has expired" });
    return;
  }
  res.json(share);
});

/** DELETE /api/shares/:token */
sharesRouter.delete("/:token", async (req: Request, res: Response) => {
  const share = await prisma.shareLink.findUnique({ where: { token: req.params.token } });
  if (!share) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }
  const updated = await prisma.shareLink.update({
    where: { token: req.params.token },
    data: { revokedAt: new Date() },
  });
  res.json(updated);
});
