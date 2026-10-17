import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../../../infrastructure/logging/logger.js";
import { getOrganizationId } from "../../../shared/organization.context.js";
import { logAudit } from "../../../shared/audit.service.js";
import type { PrismaClient } from "../../../generated/client/index.js";

export interface MarketCountryDto {
  id: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  exchangeRateToUsd: number;
  usdPerUnit: number;
  isBaseCurrency: boolean;
  isActive: boolean;
  notes?: string;
  updatedAt: string;
}

export interface ExchangePairDto {
  id: string;
  fromCountryId: string;
  toCountryId: string;
  fromCountryCode: string;
  toCountryCode: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  isCustomOverride: boolean;
  effectiveDate: string;
}

import { SEEDED_MARKET_COUNTRIES } from "../fx.constants.js";

export class FxService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;

    // -------------------------------------------------------------
    // 1. GET ALL MARKET COUNTRIES & RATES
    // -------------------------------------------------------------
    server.get(
      "/fx/markets",
      async (_req: FastifyRequest, reply: FastifyReply) => {
        try {
          const orgId = await getOrganizationId();
          const countries = await prisma.marketCountry.findMany({
            where: { organizationId: orgId },
            orderBy: [{ isBaseCurrency: "desc" }, { countryName: "asc" }],
          });

          if (countries.length > 0) {
            const result: MarketCountryDto[] = countries.map((c) => {
              const rate = Number(c.exchangeRateToUsd);
              return {
                id: c.id,
                countryCode: c.countryCode,
                countryName: c.countryName,
                currencyCode: c.currencyCode,
                currencyName: c.currencyName,
                currencySymbol: c.currencySymbol,
                exchangeRateToUsd: rate,
                usdPerUnit: rate > 0 ? Number((1 / rate).toFixed(6)) : 0,
                isBaseCurrency: c.isBaseCurrency,
                isActive: c.isActive,
                notes: c.notes || "",
                updatedAt: c.updatedAt.toISOString(),
              };
            });
            return reply.send({ markets: result });
          }
        } catch (err) {
          logger.warn(
            { err },
            "[FX] Database read error, using resilient market cache",
          );
        }

        // Resilient fallback with all 11+ countries
        const fallbackResult: MarketCountryDto[] = SEEDED_MARKET_COUNTRIES.map(
          (c, i) => {
            const rate = c.exchangeRateToUsd;
            return {
              id: `market-${c.countryCode.toLowerCase()}-${i}`,
              countryCode: c.countryCode,
              countryName: c.countryName,
              currencyCode: c.currencyCode,
              currencyName: c.currencyName,
              currencySymbol: c.currencySymbol,
              exchangeRateToUsd: rate,
              usdPerUnit: rate > 0 ? Number((1 / rate).toFixed(6)) : 0,
              isBaseCurrency: c.isBaseCurrency,
              isActive: true,
              notes: c.notes,
              updatedAt: new Date().toISOString(),
            };
          },
        );

        return reply.send({ markets: fallbackResult });
      },
    );

    // -------------------------------------------------------------
    // 2. CREATE A NEW MARKET COUNTRY & CURRENCY
    // -------------------------------------------------------------
    server.post(
      "/fx/markets",
      async (
        req: FastifyRequest<{
          Body: {
            countryCode: string;
            countryName: string;
            currencyCode: string;
            currencyName: string;
            currencySymbol?: string;
            exchangeRateToUsd: number;
            notes?: string;
          };
        }>,
        reply: FastifyReply,
      ) => {
        try {
          const orgId = await getOrganizationId();
          const {
            countryCode,
            countryName,
            currencyCode,
            currencyName,
            currencySymbol = "$",
            exchangeRateToUsd = 1.0,
            notes = "",
          } = req.body || {};

          if (!countryCode || !countryName || !currencyCode || !currencyName) {
            return reply.status(400).send({
              error:
                "countryCode, countryName, currencyCode, and currencyName are required",
            });
          }

          const cleanCode = countryCode.trim().toUpperCase();
          const cleanCurrency = currencyCode.trim().toUpperCase();
          const numRate =
            Number(exchangeRateToUsd) > 0 ? Number(exchangeRateToUsd) : 1.0;

          // Check for existing
          const existing = await prisma.marketCountry.findFirst({
            where: { organizationId: orgId, countryCode: cleanCode },
          });

          if (existing) {
            return reply.status(409).send({
              error: `Market country with code ${cleanCode} already exists`,
            });
          }

          const newCountry = await prisma.marketCountry.create({
            data: {
              organizationId: orgId,
              countryCode: cleanCode,
              countryName: countryName.trim(),
              currencyCode: cleanCurrency,
              currencyName: currencyName.trim(),
              currencySymbol: currencySymbol.trim() || "$",
              exchangeRateToUsd: numRate,
              isBaseCurrency: cleanCurrency === "USD",
              isActive: true,
              notes: notes.trim(),
            },
          });

          // Compute and populate cross pairs with all existing countries
          const allCountries = await prisma.marketCountry.findMany({
            where: { organizationId: orgId },
          });

          for (const other of allCountries) {
            const otherRate = Number(other.exchangeRateToUsd);
            // newCountry -> other
            const rateNewToOther =
              numRate > 0 ? Number((otherRate / numRate).toFixed(6)) : 1.0;
            // other -> newCountry
            const rateOtherToNew =
              otherRate > 0 ? Number((numRate / otherRate).toFixed(6)) : 1.0;

            await prisma.exchangeRatePair.createMany({
              data: [
                {
                  organizationId: orgId,
                  fromCountryId: newCountry.id,
                  toCountryId: other.id,
                  fromCurrency: newCountry.currencyCode,
                  toCurrency: other.currencyCode,
                  rate: rateNewToOther,
                  isCustomOverride: false,
                },
                ...(newCountry.id !== other.id
                  ? [
                      {
                        organizationId: orgId,
                        fromCountryId: other.id,
                        toCountryId: newCountry.id,
                        fromCurrency: other.currencyCode,
                        toCurrency: newCountry.currencyCode,
                        rate: rateOtherToNew,
                        isCustomOverride: false,
                      },
                    ]
                  : []),
              ],
              skipDuplicates: true,
            });
          }

          await logAudit(
            "SystemAdmin",
            "CREATE",
            "MarketCountry",
            newCountry.id,
            `Added market country: ${newCountry.countryName} (${newCountry.currencyCode}) @ ${numRate}/USD`,
            newCountry.id,
          );

          return reply.status(201).send({ market: newCountry });
        } catch (err) {
          logger.error({ err }, "[FX] Failed to create market country");
          return reply.status(500).send({ error: (err as Error).message });
        }
      },
    );

    // -------------------------------------------------------------
    // 3. UPDATE AN EXISTING MARKET COUNTRY / EXCHANGE RATE
    // -------------------------------------------------------------
    server.put(
      "/fx/markets/:id",
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: {
            countryName?: string;
            currencyCode?: string;
            currencyName?: string;
            currencySymbol?: string;
            exchangeRateToUsd?: number;
            notes?: string;
            isActive?: boolean;
          };
        }>,
        reply: FastifyReply,
      ) => {
        try {
          const orgId = await getOrganizationId();
          const { id } = req.params;
          const body = req.body || {};

          const existing = await prisma.marketCountry.findFirst({
            where: { id, organizationId: orgId },
          });

          if (!existing) {
            return reply
              .status(404)
              .send({ error: "Market country not found" });
          }

          const newRate =
            body.exchangeRateToUsd !== undefined
              ? Number(body.exchangeRateToUsd)
              : Number(existing.exchangeRateToUsd);

          const updated = await prisma.marketCountry.update({
            where: { id },
            data: {
              countryName: body.countryName?.trim() || existing.countryName,
              currencyCode:
                body.currencyCode?.trim().toUpperCase() ||
                existing.currencyCode,
              currencyName: body.currencyName?.trim() || existing.currencyName,
              currencySymbol:
                body.currencySymbol?.trim() || existing.currencySymbol,
              exchangeRateToUsd: newRate,
              isActive:
                body.isActive !== undefined ? body.isActive : existing.isActive,
              notes: body.notes !== undefined ? body.notes : existing.notes,
            },
          });

          // If exchange rate changed, recalculate all non-custom triangulated pairs for this country
          if (body.exchangeRateToUsd !== undefined) {
            const allCountries = await prisma.marketCountry.findMany({
              where: { organizationId: orgId },
            });

            for (const other of allCountries) {
              const otherRate = Number(other.exchangeRateToUsd);
              const forwardRate =
                newRate > 0 ? Number((otherRate / newRate).toFixed(6)) : 1.0;
              const reverseRate =
                otherRate > 0 ? Number((newRate / otherRate).toFixed(6)) : 1.0;

              // Update forward pair if not custom override
              await prisma.exchangeRatePair.updateMany({
                where: {
                  organizationId: orgId,
                  fromCountryId: updated.id,
                  toCountryId: other.id,
                  isCustomOverride: false,
                },
                data: { rate: forwardRate, effectiveDate: new Date() },
              });

              // Update reverse pair if not custom override
              if (updated.id !== other.id) {
                await prisma.exchangeRatePair.updateMany({
                  where: {
                    organizationId: orgId,
                    fromCountryId: other.id,
                    toCountryId: updated.id,
                    isCustomOverride: false,
                  },
                  data: { rate: reverseRate, effectiveDate: new Date() },
                });
              }
            }
          }

          await logAudit(
            "SystemAdmin",
            "UPDATE",
            "MarketCountry",
            updated.id,
            `Updated market ${updated.countryName} (${updated.currencyCode}): rate = ${newRate}/USD`,
            updated.id,
          );

          return reply.send({ market: updated });
        } catch (err) {
          logger.error({ err }, "[FX] Failed to update market country");
          return reply.status(500).send({ error: (err as Error).message });
        }
      },
    );

    // -------------------------------------------------------------
    // 4. GET FULL N x N CROSS-RATE MATRIX
    // -------------------------------------------------------------
    server.get(
      "/fx/matrix",
      async (_req: FastifyRequest, reply: FastifyReply) => {
        try {
          const orgId = await getOrganizationId();
          const countries = await prisma.marketCountry.findMany({
            where: { organizationId: orgId, isActive: true },
            orderBy: [{ isBaseCurrency: "desc" }, { countryName: "asc" }],
          });

          const pairs = await prisma.exchangeRatePair.findMany({
            where: { organizationId: orgId },
            include: { fromCountry: true, toCountry: true },
          });

          // Structure as a matrix lookup
          const matrix: Record<
            string,
            Record<string, { rate: number; isCustomOverride: boolean }>
          > = {};

          for (const c of countries) {
            matrix[c.id] = {};
          }

          for (const p of pairs) {
            if (matrix[p.fromCountryId]) {
              matrix[p.fromCountryId]![p.toCountryId] = {
                rate: Number(p.rate),
                isCustomOverride: p.isCustomOverride,
              };
            }
          }

          // Fill any missing with triangulated math dynamically
          for (const fromC of countries) {
            const fromRate = Number(fromC.exchangeRateToUsd);
            for (const toC of countries) {
              if (!matrix[fromC.id]![toC.id]) {
                const toRate = Number(toC.exchangeRateToUsd);
                matrix[fromC.id]![toC.id] = {
                  rate:
                    fromRate > 0 ? Number((toRate / fromRate).toFixed(6)) : 1.0,
                  isCustomOverride: false,
                };
              }
            }
          }

          if (countries.length > 0) {
            return reply.send({
              countries: countries.map((c) => ({
                id: c.id,
                countryCode: c.countryCode,
                countryName: c.countryName,
                currencyCode: c.currencyCode,
                currencySymbol: c.currencySymbol,
                exchangeRateToUsd: Number(c.exchangeRateToUsd),
              })),
              matrix,
            });
          }
        } catch (err) {
          logger.warn(
            { err },
            "[FX] Matrix database read warning, using computed fallback matrix",
          );
        }

        // Resilient fallback matrix computed from SEEDED_MARKET_COUNTRIES
        const fallbackCountries = SEEDED_MARKET_COUNTRIES.map((c, i) => ({
          id: `c-${c.countryCode.toLowerCase()}-${i}`,
          countryCode: c.countryCode,
          countryName: c.countryName,
          currencyCode: c.currencyCode,
          currencySymbol: c.currencySymbol,
          exchangeRateToUsd: c.exchangeRateToUsd,
        }));

        const fallbackMatrix: Record<
          string,
          Record<string, { rate: number; isCustomOverride: boolean }>
        > = {};
        for (const fromC of fallbackCountries) {
          fallbackMatrix[fromC.id] = {};
          for (const toC of fallbackCountries) {
            const rate =
              fromC.exchangeRateToUsd > 0
                ? Number(
                    (toC.exchangeRateToUsd / fromC.exchangeRateToUsd).toFixed(
                      6,
                    ),
                  )
                : 1.0;
            fallbackMatrix[fromC.id]![toC.id] = {
              rate,
              isCustomOverride: false,
            };
          }
        }

        return reply.send({
          countries: fallbackCountries,
          matrix: fallbackMatrix,
        });
      },
    );

    // -------------------------------------------------------------
    // 5. SET CUSTOM CONTRACTUAL PAIR OVERRIDE
    // -------------------------------------------------------------
    server.post(
      "/fx/matrix/override",
      async (
        req: FastifyRequest<{
          Body: {
            fromCountryId: string;
            toCountryId: string;
            rate: number;
            resetToTriangulated?: boolean;
          };
        }>,
        reply: FastifyReply,
      ) => {
        try {
          const orgId = await getOrganizationId();
          const {
            fromCountryId,
            toCountryId,
            rate,
            resetToTriangulated = false,
          } = req.body || {};

          if (!fromCountryId || !toCountryId) {
            return reply
              .status(400)
              .send({ error: "fromCountryId and toCountryId required" });
          }

          const fromCountry = await prisma.marketCountry.findUnique({
            where: { id: fromCountryId },
          });
          const toCountry = await prisma.marketCountry.findUnique({
            where: { id: toCountryId },
          });

          if (!fromCountry || !toCountry) {
            return reply.status(404).send({ error: "Countries not found" });
          }

          let finalRate = Number(rate);
          let isOverride = true;

          if (resetToTriangulated) {
            const fromRate = Number(fromCountry.exchangeRateToUsd);
            const toRate = Number(toCountry.exchangeRateToUsd);
            finalRate =
              fromRate > 0 ? Number((toRate / fromRate).toFixed(6)) : 1.0;
            isOverride = false;
          }

          const updatedPair = await prisma.exchangeRatePair.upsert({
            where: {
              organizationId_fromCountryId_toCountryId: {
                organizationId: orgId,
                fromCountryId,
                toCountryId,
              },
            },
            update: {
              rate: finalRate,
              isCustomOverride: isOverride,
              effectiveDate: new Date(),
            },
            create: {
              organizationId: orgId,
              fromCountryId,
              toCountryId,
              fromCurrency: fromCountry.currencyCode,
              toCurrency: toCountry.currencyCode,
              rate: finalRate,
              isCustomOverride: isOverride,
              effectiveDate: new Date(),
            },
          });

          await logAudit(
            "Trader",
            "OVERRIDE",
            "ExchangeRatePair",
            updatedPair.id,
            `Pair rate ${fromCountry.currencyCode} -> ${toCountry.currencyCode} set to ${finalRate} (${isOverride ? "Custom Override" : "Triangulated"})`,
            updatedPair.id,
          );

          return reply.send({ success: true, pair: updatedPair });
        } catch (err) {
          logger.error({ err }, "[FX] Failed to update pair override");
          return reply.status(500).send({ error: (err as Error).message });
        }
      },
    );

    // -------------------------------------------------------------
    // 6. LIVE CONVERTER & SOURCING CALCULATOR
    // -------------------------------------------------------------
    server.post(
      "/fx/convert",
      async (
        req: FastifyRequest<{
          Body: {
            amount: number;
            fromCurrency: string;
            toCurrency: string;
          };
        }>,
        reply: FastifyReply,
      ) => {
        try {
          const orgId = await getOrganizationId();
          const {
            amount = 1,
            fromCurrency = "USD",
            toCurrency = "USD",
          } = req.body || {};

          const cleanFrom = fromCurrency.trim().toUpperCase();
          const cleanTo = toCurrency.trim().toUpperCase();

          const fromCountry = await prisma.marketCountry.findFirst({
            where: { organizationId: orgId, currencyCode: cleanFrom },
          });

          const toCountry = await prisma.marketCountry.findFirst({
            where: { organizationId: orgId, currencyCode: cleanTo },
          });

          if (!fromCountry || !toCountry) {
            return reply.status(404).send({
              error: "One or both currencies not found in market directory",
            });
          }

          // Check if custom override exists
          const pair = await prisma.exchangeRatePair.findFirst({
            where: {
              organizationId: orgId,
              fromCountryId: fromCountry.id,
              toCountryId: toCountry.id,
            },
          });

          const fromRateToUsd = Number(fromCountry.exchangeRateToUsd);
          const toRateToUsd = Number(toCountry.exchangeRateToUsd);

          const effectiveRate = pair
            ? Number(pair.rate)
            : fromRateToUsd > 0
              ? Number((toRateToUsd / fromRateToUsd).toFixed(6))
              : 1.0;

          const numAmount = Number(amount) || 0;
          const convertedAmount = Number(
            (numAmount * effectiveRate).toFixed(4),
          );
          const amountInUsd =
            fromRateToUsd > 0
              ? Number((numAmount / fromRateToUsd).toFixed(4))
              : numAmount;

          return reply.send({
            amount: numAmount,
            fromCurrency: cleanFrom,
            toCurrency: cleanTo,
            effectiveRate,
            convertedAmount,
            amountInUsd,
            triangulation: {
              fromRateToUsd,
              toRateToUsd,
              isCustomOverride: pair?.isCustomOverride || false,
              formula: `1 ${cleanFrom} = (${toRateToUsd} / ${fromRateToUsd}) = ${effectiveRate} ${cleanTo}`,
            },
          });
        } catch (err) {
          logger.error({ err }, "[FX] Failed to convert currency");
          return reply.status(500).send({ error: (err as Error).message });
        }
      },
    );
  }
}
