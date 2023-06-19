type saveAttachmentValue = {
  name: string;
  url: string;
};
export const saveAttachments = (
  _attachments: GoogleAppsScript.Gmail.GmailAttachment[],
  _folder: GoogleAppsScript.Drive.Folder,
) => {
  const attachment = _attachments.reduce((prev, current) => {
    prev.name = current.getName();
    prev.url = _folder.createFile(current.copyBlob()).getUrl();
    return prev;
  }, {} as saveAttachmentValue);
  return attachment;
};
