const axios = require('axios');
const { parseStringPromise, processors } = require('xml2js');

function normalizeCommand(command) {
  return String(command || '').trim().replace(/^\.+\s*/, '');
}

function buildEnvelope(command) {
  return `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope
  xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns1="urn:AC"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
  SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <ns1:executeCommand>
      <command xsi:type="xsd:string">${escapeXml(command)}</command>
    </ns1:executeCommand>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function executeCommand(command) {
  const normalizedCommand = normalizeCommand(command);
  if (!normalizedCommand) {
    return { success: false, message: 'Command is required' };
  }

  const host = process.env.SOAP_HOST || '127.0.0.1';
  const port = process.env.SOAP_PORT || '7878';
  const user = process.env.SOAP_USER || 'soap';
  const pass = process.env.SOAP_PASS || 'soap';

  const url = `http://${host}:${port}/`;
  const envelope = buildEnvelope(normalizedCommand);

  try {
    const resp = await axios.post(url, envelope, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      auth: { username: user, password: pass },
      timeout: 5000,
    });

    const parsed = await parseStringPromise(resp.data, {
      explicitArray: false,
      tagNameProcessors: [processors.stripPrefix],
    });
    const body = parsed.Envelope?.Body;
    if (!body) {
      return { success: false, message: 'Invalid SOAP response' };
    }

    if (body.Fault) {
      const fault = body.Fault;
      return { success: false, message: fault.faultstring || 'SOAP fault' };
    }

    const result = body.executeCommandResponse?.result || '';
    return { success: true, message: result };
  } catch (err) {
    return { success: false, message: formatConnectionError(err) };
  }
}

function formatConnectionError(err) {
  const message = err?.message || String(err);
  const code = err?.code || '';
  if (
    code === 'ECONNRESET' ||
    /ECONNRESET|socket hang up|Connection reset by peer/i.test(message)
  ) {
    return 'SOAP connection was reset. In this AzerothCore server SOAP is probably disabled. Enable SOAP.Enabled=1 and bind SOAP.IP=0.0.0.0, then restart ac-worldserver.';
  }
  if (code === 'ECONNREFUSED') {
    return 'SOAP is not accepting connections. Check that ac-worldserver is running and SOAP is enabled on the configured host/port.';
  }
  if (code === 'ETIMEDOUT' || /timeout/i.test(message)) {
    return 'SOAP request timed out. Check the SOAP host, port, and worldserver status.';
  }
  if (err?.response?.status === 401) {
    return 'SOAP rejected the credentials. Use a valid AzerothCore account with enough GM privileges.';
  }
  return message;
}

function parseServerInfo(text) {
  const normalized = String(text || '').replace(/\r/g, '\n');
  const uptimeMatch =
    normalized.match(/Server\s+uptime\s*:\s*([^\n]+)/i) ||
    normalized.match(/Uptime\s*:\s*([^\n]+)/i);
  const playersMatch =
    normalized.match(/Connected\s+players\s*:\s*(\d+)/i) ||
    normalized.match(/Players\s+online\s*:\s*(\d+)/i);
  const charsMatch =
    normalized.match(/Characters\s+in\s+world\s*:\s*(\d+)/i) ||
    normalized.match(/Characters\s+online\s*:\s*(\d+)/i);

  return {
    raw: text,
    uptime: uptimeMatch ? uptimeMatch[1].trim().replace(/\.$/, '') : 'unknown',
    players: playersMatch ? parseInt(playersMatch[1], 10) : 0,
    characters: charsMatch ? parseInt(charsMatch[1], 10) : 0,
  };
}

async function getServerInfo() {
  const result = await executeCommand('server info');
  if (!result.success) return null;

  return parseServerInfo(result.message);
}

function quoteArg(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function createAccount({ username, password, gmLevel = 0, realmId = -1 } = {}) {
  const accountName = String(username || '').trim();
  const accountPassword = String(password || '');
  const level = parseInt(gmLevel, 10);
  const realm = parseInt(realmId, 10);

  if (!/^[A-Za-z0-9_.@-]{3,32}$/.test(accountName)) {
    return { success: false, message: 'Username must be 3-32 characters: letters, numbers, _, ., @ or -.' };
  }
  if (accountPassword.length < 4 || accountPassword.length > 32) {
    return { success: false, message: 'Password must be 4-32 characters.' };
  }
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    return { success: false, message: 'GM level must be between 0 and 3.' };
  }
  if (!Number.isInteger(realm)) {
    return { success: false, message: 'Realm ID must be a number.' };
  }

  const createResult = await executeCommand(`account create ${quoteArg(accountName)} ${quoteArg(accountPassword)}`);
  if (!createResult.success) return createResult;

  if (level === 0) {
    return {
      success: true,
      message: createResult.message || `Account ${accountName} created.`,
    };
  }

  const gmResult = await executeCommand(`account set gmlevel ${quoteArg(accountName)} ${level} ${realm}`);
  if (!gmResult.success) {
    return {
      success: false,
      message: `Account was created, but GM level failed: ${gmResult.message}`,
    };
  }

  return {
    success: true,
    message: [createResult.message, gmResult.message].filter(Boolean).join('\n') || `Account ${accountName} created with GM level ${level}.`,
  };
}

function validateAccountName(accountName) {
  if (!/^[A-Za-z0-9_.@-]{3,32}$/.test(accountName)) {
    return 'Username must be 3-32 characters: letters, numbers, _, ., @ or -.';
  }
  return null;
}

function validatePassword(accountPassword) {
  if (accountPassword.length < 4 || accountPassword.length > 32) {
    return 'Password must be 4-32 characters.';
  }
  return null;
}

function validateGmLevel(gmLevel) {
  const level = parseInt(gmLevel, 10);
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    return 'GM level must be between 0 and 3.';
  }
  return null;
}

async function setAccountPassword({ username, password } = {}) {
  const accountName = String(username || '').trim();
  const accountPassword = String(password || '');
  const nameError = validateAccountName(accountName);
  const passwordError = validatePassword(accountPassword);
  if (nameError) return { success: false, message: nameError };
  if (passwordError) return { success: false, message: passwordError };

  return executeCommand(`account set password ${quoteArg(accountName)} ${quoteArg(accountPassword)} ${quoteArg(accountPassword)}`);
}

async function setAccountGmLevel({ username, gmLevel = 0, realmId = -1 } = {}) {
  const accountName = String(username || '').trim();
  const level = parseInt(gmLevel, 10);
  const realm = parseInt(realmId, 10);
  const nameError = validateAccountName(accountName);
  const gmError = validateGmLevel(level);
  if (nameError) return { success: false, message: nameError };
  if (gmError) return { success: false, message: gmError };
  if (!Number.isInteger(realm)) return { success: false, message: 'Realm ID must be a number.' };

  return executeCommand(`account set gmlevel ${quoteArg(accountName)} ${level} ${realm}`);
}

module.exports = {
  executeCommand,
  getServerInfo,
  createAccount,
  setAccountPassword,
  setAccountGmLevel,
  parseServerInfo,
  formatConnectionError,
};
