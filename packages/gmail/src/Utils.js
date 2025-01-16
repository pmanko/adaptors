import unzipper from 'unzipper';
import { google } from 'googleapis';

let gmail;

export async function getMessagesResult(userId, query, lastPageToken) {
  try {
    const { data } = await gmail.users.messages.list({
      userId: userId,
      q: query,
      maxResults: 3,
      pageToken: lastPageToken,
    });

    return {
      messages: data.messages,
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    throw new Error('Error fetching messages: ' + error.message);
  }
}

export async function getMessageResult(userId, messageId) {
  const { data } = await gmail.users.messages.get({
    userId,
    id: messageId,
    format: 'full',
  });

  return {
    userId,
    messageId,
    parts: data?.payload?.parts,
    headers: data?.payload?.headers,
  };
}

export function getDesiredContent(hint) {
  const desiredContent = typeof hint === 'string' ? { type: hint } : hint;

  if (!desiredContent.type) {
    if (desiredContent.archive) {
      desiredContent.type = 'archive';
    } else if (desiredContent.file) {
      desiredContent.type = 'file';
    }
  }

  if (!desiredContent.type) {
    console.error(`Unable to determine desired content type: ${hint}`);
    throw new Error('No desired content type provided.');
  }

  if (!desiredContent.name) {
    desiredContent.name = desiredContent.type;
  }

  return desiredContent;
}

export async function getMessageContent(message, desiredContent) {
  switch (desiredContent.type) {
    case 'archive':
      return await getFileFromArchiveFromAttachment(message, desiredContent);

    case 'file':
      return await getFileFromAttachment(message, desiredContent);

    case 'body':
      return getBodyFromMessage(message, desiredContent);

    case 'subject':
    case 'from':
    case 'date':
      return getValueFromMessageHeader(message, desiredContent);

    default:
      return `Unsupported content type: ${desiredContent.type}`;
  }
}

export function createConnection(state) {
  const { access_token } = state.configuration;

  const auth = new google.auth.OAuth2();
  auth.credentials = { access_token };

  gmail = google.gmail({ version: 'v1', auth });

  return state;
}

export function removeConnection(state) {
  gmail = undefined;
  return state;
}

async function getFileFromArchiveFromAttachment(message, desiredContent) {
  const attachmentResult = await getAttachmentResult(
    message,
    desiredContent.archive
  );

  return await extractFileFromArchiveAttachment(
    attachmentResult,
    desiredContent
  );
}

async function getFileFromAttachment(message, desiredContent) {
  const attachmentResult = await getAttachmentResult(
    message,
    desiredContent.file
  );

  return await extractFileFromAttachment(attachmentResult, desiredContent);
}

async function getAttachmentResult(message, expression) {
  const part = message.parts?.find(p => {
    return isExpressionMatch(p.filename, expression);
  });

  if (!part) {
    console.info(`Attachment not found for: ${expression}`);
    return null;
  }

  const { data } = await gmail.users.messages.attachments.get({
    userId: message.userId,
    messageId: message.messageId,
    id: part.body.attachmentId,
  });

  return {
    data: data?.data,
    filename: part.filename,
    expression,
  };
}

async function extractFileFromArchiveAttachment(attachment, desiredContent) {
  if (!attachment) {
    return null;
  }

  if (!attachment.data) {
    console.error(
      `Data not found in the archive attachment for: ${attachment.expression}`
    );
    return null;
  }

  const compressedBuffer = Buffer.from(attachment.data, 'base64');
  const directory = await unzipper.Open.buffer(compressedBuffer);

  const file = directory?.files.find(f =>
    isExpressionMatch(f.path, desiredContent.file)
  );

  if (!file) {
    console.info(`File not found in the archive for: ${desiredContent.file}`);
    return null;
  }

  const fileBuffer = await file.buffer();
  const fileString = fileBuffer.toString('base64');
  const fileContent = Buffer.from(fileString, 'base64').toString('utf-8');

  return {
    archiveFilename: attachment.filename,
    filename: file.path,
    content: desiredContent.maxLength
      ? fileContent.substring(0, desiredContent.maxLength)
      : fileContent,
  };
}

async function extractFileFromAttachment(attachment, desiredContent) {
  if (!attachment) {
    return null;
  }

  if (!attachment.data) {
    console.error(
      `Data not found in the file attachment for: ${attachment.expression}`
    );
    return null;
  }

  const fileContent = Buffer.from(attachment.data, 'base64').toString('utf-8');

  return {
    filename: attachment.filename,
    content: desiredContent.maxLength
      ? fileContent.substring(0, desiredContent.maxLength)
      : fileContent,
  };
}

function getBodyFromMessage(message, desiredContent) {
  const bodyPart = message.parts?.find(
    part => part.mimeType === 'multipart/alternative'
  );

  const textBodyPart = bodyPart?.parts.find(
    part => part.mimeType === 'text/plain'
  );

  const textBody = textBodyPart?.body?.data;

  if (textBody) {
    const body = Buffer.from(textBody, 'base64').toString('utf-8');
    return desiredContent.maxLength
      ? body.substring(0, desiredContent.maxLength)
      : body;
  }

  return null;
}

function getValueFromMessageHeader(message, desiredContent) {
  const header = message.headers?.find(
    h => h.name.toLowerCase() === desiredContent.type
  );

  if (!header) {
    return null;
  }

  const value = header.value;

  if (desiredContent.type === 'date') {
    return new Date(value);
  }

  return desiredContent.maxLength
    ? value.substring(0, desiredContent.maxLength)
    : value;
}

function isExpressionMatch(text, expression) {
  try {
    return expression?.constructor?.name === 'RegExp'
      ? expression.test(text)
      : text.includes(expression);
  } catch (e) {
    return false;
  }
}
