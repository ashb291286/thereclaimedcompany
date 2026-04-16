export const LEGAL_DOCS: Array<{ fileName: string; title: string }> = [
  { fileName: "01_Seller_Listing_Terms.pdf", title: "Seller Listing Terms" },
  { fileName: "02_Dealer_Yard_Registration_Terms.pdf", title: "Dealer & Yard Registration Terms" },
  { fileName: "03_Platform_Fees_and_Commissions.pdf", title: "Platform Fees and Commissions" },
  { fileName: "04_Auction_Terms_and_Conditions.pdf", title: "Auction Terms and Conditions" },
  { fileName: "05_Data_Protection_Privacy_Policy.pdf", title: "Data Protection & Privacy Policy" },
  { fileName: "06_Right_to_Remove_Policy.pdf", title: "Right to Remove Policy" },
  { fileName: "07_Dispute_and_Resolution_Policy.pdf", title: "Dispute and Resolution Policy" },
  { fileName: "08_Driven_Motors_Section_Terms.pdf", title: "Driven Motors Section Terms" },
];

export const LEGAL_DOC_NAMES = new Set(LEGAL_DOCS.map((d) => d.fileName));
