// GreatSchools ratings (1-10) for the schools that appear in the catchments of
// our tracked properties. Keyed by the School District catchment name
// (es_name / ms_name / hs_name), normalized. Sourced from greatschools.org.
// Extend this as properties in new catchments are added.

type RatingEntry = { rating: number; gs: string };

const RATINGS: Record<string, RatingEntry> = {
  "adaire alexander": { rating: 8, gs: "https://www.greatschools.org/pennsylvania/philadelphia/2142-Adaire-Alexander-School/" },
  "hackett horatio b": { rating: 7, gs: "https://www.greatschools.org/pennsylvania/philadelphia/2124-Hackett-Horatio-B-School/" },
  richmond: { rating: 6, gs: "https://www.greatschools.org/pennsylvania/philadelphia/1984-Richmond-School/" },
  "brown henry a": { rating: 4, gs: "https://www.greatschools.org/pennsylvania/philadelphia/1977-Brown-Henry-A-School/" },
  "sheppard isaac": { rating: 3, gs: "https://www.greatschools.org/pennsylvania/philadelphia/1985-Sheppard-Isaac-School/" },
  "penn treaty hs": { rating: 4, gs: "https://www.greatschools.org/pennsylvania/philadelphia/2077-Penn-Treaty-Middle-School/" },
  "memphis st charter at jp jones": { rating: 6, gs: "https://www.greatschools.org/pennsylvania/philadelphia/14881-Memphis-Street-Academy-Charter-School/" },
  "deburgos julia": { rating: 5, gs: "https://www.greatschools.org/pennsylvania/philadelphia/2175-Deburgos-Bilingual-Magnet-Middle-School/" },
  "kensington campus": { rating: 2, gs: "https://www.greatschools.org/pennsylvania/philadelphia/15077-Kensington-HS/" },
  "edison thomas a": { rating: 3, gs: "https://www.greatschools.org/pennsylvania/philadelphia/2099-Edison-Hs-Fareira-Skills/" },
};

export function normalizeSchool(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRating(name: string): RatingEntry | null {
  return RATINGS[normalizeSchool(name)] ?? null;
}

// Fallback link when we don't have a stored GreatSchools URL for a school.
export function gsSearchUrl(name: string): string {
  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(name + " School Philadelphia greatschools rating")
  );
}

// Green (strong) → amber (average) → red (below average) → gray (unknown).
export function ratingColor(rating: number | null): string {
  if (rating == null) return "#9ca3af";
  if (rating >= 8) return "#16a34a";
  if (rating >= 5) return "#ca8a04";
  return "#dc2626";
}
