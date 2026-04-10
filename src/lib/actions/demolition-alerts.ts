"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateDemolition(projectId: string) {
  revalidatePath("/demolition-alerts");
  revalidatePath(`/demolition-alerts/${projectId}`);
  revalidatePath("/");
  revalidatePath("/dashboard/demolition-alerts");
  revalidatePath(`/dashboard/demolition-alerts/${projectId}`);
}

type ElementInput = {
  title: string;
  description?: string;
  isFree: boolean;
  pricePence?: number | null;
  removalMustCompleteBy?: string | null;
  pickupWhereWhen?: string;
  conditions?: string;
  quantityNote?: string;
};

function parseElementsJson(raw: string): ElementInput[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const out: ElementInput[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") return null;
    const o = row as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    if (!title) return null;
    const isFree = Boolean(o.isFree);
    let pricePence: number | null = null;
    if (!isFree) {
      const p = Number(o.pricePence);
      if (!Number.isFinite(p) || p <= 0) return null;
      pricePence = Math.round(p);
    }
    let removalMustCompleteBy: string | null = null;
    if (typeof o.removalMustCompleteBy === "string" && o.removalMustCompleteBy.trim()) {
      const d = new Date(o.removalMustCompleteBy);
      if (!Number.isNaN(d.getTime())) removalMustCompleteBy = d.toISOString();
    }
    out.push({
      title,
      description: String(o.description ?? "").trim() || undefined,
      isFree,
      pricePence,
      removalMustCompleteBy,
      pickupWhereWhen: String(o.pickupWhereWhen ?? "").trim() || undefined,
      conditions: String(o.conditions ?? "").trim() || undefined,
      quantityNote: String(o.quantityNote ?? "").trim() || undefined,
    });
  }
  return out;
}

export async function createDemolitionProjectAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=%2Fdashboard%2Fdemolition-alerts%2Fnew");

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!sellerProfile) redirect("/dashboard/onboarding");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const siteAddress = String(formData.get("siteAddress") ?? "").trim() || null;
  const postcodeRaw = String(formData.get("postcode") ?? "").trim();
  const accessWhereWhen = String(formData.get("accessWhereWhen") ?? "").trim() || null;
  const conditionsGeneral = String(formData.get("conditionsGeneral") ?? "").trim() || null;
  const publishIntent = String(formData.get("publishIntent") ?? "draft").trim();
  const imagesRaw = String(formData.get("imagesJson") ?? "").trim();
  const elementsRaw = String(formData.get("elementsJson") ?? "").trim();

  if (!title || !description || !postcodeRaw) {
    redirect("/dashboard/demolition-alerts/new?error=" + encodeURIComponent("Title, description, and postcode are required."));
  }

  const resolved = await lookupUkPostcode(postcodeRaw);
  if (!resolved) {
    redirect(
      "/dashboard/demolition-alerts/new?error=" +
        encodeURIComponent("Enter a full valid UK postcode (e.g. SW1A 1AA).")
    );
  }

  const elements = parseElementsJson(elementsRaw);
  if (!elements) {
    redirect("/dashboard/demolition-alerts/new?error=" + encodeURIComponent("Add at least one lot with a title."));
  }

  let images: string[] = [];
  if (imagesRaw) {
    try {
      const arr = JSON.parse(imagesRaw) as unknown;
      if (Array.isArray(arr)) {
        images = arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
      }
    } catch {
      /* ignore */
    }
  }

  const shouldPublish = publishIntent === "publish";
  const project = await prisma.demolitionProject.create({
    data: {
      organizerId: session.user.id,
      title,
      description,
      siteAddress,
      postcode: resolved.postcode,
      lat: resolved.lat,
      lng: resolved.lng,
      adminDistrict: resolved.adminDistrict,
      region: resolved.region,
      postcodeLocality: resolved.postcodeLocality,
      accessWhereWhen,
      conditionsGeneral,
      images,
      status: shouldPublish ? "active" : "draft",
      publishedAt: shouldPublish ? new Date() : null,
      elements: {
        create: elements.map((el, i) => ({
          title: el.title,
          description: el.description ?? null,
          isFree: el.isFree,
          pricePence: el.isFree ? null : el.pricePence,
          removalMustCompleteBy: el.removalMustCompleteBy ? new Date(el.removalMustCompleteBy) : null,
          pickupWhereWhen: el.pickupWhereWhen ?? null,
          conditions: el.conditions ?? null,
          quantityNote: el.quantityNote ?? null,
          sortOrder: i,
        })),
      },
    },
    select: { id: true },
  });

  revalidateDemolition(project.id);
  redirect(`/dashboard/demolition-alerts/${project.id}?created=1`);
}

