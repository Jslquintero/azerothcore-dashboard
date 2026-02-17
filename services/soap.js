const axios = require('axios');
const { parseStringPromise } = require('xml2js');

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
  const host = process.env.SOAP_HOST || '127.0.0.1';
  const port = process.env.SOAP_PORT || '7878';
  const user = process.env.SOAP_USER || 'soap';
  const pass = process.env.SOAP_PASS || 'soap';

  const url = `http://${host}:${port}/`;
  const envelope = buildEnvelope(command);

  try {
    const resp = await axios.post(url, envelope, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      auth: { username: user, password: pass },
      timeout: 5000,
    });

    const parsed = await parseStringPromise(resp.data, { explicitArray: false });
    const body = parsed['SOAP-ENV:Envelope']['SOAP-ENV:Body'];

    if (body['SOAP-ENV:Fault']) {
      const fault = body['SOAP-ENV:Fault'];
      return { success: false, message: fault.faultstring || 'SOAP fault' };
    }

    const result = body['ns1:executeCommandResponse']?.result || '';
    return { success: true, message: result };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function getServerInfo() {
  const result = await executeCommand('server info');
  if (!result.success) return null;

  const text = result.message;

  // AzerothCore format: "Server uptime: 1 day(s) 2 hour(s) 30 minute(s) 45 second(s)\r\n"
  const uptimeMatch = text.match(/Server uptime:\s*(.+?)[\r\n]/i);
  // AzerothCore format: "Connected players: 0. Characters in world: 500.\r\n"
  const playersMatch = text.match(/Connected players:\s*(\d+)/i);
  const charsMatch = text.match(/Characters in world:\s*(\d+)/i);

  return {
    raw: text,
    uptime: uptimeMatch ? uptimeMatch[1].trim() : 'unknown',
    players: playersMatch ? parseInt(playersMatch[1], 10) : 0,
    characters: charsMatch ? parseInt(charsMatch[1], 10) : 0,
  };
}

module.exports = { executeCommand, getServerInfo };
