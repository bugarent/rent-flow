export type LegalPageContent = {
  body: string;
  fileUrl: string;
  updatedAt: string;
};

export type LegalPagesConfig = {
  terms: LegalPageContent;
  privacy: LegalPageContent;
};

export function emptyLegalPageContent(): LegalPageContent {
  return {
    body: "",
    fileUrl: "",
    updatedAt: new Date().toISOString(),
  };
}

export function emptyLegalPages(): LegalPagesConfig {
  return {
    terms: emptyLegalPageContent(),
    privacy: emptyLegalPageContent(),
  };
}

export function hasLegalPageContent(page: LegalPageContent): boolean {
  return Boolean(page.body.trim() || page.fileUrl.trim());
}