export async function publishDemolitionProjectAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  const updated = await prisma.demolitionProject.updateMany({
    where: { id: projectId, organizerId: session.user.id, status: "draft" },
    data: { status: "active", publishedAt: new Date() },
  });
  if (updated.count === 0) redirect(`/dashboard/demolition-alerts/${projectId}?error=` + encodeURIComponent("Could not publish."));
  revalidateDemolition(projectId);
  redirect(`/dashboard/demolition-alerts/${projectId}?published=1`);
}

export async function closeDemolitionProjectAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  await prisma.demolitionProject.updateMany({
    where: { id: projectId, organizerId: session.user.id },
    data: { status: "closed" },
  });
  revalidateDemolition(projectId);
  redirect(`/dashboard/demolition-alerts/${projectId}?closed=1`);
}

export async function appendDemolitionElementAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const isFree = formData.get("isFree") === "yes";
  const priceGbp = String(formData.get("priceGbp") ?? "").trim();
  const pricePence = isFree ? null : Math.round(parseFloat(priceGbp || "0") * 100);
  if (!projectId || !title) {
    redirect(`/dashboard/demolition-alerts/${projectId}?error=` + encodeURIComponent("Title required."));
  }
  if (!isFree && (!Number.isFinite(pricePence) || (pricePence ?? 0) <= 0)) {
    redirect(`/dashboard/demolition-alerts/${projectId}?error=` + encodeURIComponent("Enter a valid price for chargeable lots."));
  }

  const project = await prisma.demolitionProject.findFirst({
    where: { id: projectId, organizerId: session.user.id },
    select: { id: true, _count: { select: { elements: true } } },
  });
  if (!project) redirect("/dashboard/demolition-alerts");

  const removalRaw = String(formData.get("removalMustCompleteBy") ?? "").trim();
  const removalMustCompleteBy = removalRaw ? new Date(removalRaw) : null;
  if (removalRaw && removalMustCompleteBy && Number.isNaN(removalMustCompleteBy.getTime())) {
    redirect(`/dashboard/demolition-alerts/${projectId}?error=` + encodeURIComponent("Invalid removal deadline."));
  }

  await prisma.demolitionElement.create({
    data: {
      projectId,
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      isFree,
      pricePence: isFree ? null : pricePence,
      removalMustCompleteBy: removalMustCompleteBy && !Number.isNaN(removalMustCompleteBy.getTime()) ? removalMustCompleteBy : null,
      pickupWhereWhen: String(formData.get("pickupWhereWhen") ?? "").trim() || null,
      conditions: String(formData.get("conditions") ?? "").trim() || null,
      quantityNote: String(formData.get("quantityNote") ?? "").trim() || null,
      sortOrder: project._count.elements,
    },
  });
  revalidateDemolition(projectId);
  redirect(`/dashboard/demolition-alerts/${projectId}?added=1`);
}

