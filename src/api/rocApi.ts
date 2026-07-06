import { client } from './client';

// ROC (company MCA documents). The categorizer accepts the raw InstaFinancials
// InstaDocs/LLPDocs report (or a { report } wrapper / Document array).
export const rocApi = {
  categorizeDocuments: (report: unknown) =>
    client.post('/b2b/roc/documents/categorize', report),
};
