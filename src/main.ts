import { getMessagesBody } from './getMessagesBody';
import { saveAttachments } from './saveAttachments';

import dayjs from 'dayjs';
import ja from 'dayjs/locale/ja';
dayjs.locale(ja);

// eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
declare const global: any;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
global.mainFunction = () => {
  const now = dayjs();
  const propertiesService = PropertiesService.getScriptProperties();
  const savedTime = Number(propertiesService.getProperty('savedTime')); // 保存された値の呼び出し
  const startTime = savedTime ? savedTime : now.subtract(5, 'minute').unix();
  const endTime = now.unix();
  propertiesService.setProperty('savedTime', `${endTime}`); // 実行された時間を保存

  // SpreadSheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();

  // 設定シートから値を取得する
  const manageValuesSheet = spreadsheet.getSheetByName('manage values'); // 設定シート
  if (!manageValuesSheet) return;
  const manageValuesLastRow = manageValuesSheet.getDataRange().getLastRow();
  const manageValuesLastColumn = manageValuesSheet
    .getDataRange()
    .getLastColumn();
  const manageValuesArray: string[][] = manageValuesSheet
    .getRange(2, 1, manageValuesLastRow, manageValuesLastColumn)
    .getValues();
  type manageValuesType = {
    [key in 'fromAddress' | 'toAddress' | 'subjectText']: string;
  };
  const manageValues = manageValuesArray.reduce(
    (prev, current): manageValuesType => {
      if (
        current[0] === 'fromAddress' ||
        current[0] === 'toAddress' ||
        current[0] === 'subjectText'
      )
        prev[current[0]] = current[1];
      return prev;
    },
    {} as manageValuesType,
  );

  const searchForFromAddress = manageValues.fromAddress;
  const searchForToAddress = manageValues.toAddress;
  const searchForSubjectText = manageValues.subjectText;
  const searchForFromAddressRegExp = new RegExp(`^${searchForFromAddress}$`);
  const searchForToAddressRegExp = new RegExp(`^${searchForToAddress}$`);

  const query = `from:(${searchForFromAddress}) subject:(${searchForSubjectText}) to:(${searchForToAddress}) has:attachment after:${startTime} before:${endTime}`;
  const messages = getMessagesBody(query, 200);
  if (messages.length === 0) return;

  const beforeValue = Number(sheet.getRange(2, 2).getValue()); // 最新の通し番号を取得
  const beforeNum = isNaN(beforeValue) ? 0 : beforeValue;

  // Google Drive
  const sheetId = spreadsheet.getId();
  const saveDir = DriveApp.getFileById(sheetId).getParents().next();

  const receivedData = messages
    .filter((value) => dayjs(value.getDate().toString()).isAfter(startTime))
    .filter((value) => searchForFromAddressRegExp.test(value.getFrom()))
    .filter((value) => searchForToAddressRegExp.test(value.getTo()))
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
      const savedAttachment = saveAttachments(value.getAttachments(), saveDir);
      return [
        beforeNum + index + 1,
        extractedValues.receiptNumber,
        extractedValues.receiptDate,
        extractedValues.receiptTime,
        extractedValues.fromNumber,
        extractedValues.fromName,
        `=HYPERLINK("${savedAttachment.url}", "${savedAttachment.name}")`,
      ];
    });
  if (receivedData.length === 0) return;
  const reversed = [...receivedData].reverse();
  sheet.insertRows(2, reversed.length);
  sheet.getRange(2, 2, reversed.length, reversed[0].length).setValues(reversed);
};

export {};
