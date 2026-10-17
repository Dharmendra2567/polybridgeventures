import { getPrismaClient } from "./infrastructure/database/prisma.js";
import { getOrganizationId } from "./shared/organization.context.js";

export interface MarketCountrySeedData {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  exchangeRateToUsd: number; // 1 USD = X Currency Units
  isBaseCurrency: boolean;
  notes: string;
}

export const INITIAL_MARKET_COUNTRIES: MarketCountrySeedData[] = [
  {
    countryCode: "US",
    countryName: "United States",
    currencyCode: "USD",
    currencyName: "US Dollar",
    currencySymbol: "$",
    exchangeRateToUsd: 1.0,
    isBaseCurrency: true,
    notes:
      "Corporate Base Currency & primary international trade settlement benchmark.",
  },
  {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    currencyCode: "AED",
    currencyName: "UAE Dirham",
    currencySymbol: "AED",
    exchangeRateToUsd: 3.6725,
    isBaseCurrency: false,
    notes:
      "Major trade hub for Middle East & North Africa (MENA) commodity exports.",
  },
  {
    countryCode: "LK",
    countryName: "Sri Lanka",
    currencyCode: "LKR",
    currencyName: "Sri Lankan Rupee",
    currencySymbol: "Rs",
    exchangeRateToUsd: 331.06,
    isBaseCurrency: false,
    notes: "South Asian export market for agro-commodities and bulk spices.",
  },
  {
    countryCode: "JP",
    countryName: "Japan",
    currencyCode: "JPY",
    currencyName: "Japanese Yen",
    currencySymbol: "¥",
    exchangeRateToUsd: 158.04,
    isBaseCurrency: false,
    notes: "East Asia premium quality food & organic spice destination.",
  },
  {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    currencyCode: "SAR",
    currencyName: "Saudi Riyal",
    currencySymbol: "SAR",
    exchangeRateToUsd: 3.751,
    isBaseCurrency: false,
    notes: "GCC strategic partner with currency officially pegged to USD.",
  },
  {
    countryCode: "OM",
    countryName: "Oman",
    currencyCode: "OMR",
    currencyName: "Omani Rial",
    currencySymbol: "OMR",
    exchangeRateToUsd: 0.385,
    isBaseCurrency: false,
    notes: "GCC trade partner with high-denomination pegged currency.",
  },
  {
    countryCode: "KW",
    countryName: "Kuwait",
    currencyCode: "KWD",
    currencyName: "Kuwaiti Dinar",
    currencySymbol: "KWD",
    exchangeRateToUsd: 0.311,
    isBaseCurrency: false,
    notes: "Highest valued currency unit worldwide; key Gulf trading partner.",
  },
  {
    countryCode: "CL",
    countryName: "Chile",
    currencyCode: "CLP",
    currencyName: "Chilean Peso",
    currencySymbol: "CLP$",
    exchangeRateToUsd: 981.76,
    isBaseCurrency: false,
    notes: "Latin American Pacific Alliance trade route partner.",
  },
  {
    countryCode: "CA",
    countryName: "Canada",
    currencyCode: "CAD",
    currencyName: "Canadian Dollar",
    currencySymbol: "CA$",
    exchangeRateToUsd: 1.422,
    isBaseCurrency: false,
    notes:
      "North American trade corridor for grains, pulses, and specialty spices.",
  },
  {
    countryCode: "BR",
    countryName: "Brazil",
    currencyCode: "BRL",
    currencyName: "Brazilian Real",
    currencySymbol: "R$",
    exchangeRateToUsd: 5.092,
    isBaseCurrency: false,
    notes: "Mercosur powerhouse trade market for agricultural cross-flows.",
  },
  {
    countryCode: "AU",
    countryName: "Australia",
    currencyCode: "AUD",
    currencyName: "Australian Dollar",
    currencySymbol: "A$",
    exchangeRateToUsd: 1.442,
    isBaseCurrency: false,
    notes:
      "Oceania hub for bulk agro supplies and counter-seasonal agricultural trade.",
  },
  {
    countryCode: "IN",
    countryName: "India",
    currencyCode: "INR",
    currencyName: "Indian Rupee",
    currencySymbol: "₹",
    exchangeRateToUsd: 94.95,
    isBaseCurrency: false,
    notes:
      "Primary procurement and sourcing origin for spices, grains, and commodities.",
  },
];

export async function seedFxMarkets() {
  const prisma = getPrismaClient();
  const orgId = await getOrganizationId();
  console.log(
    `[FX Seed] Seeding export market countries and exchange rate matrix for Org: ${orgId}...`,
  );

  const createdCountries: Record<string, any> = {};

  // 1. Upsert all 12 countries
  for (const item of INITIAL_MARKET_COUNTRIES) {
    const country = await prisma.marketCountry.upsert({
      where: {
        organizationId_countryCode: {
          organizationId: orgId,
          countryCode: item.countryCode,
        },
      },
      update: {
        countryName: item.countryName,
        currencyCode: item.currencyCode,
        currencyName: item.currencyName,
        currencySymbol: item.currencySymbol,
        exchangeRateToUsd: item.exchangeRateToUsd,
        isBaseCurrency: item.isBaseCurrency,
        isActive: true,
        notes: item.notes,
      },
      create: {
        organizationId: orgId,
        countryCode: item.countryCode,
        countryName: item.countryName,
        currencyCode: item.currencyCode,
        currencyName: item.currencyName,
        currencySymbol: item.currencySymbol,
        exchangeRateToUsd: item.exchangeRateToUsd,
        isBaseCurrency: item.isBaseCurrency,
        isActive: true,
        notes: item.notes,
      },
    });

    createdCountries[item.countryCode] = country;
    console.log(
      `[FX Seed] Market country ready: ${country.countryCode} - ${country.countryName} (${country.currencyCode}) [1 USD = ${country.exchangeRateToUsd} ${country.currencyCode}]`,
    );
  }

  // 2. Compute and upsert full Cross-Exchange Rate Matrix (N x N pairs)
  // Formula: Rate(A -> B) = Rate(USD -> B) / Rate(USD -> A)
  const countryList = Object.values(createdCountries);
  let pairCount = 0;

  for (const fromC of countryList) {
    const fromRateToUsd = Number(fromC.exchangeRateToUsd);

    for (const toC of countryList) {
      const toRateToUsd = Number(toC.exchangeRateToUsd);

      // Calculate triangulated exchange rate: how many units of toCurrency for 1 unit of fromCurrency
      const crossRate = fromRateToUsd > 0 ? toRateToUsd / fromRateToUsd : 1.0;
      const formattedRate = Number(crossRate.toFixed(6));

      await prisma.exchangeRatePair.upsert({
        where: {
          organizationId_fromCountryId_toCountryId: {
            organizationId: orgId,
            fromCountryId: fromC.id,
            toCountryId: toC.id,
          },
        },
        update: {
          fromCurrency: fromC.currencyCode,
          toCurrency: toC.currencyCode,
          rate: formattedRate,
          effectiveDate: new Date(),
        },
        create: {
          organizationId: orgId,
          fromCountryId: fromC.id,
          toCountryId: toC.id,
          fromCurrency: fromC.currencyCode,
          toCurrency: toC.currencyCode,
          rate: formattedRate,
          isCustomOverride: fromC.id === toC.id ? false : false,
          effectiveDate: new Date(),
        },
      });

      pairCount++;
    }
  }

  console.log(
    `[FX Seed] Successfully seeded ${countryList.length} market countries and ${pairCount} cross-exchange rate pairs in database!`,
  );
}

seedFxMarkets()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[FX Seed Error]", err);
    process.exit(1);
  });
