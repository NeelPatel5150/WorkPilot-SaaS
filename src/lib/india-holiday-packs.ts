/** Curated India holiday packs for onboarding (date strings YYYY-MM-DD). */

export type HolidayPack = {
  id: string;
  label: string;
  description: string;
  holidays: { name: string; date: string }[];
};

function yearHolidays(year: number): HolidayPack[] {
  return [
    {
      id: "india-national",
      label: "India national",
      description: "Republic Day, Independence Day, Gandhi Jayanti + common festivals",
      holidays: [
        { name: "Republic Day", date: `${year}-01-26` },
        { name: "Holi", date: `${year}-03-14` },
        { name: "Good Friday", date: `${year}-04-03` },
        { name: "Independence Day", date: `${year}-08-15` },
        { name: "Gandhi Jayanti", date: `${year}-10-02` },
        { name: "Diwali", date: `${year}-11-08` },
        { name: "Christmas", date: `${year}-12-25` },
      ],
    },
    {
      id: "maharashtra",
      label: "Maharashtra",
      description: "National set + Maharashtra Day / Gudi Padwa style",
      holidays: [
        { name: "Republic Day", date: `${year}-01-26` },
        { name: "Gudi Padwa", date: `${year}-03-30` },
        { name: "Maharashtra Day", date: `${year}-05-01` },
        { name: "Independence Day", date: `${year}-08-15` },
        { name: "Ganesh Chaturthi", date: `${year}-09-01` },
        { name: "Gandhi Jayanti", date: `${year}-10-02` },
        { name: "Diwali", date: `${year}-11-08` },
        { name: "Christmas", date: `${year}-12-25` },
      ],
    },
    {
      id: "karnataka",
      label: "Karnataka",
      description: "National set + Karnataka Rajyotsava",
      holidays: [
        { name: "Republic Day", date: `${year}-01-26` },
        { name: "Ugadi", date: `${year}-03-30` },
        { name: "Independence Day", date: `${year}-08-15` },
        { name: "Gandhi Jayanti", date: `${year}-10-02` },
        { name: "Kannada Rajyotsava", date: `${year}-11-01` },
        { name: "Diwali", date: `${year}-11-08` },
        { name: "Christmas", date: `${year}-12-25` },
      ],
    },
    {
      id: "delhi-ncr",
      label: "Delhi NCR",
      description: "National + common NCR observances",
      holidays: [
        { name: "Republic Day", date: `${year}-01-26` },
        { name: "Holi", date: `${year}-03-14` },
        { name: "Independence Day", date: `${year}-08-15` },
        { name: "Gandhi Jayanti", date: `${year}-10-02` },
        { name: "Dussehra", date: `${year}-10-20` },
        { name: "Diwali", date: `${year}-11-08` },
        { name: "Christmas", date: `${year}-12-25` },
      ],
    },
  ];
}

export function listIndiaHolidayPacks(year = new Date().getFullYear()): HolidayPack[] {
  return yearHolidays(year);
}

export function getIndiaHolidayPack(
  id: string,
  year = new Date().getFullYear()
): HolidayPack | null {
  return listIndiaHolidayPacks(year).find((p) => p.id === id) ?? null;
}
