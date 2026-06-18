// Revitalize SMS Intake Worker Template
// Use this as the Cloudflare Worker endpoint for Twilio inbound SMS.
// Public intake number: 573-908-9748
// Keep MONDAY_API_TOKEN, MONDAY_INTAKE_BOARD_ID and any Twilio secrets in Worker environment variables.

const REVITALIZE_SMS_NUMBER = '+15739089748';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      return json({ ok: true, service: 'Revitalize SMS Intake', number: REVITALIZE_SMS_NUMBER });
    }
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const form = await request.formData();
    const from = String(form.get('From') || '').trim();
    const to = String(form.get('To') || '').trim();
    const body = String(form.get('Body') || '').trim();
    const sid = String(form.get('MessageSid') || '').trim();
    const mediaCount = Number(form.get('NumMedia') || 0);
    const media = [];
    for (let i = 0; i < mediaCount; i++) {
      media.push({ url: String(form.get('MediaUrl' + i) || ''), type: String(form.get('MediaContentType' + i) || '') });
    }

    // Only accept texts sent to the Revitalize intake number.
    if (normalizePhone(to) !== normalizePhone(REVITALIZE_SMS_NUMBER)) {
      return twiml('This number is not configured for Revitalize intake.');
    }

    const itemName = 'SMS Intake - ' + from;
    const messageLog = [
      'Incoming SMS Intake',
      'From: ' + from,
      'To: ' + to,
      'MessageSid: ' + sid,
      'Message: ' + body,
      media.length ? 'Media: ' + media.map(m => m.url).join(', ') : 'Media: none',
      'Received: ' + new Date().toISOString()
    ].join('\n');

    try {
      await createMondayItem(env, {
        itemName,
        phone: from,
        message: body,
        source: 'SMS - 573-908-9748',
        status: 'New Text Intake',
        log: messageLog
      });
      return twiml('Thanks for texting Revitalize House Painting. We received your request. Reply with the property address, photos, and the best time for a quote.');
    } catch (err) {
      return twiml('Thanks for texting Revitalize House Painting. We received your message, but our intake system needs review. We will follow up as soon as possible.');
    }
  }
};

function normalizePhone(v) {
  return String(v || '').replace(/\D/g, '').replace(/^1/, '');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function twiml(message) {
  const body = String(message || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Message>' + body + '</Message></Response>', {
    headers: { 'content-type': 'text/xml' }
  });
}

async function createMondayItem(env, data) {
  if (!env.MONDAY_API_TOKEN || !env.MONDAY_INTAKE_BOARD_ID) throw new Error('Missing Monday env config');

  // Replace these column IDs with the actual Monday Intake board column IDs.
  const columnValues = {
    phone: data.phone,
    status: { label: data.status },
    source: { label: data.source },
    long_text: data.log,
    message: data.message
  };

  const query = `mutation CreateSmsIntake($board: ID!, $name: String!, $values: JSON!) {
    create_item(board_id: $board, item_name: $name, column_values: $values) { id }
  }`;

  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'authorization': env.MONDAY_API_TOKEN,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ query, variables: { board: String(env.MONDAY_INTAKE_BOARD_ID), name: data.itemName, values: JSON.stringify(columnValues) } })
  });

  const out = await res.json();
  if (!res.ok || out.errors) throw new Error(JSON.stringify(out.errors || out));
  return out.data.create_item.id;
}
