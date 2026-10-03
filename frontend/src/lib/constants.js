export const CATEGORIES = {
  Residential: ["Standalone Building", "Independent House", "Apartment"],
  Commercial: ["Office", "Retail", "Shop", "Showroom", "Warehouse", "Industrial", "Commercial Building", "Other Commercial"],
  Land: ["Agricultural Land", "Non-Agricultural Land"],
};

export const TRANSACTION_TYPES = ["For Sale", "For Purchase", "For Rent", "For Lease"];

export const CUSTOMER_TYPES = ["Buyer", "Seller", "Renter", "Leaser"];

export const AMENITIES = [
  { key: "Parking", icon: "Car" },
  { key: "Lift", icon: "ArrowUpDown" },
  { key: "Security", icon: "Shield" },
  { key: "Power Backup", icon: "Zap" },
  { key: "Gym", icon: "Dumbbell" },
  { key: "Swimming Pool", icon: "Waves" },
  { key: "Garden", icon: "Trees" },
  { key: "Clubhouse", icon: "Building2" },
  { key: "CCTV", icon: "Cctv" },
  { key: "Water Supply", icon: "Droplets" },
  { key: "Balcony", icon: "SquareStack" },
  { key: "Terrace", icon: "Home" },
  { key: "Furnished", icon: "Sofa" },
  { key: "Semi Furnished", icon: "Armchair" },
  { key: "Air Conditioning", icon: "Wind" },
  { key: "Internet", icon: "Wifi" },
  { key: "Visitor Parking", icon: "ParkingCircle" },
];

export const DEAL_STAGES = ["New", "Contacted", "Interested", "Site Visit", "Negotiation", "Token / Advance", "Closed Won", "Closed Lost"];
export const ACTIVE_STAGES = ["New", "Contacted", "Interested", "Site Visit", "Negotiation", "Token / Advance"];

export const FOLLOWUP_TYPES = ["Call", "Site Visit", "Meeting", "WhatsApp", "Email", "Other"];
export const FOLLOWUP_STATUSES = ["Open", "Completed", "Rescheduled", "Cancelled"];

export const MAX_BUDGET = 500000000; // 50 Cr

export const STAGE_COLORS = {
  "New": "bg-slate-100 text-slate-700",
  "Contacted": "bg-blue-100 text-blue-700",
  "Interested": "bg-indigo-100 text-indigo-700",
  "Site Visit": "bg-violet-100 text-violet-700",
  "Negotiation": "bg-amber-100 text-amber-700",
  "Token / Advance": "bg-orange-100 text-orange-700",
  "Closed Won": "bg-emerald-100 text-emerald-700",
  "Closed Lost": "bg-rose-100 text-rose-700",
};
