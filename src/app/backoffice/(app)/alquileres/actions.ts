"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requireProfile } from "@/lib/auth";
import { buildPaymentSchedule } from "@/lib/alquileres";
import {
  optionalInt,
  optionalStr,
  requiredDate,
  requiredDecimal,
  requiredStr,
} from "@/lib/form-utils";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export async function createContract(formData: FormData) {
  const profile = await requireProfile();

  const startDate = requiredDate(formData.get("startDate"), "Fecha de inicio");
  const endDate = requiredDate(formData.get("endDate"), "Fecha de fin");
  const rentAmount = requiredDecimal(formData.get("rentAmount"), "Monto del alquiler");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const indexationFrequencyMonths = optionalInt(formData.get("indexationFrequencyMonths"));

  const contract = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const owner = await tx.owner.create({
        data: {
          fullName: requiredStr(formData.get("ownerName"), "Nombre del propietario"),
          email: optionalStr(formData.get("ownerEmail")),
          phone: optionalStr(formData.get("ownerPhone")),
          docId: optionalStr(formData.get("ownerDoc")),
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          fullName: requiredStr(formData.get("tenantName"), "Nombre del inquilino"),
          email: optionalStr(formData.get("tenantEmail")),
          phone: optionalStr(formData.get("tenantPhone")),
          docId: optionalStr(formData.get("tenantDoc")),
        },
      });

      const unit = await tx.unit.create({
        data: {
          address: requiredStr(formData.get("unitAddress"), "Dirección de la unidad"),
          city: optionalStr(formData.get("unitCity")),
          propertyType: optionalStr(formData.get("unitPropertyType")),
        },
      });

      const createdContract = await tx.contract.create({
        data: {
          unitId: unit.id,
          ownerId: owner.id,
          tenantId: tenant.id,
          startDate,
          endDate,
          rentAmount,
          currency,
          indexationFrequencyMonths,
          indexationType: optionalStr(formData.get("indexationType")),
          nextIndexationDueAt: indexationFrequencyMonths
            ? addMonths(startDate, indexationFrequencyMonths)
            : null,
          notes: optionalStr(formData.get("notes")),
          createdById: profile.id,
        },
      });

      const schedule = buildPaymentSchedule(startDate, endDate, rentAmount, currency);
      await tx.payment.createMany({
        data: schedule.map((entry) => ({ ...entry, contractId: createdContract.id })),
      });

      return createdContract;
    })
  );

  revalidatePath("/backoffice/alquileres");
  redirect(`/backoffice/alquileres/${contract.id}`);
}

export async function registrarPago(paymentId: number, contractId: number) {
  await requireProfile();

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));

  await withRetry(() =>
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "PAGADO", paidAt: new Date(), paidAmount: payment.amount },
    })
  );

  revalidatePath(`/backoffice/alquileres/${contractId}`);
}

export async function aplicarIndexacion(contractId: number, formData: FormData) {
  await requireProfile();

  const newAmount = requiredDecimal(formData.get("newAmount"), "Nuevo monto");
  const index = optionalStr(formData.get("index"));
  const notes = optionalStr(formData.get("notes"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUniqueOrThrow({ where: { id: contractId } });

      await tx.indexation.create({
        data: {
          contractId,
          previousAmount: contract.rentAmount,
          newAmount,
          index,
          notes,
        },
      });

      const now = new Date();
      await tx.contract.update({
        where: { id: contractId },
        data: {
          rentAmount: newAmount,
          lastIndexedAt: now,
          nextIndexationDueAt: contract.indexationFrequencyMonths
            ? addMonths(now, contract.indexationFrequencyMonths)
            : null,
        },
      });
    })
  );

  revalidatePath(`/backoffice/alquileres/${contractId}`);
}