export async function releaseDemolitionReservationAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const elementId = String(formData.get("elementId") ?? "");
  if (!elementId) return;

  const el = await prisma.demolitionElement.findFirst({
    where: { id: elementId, project: { organizerId: session.user.id } },
    select: { id: true, projectId: true },
  });
  if (!el) redirect("/dashboard/demolition-alerts");

  await prisma.demolitionElement.update({
    where: { id: elementId },
    data: { status: "available", claimedById: null, claimedAt: null },
  });
  revalidateDemolition(el.projectId);
  redirect(`/dashboard/demolition-alerts/${el.projectId}?released=1`);
}

export async function withdrawDemolitionElementAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const elementId = String(formData.get("elementId") ?? "");
  if (!elementId) return;

  const el = await prisma.demolitionElement.findFirst({
    where: { id: elementId, project: { organizerId: session.user.id } },
    select: { id: true, projectId: true },
  });
  if (!el) redirect("/dashboard/demolition-alerts");

  await prisma.demolitionElement.update({
    where: { id: elementId },
    data: { status: "withdrawn", claimedById: null, claimedAt: null },
  });
  revalidateDemolition(el.projectId);
  redirect(`/dashboard/demolition-alerts/${el.projectId}?withdrawn=1`);
}

export async function claimFreeDemolitionElementAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    const elementId = String(formData.get("elementId") ?? "");
    const projectId = String(formData.get("projectId") ?? "");
    const back = projectId ? `/demolition-alerts/${projectId}` : "/demolition-alerts";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(back)}`);
  }

  const elementId = String(formData.get("elementId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!elementId || !projectId) redirect("/demolition-alerts");

  const element = await prisma.demolitionElement.findFirst({
    where: { id: elementId, projectId },
    include: { project: { select: { organizerId: true, status: true } } },
  });
  if (!element || element.project.status !== "active") {
    redirect(`/demolition-alerts/${projectId}?error=` + encodeURIComponent("This alert is not available."));
  }
  if (element.project.organizerId === session.user.id) {
    redirect(`/demolition-alerts/${projectId}?error=` + encodeURIComponent("You cannot reserve lots on your own project."));
  }
  if (!element.isFree || element.status !== "available") {
    redirect(`/demolition-alerts/${projectId}?error=` + encodeURIComponent("This lot is not available to reserve."));
  }

  const updated = await prisma.demolitionElement.updateMany({
    where: { id: elementId, status: "available", isFree: true },
    data: {
      status: "reserved",
      claimedById: session.user.id,
      claimedAt: new Date(),
    },
  });
  if (updated.count !== 1) {
    redirect(`/demolition-alerts/${projectId}?error=` + encodeURIComponent("Someone else just reserved this lot. Refresh the page."));
  }
  revalidateDemolition(projectId);
  redirect(`/demolition-alerts/${projectId}?reserved=1`);
}

export async function expressDemolitionInterestAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    const projectId = String(formData.get("projectId") ?? "");
    const back = projectId ? `/demolition-alerts/${projectId}` : "/demolition-alerts";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(back)}`);
  }

  const elementId = String(formData.get("elementId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const message = String(formData.get("message") ?? "").trim() || null;
  if (!elementId || !projectId) redirect("/demolition-alerts");

  const element = await prisma.demolitionElement.findFirst({
    where: { id: elementId, projectId },
    include: { project: { select: { organizerId: true, status: true } } },
  });
  if (!element || element.project.status !== "active") {
    redirect(`/demolition-alerts/${projectId}?error=` + encodeURIComponent("This alert is not available."));
  }
  if (element.project.organizerId === session.user.id) {
    redirect(`/demolition-alerts/${projectId}?error=` + encodeURIComponent("You cannot register interest on your own project."));
  }
  if (element.isFree || element.status === "withdrawn") {
    redirect(`/demolition-alerts/${projectId}?error=` + encodeURIComponent("Interest applies to chargeable lots only."));
  }

  await prisma.demolitionElementInterest.create({
    data: { elementId, userId: session.user.id, message },
  });
  revalidateDemolition(projectId);
  redirect(`/demolition-alerts/${projectId}?interest=1`);
}
