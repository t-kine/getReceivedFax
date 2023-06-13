import dayjs from 'dayjs';
import ja from 'dayjs/locale/ja';
dayjs.locale(ja);

// eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
declare const global: any;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
global.mainFunction = () => {
  const now = dayjs();
  const propertiesService = PropertiesService.getScriptProperties();
  const savedTime = Number(propertiesService.getProperty('savedTime'));
  const startTime = savedTime ? savedTime : now.subtract(5, 'minute').unix();
  const endTime = now.unix();
  // propertiesService.setProperty('savedTime', `${endTime}`);
  const query = `from:(no-reply@mail01.lcloud.jp) subject:(【MOVFAX】FAX受信のお知らせ) has:attachment to:(cs@pharmarket.co.jp) after:${startTime} before:${endTime}`;
  // SpreadSheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  const sheetId = spreadsheet.getId();
  // Google Drive
  const myFolder = DriveApp.getFileById(sheetId).getParents().next();
  // Gmail
  const messages = getMessagesBody(query, 200);
  if (messages.length === 0) return;

  const beforeValue = Number(sheet.getRange(2, 2).getValue());
  const beforeNum = isNaN(beforeValue) ? 0 : beforeValue;

  const receivedData = messages
    .filter((value) => dayjs(value.getDate().toString()).isAfter(startTime))
    .filter((value) => /^cs@pharmarket.co.jp$/.test(value.getTo()))
    .filter((value) => /^no-reply@mail01.lcloud.jp$/.test(value.getFrom()))
    .filter((value) => value.getAttachments().length > 0)
    .filter((value) =>
      value
        .getBody()
        .match(/^【MOVFAX】サービスをご利用いただき誠にありがとうございます。/),
    )
    .map((value, index) => {
      const body = value.getBody();
      const extractedValues = body.match(
        /受付番号：(?<receiptNumber>.*)[\s\S]*?受信日時：(?<receiptDate>\d+\/\d+\/\d+) (?<receiptTime>\d+:\d+)[\s\S]*?FAX番号：(?<fromNumber>.*)[\s\S]*?送信元：(?<fromName>.*)/,
      )?.groups ?? {
        receiptNumber: '',
        receiptDate: '',
        receiptTime: '',
        fromNumber: '',
        fromName: '',
      };
      const savedAttachment = saveAttachments(value.getAttachments(), myFolder);
      return [
        beforeNum + index + 1,
        extractedValues.receiptNumber,
        extractedValues.receiptDate,
        extractedValues.receiptTime,
        extractedValues.fromNumber,
        extractedValues.fromName,
        `=HYPERLINK("${savedAttachment.url}", "${savedAttachment.name}")`
      ];
    });
  if (receivedData.length === 0) return;
  const reversed = [...receivedData].reverse();
  sheet.insertRows(2, reversed.length);
  sheet.getRange(2, 2, reversed.length, reversed[0].length).setValues(reversed);
};

const getMessagesBody = (
  query: string,
  maxSearch: number,
): GoogleAppsScript.Gmail.GmailMessage[] => {
  const gmail = GmailApp;
  const threads = gmail.search(query, 0, maxSearch);
  const messages = gmail.getMessagesForThreads(threads).flat();
  return messages;
};

type saveAttachmentValue = {
  name: string;
  url: string;
}
const saveAttachments = (_attachments: GoogleAppsScript.Gmail.GmailAttachment[], _folder: GoogleAppsScript.Drive.Folder) => {
  const attachment = _attachments.reduce((prev, current) => {
    prev.name = current.getName();
    prev.url = _folder.createFile(current.copyBlob()).getUrl();
    return prev;
  }, {} as saveAttachmentValue)
  return attachment;
};

export {};
