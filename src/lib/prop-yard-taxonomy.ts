export const PROP_CATEGORIES = [
  "Furniture",
  "Lighting",
  "Architectural Elements",
  "Doors & Windows",
  "Flooring",
  "Ironwork & Metalwork",
  "Stonework",
  "Timber & Beams",
  "Textiles & Soft Furnishings",
  "Ceramics & Tiles",
  "Glassware",
  "Mirrors",
  "Artwork & Decorative",
  "Scientific & Medical",
  "Industrial & Machinery",
  "Street Furniture & Signage",
  "Transport & Vehicles",
  "Books & Paper Ephemera",
  "Musical Instruments",
  "Other",
] as const;

export const PROP_SUBCATEGORIES: Record<string, string[]> = {
  Furniture: ["Chair", "Table", "Cabinet", "Desk", "Bed", "Storage", "Other furniture"],
  Lighting: ["Pendant", "Wall light", "Floor lamp", "Chandelier", "Industrial light", "Other lighting"],
  "Architectural Elements": ["Mantel", "Column", "Balustrade", "Moulding", "Corbel", "Other architectural"],
  "Doors & Windows": ["Door", "Window frame", "Sash window", "Shutter", "Ironmongery", "Other doors/windows"],
  Flooring: ["Parquet", "Floorboard", "Tile flooring", "Stone flooring", "Other flooring"],
  "Ironwork & Metalwork": ["Gate", "Railing", "Grille", "Hardware", "Industrial metal", "Other metalwork"],
  Stonework: ["Fireplace", "Lintel", "Paving", "Carved stone", "Other stonework"],
  "Timber & Beams": ["Beam", "Reclaimed timber", "Panel", "Joinery", "Other timber"],
  "Textiles & Soft Furnishings": ["Rug", "Curtain", "Upholstery", "Linen", "Other textile"],
  "Ceramics & Tiles": ["Wall tile", "Floor tile", "Sanitary", "Decorative ceramic", "Other ceramic"],
  Glassware: ["Bottle", "Vessel", "Scientific glass", "Decorative glass", "Other glassware"],
  Mirrors: ["Wall mirror", "Overmantel", "Framed mirror", "Other mirror"],
  "Artwork & Decorative": ["Painting", "Sculpture", "Decor object", "Frame", "Other decorative"],
  "Scientific & Medical": ["Instrument", "Cabinet", "Anatomical", "Hospital item", "Other scientific/medical"],
  "Industrial & Machinery": ["Machine part", "Tooling", "Factory fixture", "Control panel", "Other industrial"],
  "Street Furniture & Signage": ["Sign", "Lamp post", "Bench", "Street fixture", "Other street item"],
  "Transport & Vehicles": ["Vehicle body", "Wheel", "Rail component", "Marine component", "Other transport"],
  "Books & Paper Ephemera": ["Book", "Poster", "Map", "Document", "Other paper"],
  "Musical Instruments": ["String", "Brass", "Percussion", "Keyboard", "Other instrument"],
  Other: ["Other"],
};

export const PROP_MATERIALS = [
  "Oak", "Pine", "Mahogany", "Elm", "Walnut", "Mixed Hardwood", "Softwood", "Cast Iron", "Wrought Iron",
  "Brass", "Copper", "Bronze", "Steel", "Stone", "Marble", "Slate", "Terracotta", "Brick", "Ceramic",
  "Glass", "Leather", "Fabric/Textile", "Porcelain", "Paper/Card", "Mixed Materials", "Other",
] as const;

export const PROP_ERAS = [
  "Ancient & Classical (pre-500AD)",
  "Medieval (500-1485)",
  "Tudor & Elizabethan (1485-1603)",
  "Stuart & Baroque (1603-1714)",
  "Georgian (1714-1830)",
  "Regency (1811-1830)",
  "Victorian (1837-1901)",
  "Edwardian (1901-1910)",
  "1910s",
  "1920s / Art Deco",
  "1930s",
  "1940s / Wartime",
  "1950s",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "Contemporary",
  "Futuristic / Sci-Fi",
  "Undated / Timeless",
] as const;

export const PROP_STYLES = [
  "Arts & Crafts", "Art Nouveau", "Art Deco", "Bauhaus", "Mid-Century Modern", "Brutalist",
  "Industrial / Factory", "Gothic / Gothic Revival", "Classical / Neo-Classical", "Baroque / Rococo",
  "Chinoiserie", "Colonial", "Rustic / Farmhouse", "Coastal / Maritime", "Military / Utilitarian",
  "Ecclesiastical / Religious", "Medical / Institutional", "Domestic / Everyday", "Luxury / Grand", "Bohemian",
  "Steampunk", "Retro / Kitsch", "Scandinavian", "Mediterranean", "Eastern / Oriental",
] as const;

export const PROP_ORIGINS = [
  "British / UK", "English - London", "English - Northern", "English - Rural / Country", "Scottish", "Welsh",
  "Irish", "French", "Italian", "German / Central European", "Eastern European", "Scandinavian", "American",
  "Australian", "Asian / Far Eastern", "Middle Eastern", "African", "Colonial / Empire", "Unknown Origin",
] as const;

export const PROP_GENRES = [
  "Period Drama", "Crime / Noir", "Horror / Gothic", "Sci-Fi / Dystopian", "Fantasy / Fairy Tale",
  "War / Military", "Western", "Comedy", "Romance", "Thriller / Spy", "Historical Epic", "Documentary / Factual",
  "Music Video", "Commercial / Advertising", "Fashion / Editorial", "Theatre / Stage", "Opera / Ballet",
  "Children's / Family", "Reality / Lifestyle TV",
] as const;

export const PROP_INTERIOR_SETTINGS = [
  "Domestic Living Room", "Bedroom", "Kitchen / Scullery", "Bathroom", "Study / Library", "Hallway / Entrance",
  "Servants Quarters", "Nursery / Schoolroom", "Drawing Room / Parlour", "Dining Room", "Pub / Tavern / Bar",
  "Hotel / Inn", "Restaurant / Cafe", "Office / Workplace", "Factory / Workshop", "Hospital / Medical",
  "Police / Court", "Prison / Asylum", "Church / Chapel", "Shop / Market", "Theatre / Music Hall",
  "Gentleman's Club", "Farmhouse Kitchen",
] as const;

export const PROP_EXTERIOR_SETTINGS = [
  "Street / Urban", "Rural / Countryside", "Garden / Estate", "Dockside / Industrial", "Market / Fair",
  "Battlefield", "Graveyard",
] as const;

export const PROP_STUDIOS = [
  "Pinewood Studios",
  "Shepperton Studios",
  "Elstree Studios",
  "Longcross Studios",
  "Sky Studios Elstree",
  "Warner Bros Leavesden",
  "Other",
] as const;
