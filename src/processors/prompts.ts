export const MARKDOWN_PROCESSING_PROMPT = `
Completely decompose and structure the knowledge points in this md document, 
and output them in md format supported by obisidian, in which the core knowledge 
points are labelled with Obisidian's backlink format [[]]. Do not output anything 
other than the original text and the requested "Obisidian's backlink format [[]]".

Rules:
1. Only markup, no content changes
2. Skip conventional names (products/companies/time/individual names)
3. Output full content in md
4. Remove duplicate concepts, No repetitive labeling of the singular and plural forms of a word, 
   Only the singular one is labeled if it contains two or more of the same word; 
   if there is only one word in a core word and the other core words contain that word, 
   the core word of that single word is not labeled.
5. Ignore references
`;

export const PROCESSING_RULES = {
  NO_CONTENT_CHANGES: true,
  SKIP_CONVENTIONAL_NAMES: true,
  OUTPUT_FULL_CONTENT: true,
  REMOVE_DUPLICATES: true,
  IGNORE_REFERENCES: true
};
