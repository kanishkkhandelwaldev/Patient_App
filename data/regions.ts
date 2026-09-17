// The eight North-Eastern states we support: the "seven sisters" plus Sikkim.
// Each maps to its own regional language, offered alongside English.
export const REGIONS = [
  'Arunachal Pradesh',
  'Assam',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Tripura',
  'Sikkim',
];

export const LANGUAGES: Record<string, string[]> = {
  'Arunachal Pradesh': ['English'],
  Assam: ['Assamese', 'English'],
  Manipur: ['Manipuri', 'English'],
  Meghalaya: ['Khasi', 'English'],
  Mizoram: ['Mizo', 'English'],
  Nagaland: ['English'],
  Tripura: ['Kokborok', 'English'],
  Sikkim: ['Nepali', 'English'],
};
