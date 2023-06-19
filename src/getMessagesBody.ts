export const getMessagesBody = (
  query: string,
  maxSearch: number,
): GoogleAppsScript.Gmail.GmailMessage[] => {
  const gmail = GmailApp;
  const threads = gmail.search(query, 0, maxSearch);
  const messages = gmail.getMessagesForThreads(threads).flat();
  return messages;
};
